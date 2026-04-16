/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.aliyun.tam.x.tron.ws;

import com.aliyun.tam.x.tron.api.dto.PageResultDTO;
import com.aliyun.tam.x.tron.api.dto.SessionDTO;
import com.aliyun.tam.x.tron.api.dto.SessionMessageDTO;
import com.aliyun.tam.x.tron.api.request.ChatRequest;
import com.aliyun.tam.x.tron.api.response.TtsResponse;
import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.events.CustomEvent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.events.SessionEvent;
import com.aliyun.tam.x.tron.core.domain.models.events.SessionEventType;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.MessageRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.core.tts.TtsEventSinkWrapper;
import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
import com.aliyun.tam.x.tron.ws.jsonrpc.*;
import com.google.common.collect.ImmutableMap;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Component
@Scope("prototype")
@ServerEndpoint(value = "/ws/agents/{agent_id}/sessions/{session_id}", configurator = AgentEndpointConfigurator.class)
@RequiredArgsConstructor
public class AgentWsEndpoint {

    private final AgentRegistry agentRegistry;

    private final SessionRepository sessionRepository;

    private final MessageRepository messageRepository;

    private final AgentStateRepository agentStateRepository;

    private final JsonRpcHelper jsonRpcHelper;

    private final SequenceService sequenceService;

    private final EventRepository eventRepository;

    private final TtsService ttsService;

    private final Map<String, Method> methods = new HashMap<>();

    {
        try {
            register("chat", "handleChat");
            register("cancel", "handleCancel");
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

    private final ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(
            10,
            10,
            Long.MAX_VALUE,
            TimeUnit.SECONDS,
            new LinkedBlockingDeque<>(1000),
            new ThreadFactoryBuilder()
                    .setNameFormat("ws-chat-%d")
                    .setDaemon(true)
                    .build(),
            new ThreadPoolExecutor.CallerRunsPolicy()
    );

    private volatile String userName;

    private volatile AgentHandler agentHandler;

    private volatile com.aliyun.tam.x.tron.core.domain.models.Session session;

    private volatile boolean chatting = false;

    private final Object wsSendLock = new Object();

    @OnOpen
    public void onOpen(Session wsSession,
                       EndpointConfig config,
                       @PathParam("agent_id") String agentId,
                       @PathParam("session_id") String sessionId
    ) {
        String userId = getRequiredHeader(config, "X-User-Id");
        userName = getOptionalHeader(config, "X-User-Name", userId);

        AgentHandler agentHandler = agentRegistry.getAgent(agentId, null, userId, sessionId);
        if (agentHandler == null) {
            throw new IllegalArgumentException("Agent not found");
        }

        agentHandler.loadFrom(agentStateRepository.agentSessionsOf(agentId, userId), sessionId);
        this.agentHandler = agentHandler;
        this.session = getOrCreateSession(agentId, sessionId, userId);

        threadPoolExecutor.submit(() -> {
            if (!wsSession.isOpen()) {
                return;
            }

            PageResultDTO<SessionMessageDTO> messages = PageResultDTO.from(
                    messageRepository.listMessages(agentId, sessionId, 1, 100),
                    SessionMessageDTO::from
            );

            SessionDTO sessionDTO = SessionDTO.builder()
                    .id(session.getId())
                    .userId(userId)
                    .agentId(agentId)
                    .name(session.getName())
                    .lastAppliedEventId(session.getLastAppliedEventId())
                    .gmtCreated(session.getGmtCreated())
                    .gmtModified(session.getGmtModified())
                    .messages(messages)
                    .build();

            try {
                wsSession.getBasicRemote().sendText(jsonRpcHelper.serialize(
                        JsonRpcNotification.builder()
                                .method("session")
                                .params(sessionDTO)
                                .build()
                ));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
        log.info("Open session for agent {} and session {}", agentId, sessionId);
    }

    @OnMessage
    public void onMessage(String message, Session wsSession) throws IOException {
        log.debug("Received message: {}", message);
        try {
            JsonRpcRequest request = jsonRpcHelper.parseRequest(message);
            Method method = methods.get(request.getMethod());
            if (method == null) {
                wsSession.getBasicRemote().sendText(
                        jsonRpcHelper.serialize(
                                JsonRpcResponse.error(request.getId(),
                                        JsonRpcError.builder().code(JsonRpcError.METHOD_NOT_FOUND).message("Method not found").build()
                                )
                        )
                );
                return;
            }
            try {
                Object result = jsonRpcHelper.callMethod(method, this, request.getParams(), ImmutableMap.of(
                        "wsSession", wsSession,
                        "requestId", request.getId()
                ));
                wsSession.getBasicRemote().sendText(jsonRpcHelper.serialize(
                        JsonRpcResponse.success(request.getId(), result)
                ));
            } catch (InvocationTargetException | IllegalAccessException e) {
                if (e instanceof InvocationTargetException ie && ie.getTargetException() instanceof JsonRpcException jre) {
                    wsSession.getBasicRemote().sendText(jsonRpcHelper.serialize(jre.toResponse()));
                    return;
                }
                log.warn("Error processing request: {}", request.getId(), e);
                wsSession.getBasicRemote().sendText(jsonRpcHelper.serialize(
                        JsonRpcResponse.error(request.getId(),
                                JsonRpcError.builder().code(JsonRpcError.INTERNAL_ERROR).message("Internal error").build()
                        )
                ));
            }
        } catch (JsonRpcException e) {
            wsSession.getBasicRemote().sendText(jsonRpcHelper.serialize(e.toResponse()));
        }
    }

    @OnClose
    public void onClose(Session wsSession) {
        if (session != null && agentHandler != null) {
            log.info("Close session for agent {} and session {}", session.getAgentId(), session.getId());
            agentHandler.saveTo(agentStateRepository.agentSessionsOf(session.getAgentId(), session.getUserId()), session.getId());
        }
    }

    @OnError
    public void onError(Session session, Throwable throwable) throws IOException {
        log.error("WebSocket error, sessionId={}", session.getId(), throwable);
        session.close();
    }

    private Long handleChat(
            ChatRequest request,
            Session wsSession,
            Object requestId
    ) {
        if (chatting) {
            throw new JsonRpcException(requestId, JsonRpcError.INVALID_REQUEST, "Chatting already in progress");
        }

        List<Content<?>> contents = request.getInput()
                .stream()
                .map(c -> c.toInputContent(agentHandler))
                .collect(Collectors.toList());

        UserSessionMessage userMessage = UserSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(session.getAgentId())
                .sessionId(session.getId())
                .userId(session.getUserId())
                .status(SessionMessageStatus.SUCCEED)
                .name(userName)
                .contents(contents)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();

        AgentSessionMessage agentMessage = AgentSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(session.getAgentId())
                .sessionId(session.getId())
                .userId(session.getUserId())
                .status(SessionMessageStatus.EXECUTING)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .gmtFinished(null)
                .build();

        EventSink eventSink = buildEventSink(agentMessage, request, wsSession);

        threadPoolExecutor.submit(() -> {
            eventSink.newUserMessage(userMessage);
            eventSink.newAgentMessage(agentMessage);
            try {
                agentHandler.handleInput(userMessage, eventSink);
            } catch (Exception e) {
                log.warn("Error handling input for session {}", session.getId(), e);
            } finally {
                saveAgent();
            }
        });
        return agentMessage.getId();
    }

    private EventSink buildEventSink(AgentSessionMessage agentMessage, ChatRequest chatRequest, Session wsSession) {
        EventSink rawEventSink = eventRepository.createEventSink(
                session.getAgentId(),
                session.getUserId(),
                session.getId(),
                agentMessage.getId()
        );

        EventSink eventSink = new EventSink() {
            @Override
            public void newEvent(SessionEvent event) {
                rawEventSink.newEvent(event);
                if (!wsSession.isOpen()) {
                    return;
                }
                synchronized (wsSendLock) {
                    try {
                        wsSession.getBasicRemote().sendText(
                                jsonRpcHelper.serialize(
                                        JsonRpcNotification.builder()
                                                .method("event")
                                                .params(event)
                                                .build()
                                )
                        );
                    } catch (IOException e) {
                        log.warn("Failed to send notification to client", e);
                        try {
                            wsSession.close();
                        } catch (IOException ex) {
                            // ignore
                        }
                    }
                }
            }

            @Override
            public Long nextSequence(SequenceService.SequenceName sequenceName) {
                return rawEventSink.nextSequence(sequenceName);
            }

            @Override
            public void onComplete() {
                rawEventSink.onComplete();
            }
        };

        if (chatRequest.isEnableTts()) {
            final EventSink original = eventSink;
            eventSink = new TtsEventSinkWrapper(ttsService, original, new TtsService.TtsCallback() {
                @Override
                public void onData(String dataBase64) {
                    send(TtsResponse.builder().dataBase64(dataBase64).finished(false).build());
                }

                @Override
                public void onFinished() {
                    send(TtsResponse.builder().finished(true).build());
                    original.onComplete();
                }

                @Override
                public void onError(Throwable t) {
                    send(TtsResponse.builder().success(false).error(t.getMessage()).build());
                }


                private void send(TtsResponse response) {
                    if (!wsSession.isOpen()) {
                        return;
                    }

                    synchronized (wsSendLock) {
                        try {
                            wsSession.getBasicRemote().sendText(
                                    jsonRpcHelper.serialize(
                                            JsonRpcNotification.builder()
                                                    .method("event")
                                                    .params(CustomEvent.builder()
                                                            .type(SessionEventType.TTS_RESPONSE)
                                                            .needPersistent(false)
                                                            .data(response)
                                                            .build())
                                                    .build()
                                    )
                            );
                        } catch (IOException e) {
                            log.warn("Failed to send notification to client", e);
                            try {
                                wsSession.close();
                            } catch (IOException ex) {
                                // ignore
                            }
                        }
                    }
                }
            });
        }
        eventSink.setAgentId(rawEventSink.getAgentId());
        eventSink.setSessionId(rawEventSink.getSessionId());
        eventSink.setUserId(rawEventSink.getUserId());
        eventSink.setMessageId(rawEventSink.getMessageId());

        return eventSink;
    }

    private void handleCancel(String message) {
        agentHandler.cancel(message);
        log.info("Cancelled chat for session {} with message {}", session.getId(), message);
    }

    private void register(String rpcMethod, String methodName) throws NoSuchMethodException {
        Method method = Arrays.stream(getClass().getDeclaredMethods())
                .filter(m -> m.getName().equals(methodName))
                .findFirst()
                .orElseThrow(() -> new NoSuchMethodException("Method not found: " + methodName));
        method.setAccessible(true);
        methods.put(rpcMethod, method);
    }

    private String getRequiredHeader(EndpointConfig config, String name) {
        Map<String, List<String>> headers = (Map<String, List<String>>) config.getUserProperties().get("headers");
        if (headers != null) {
            List<String> headerValues = headers.get(name);
            if (headerValues != null && !headerValues.isEmpty()) {
                if (headerValues.size() > 1) {
                    throw new RuntimeException("Multiple values for header: " + name);
                }
                return headerValues.get(0);
            }
        }
        Map<String, List<String>> params = (Map<String, List<String>>) config.getUserProperties().get("params");
        if (params != null) {
            List<String> paramValues = params.get(name);
            if (paramValues != null && !paramValues.isEmpty()) {
                if (paramValues.size() > 1) {
                    throw new RuntimeException("Multiple values for param: " + name);
                }
                return paramValues.get(0);
            }
        }
        throw new RuntimeException("Missing required header/param: " + name);
    }


    private String getOptionalHeader(EndpointConfig config, String name, String defaultValue) {
        Map<String, List<String>> headers = (Map<String, List<String>>) config.getUserProperties().get("headers");
        if (headers != null) {
            List<String> headerValues = headers.get(name);
            if (headerValues != null && !headerValues.isEmpty()) {
                if (headerValues.size() > 1) {
                    throw new RuntimeException("Multiple values for header: " + name);
                }
                return headerValues.get(0);
            }
        }
        Map<String, List<String>> params = (Map<String, List<String>>) config.getUserProperties().get("params");
        if (params != null) {
            List<String> paramValues = params.get(name);
            if (paramValues != null && !paramValues.isEmpty()) {
                if (paramValues.size() > 1) {
                    throw new RuntimeException("Multiple values for param: " + name);
                }
                return paramValues.get(0);
            }
        }
        return defaultValue;
    }

    private com.aliyun.tam.x.tron.core.domain.models.Session getOrCreateSession(String agentId, String sessionId, String userId) {
        com.aliyun.tam.x.tron.core.domain.models.Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            session = com.aliyun.tam.x.tron.core.domain.models.Session.builder()
                    .id(sessionId)
                    .userId(userId)
                    .agentId(agentId)
                    .name("")
                    .lastAppliedEventId(0L)
                    .gmtCreated(LocalDateTime.now())
                    .gmtModified(LocalDateTime.now())
                    .build();
            sessionRepository.newSession(session);
        }
        return session;
    }

    private void saveAgent() {
        agentHandler.saveTo(agentStateRepository.agentSessionsOf(session.getAgentId(), session.getUserId()), session.getId());
    }

}
