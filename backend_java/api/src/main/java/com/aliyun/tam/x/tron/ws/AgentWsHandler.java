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
import com.aliyun.tam.x.tron.core.agents.AgentInput;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.domain.models.PageResult;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.events.*;
import com.aliyun.tam.x.tron.core.domain.models.messages.*;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.MessageRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.core.tts.TtsEventSinkWrapper;
import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
import com.aliyun.tam.x.tron.ws.jsonrpc.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.Disposable;
import reactor.core.Disposables;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgentWsHandler implements WebSocketHandler {

    private static final Pattern PATH_PATTERN = Pattern.compile("/ws/agents/([^/]+)/sessions/([^/]+)");

    private final AgentRegistry agentRegistry;

    private final SessionRepository sessionRepository;

    private final MessageRepository messageRepository;

    private final AgentStateRepository agentStateRepository;

    private final JsonRpcHelper jsonRpcHelper;

    private final SequenceService sequenceService;

    private final EventRepository eventRepository;

    private final TtsService ttsService;

    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        URI uri = session.getHandshakeInfo().getUri();
        Matcher matcher = PATH_PATTERN.matcher(uri.getPath());
        if (!matcher.matches()) {
            return Mono.error(new IllegalArgumentException("Invalid path: " + uri.getPath()));
        }
        String agentId = matcher.group(1);
        String sessionId = matcher.group(2);

        HttpHeaders headers = session.getHandshakeInfo().getHeaders();
        Map<String, List<String>> queryParams = parseQueryParams(uri.getRawQuery());

        String userId = getRequiredHeader(headers, queryParams, "X-User-Id");
        String userName = getOptionalHeader(headers, queryParams, "X-User-Name", userId);

        AgentHandler agentHandler = agentRegistry.getAgent(agentId, null, userId, sessionId);
        if (agentHandler == null) {
            return Mono.error(new IllegalArgumentException("Agent not found"));
        }

        agentHandler.loadFrom(agentStateRepository.agentSessionsOf(agentId, userId), sessionId);
        com.aliyun.tam.x.tron.core.domain.models.Session domainSession = getOrCreateSession(agentId, sessionId, userId);

        ConnectionState state = new ConnectionState();
        state.userName = userName;
        state.agentHandler = agentHandler;
        state.domainSession = domainSession;

        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();
        Disposable.Composite disposables = Disposables.composite();

        log.info("Open session for agent {} and session {}", agentId, sessionId);

        disposables.add(Mono.fromRunnable(() -> sendSessionSnapshot(sink, state, agentId, sessionId, userId, disposables))
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe());

        Mono<Void> output = session.send(sink.asFlux().map(session::textMessage));

        Mono<Void> input = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .doOnNext(message -> handleIncoming(message, sink, state, disposables))
                .doFinally(signal -> {
                    log.info("Close session for agent {} and session {}", state.domainSession.getAgentId(), state.domainSession.getId());
                    disposables.dispose();
                    if (state.agentHandler != null && state.domainSession != null) {
                        state.agentHandler.saveTo(
                                agentStateRepository.agentSessionsOf(state.domainSession.getAgentId(), state.domainSession.getUserId()),
                                state.domainSession.getId());
                    }
                })
                .then();

        return Mono.zip(input, output).then();
    }

    private static class ConnectionState {
        volatile String userName;
        volatile AgentHandler agentHandler;
        volatile com.aliyun.tam.x.tron.core.domain.models.Session domainSession;
        volatile boolean chatting = false;
    }

    private static void emit(Sinks.Many<String> sink, String message) {
        synchronized (sink) {
            sink.tryEmitNext(message);
        }
    }

    private void sendSessionSnapshot(Sinks.Many<String> sink,
                                     ConnectionState state,
                                     String agentId,
                                     String sessionId,
                                     String userId,
                                     Disposable.Composite disposables) {
        PageResult<SessionMessage> messages = messageRepository.listMessages(agentId, sessionId, 1, 100);

        SessionDTO sessionDTO = SessionDTO.builder()
                .id(state.domainSession.getId())
                .userId(userId)
                .agentId(agentId)
                .name(state.domainSession.getName())
                .lastAppliedEventId(state.domainSession.getLastAppliedEventId())
                .gmtCreated(state.domainSession.getGmtCreated())
                .gmtModified(state.domainSession.getGmtModified())
                .messages(PageResultDTO.from(messages, SessionMessageDTO::from))
                .build();

        emit(sink, jsonRpcHelper.serialize(
                JsonRpcNotification.builder()
                        .method("session")
                        .params(sessionDTO)
                        .build()
        ));
        log.info("Sent session snapshot, sessionId={}, messageCount={}", state.domainSession.getId(), messages.getTotalRecords());

        if (!messages.getRecords().isEmpty()) {
            SessionMessage lastMsg = messages.getRecords().get(0);
            if (lastMsg.getType() == SessionMessageType.AGENT
                    && lastMsg.getStatus() == SessionMessageStatus.EXECUTING) {
                startOngoingMessageEventsPolling(sink, state, lastMsg, disposables);
            }
        }
    }

    private void startOngoingMessageEventsPolling(Sinks.Many<String> sink,
                                                  ConnectionState state,
                                                  SessionMessage lastMsg,
                                                  Disposable.Composite disposables) {
        Long initialFromEventId = state.domainSession.getLastAppliedEventId();
        if (initialFromEventId == null) {
            return;
        }
        AtomicLong fromEventId = new AtomicLong(initialFromEventId);
        AtomicBoolean stop = new AtomicBoolean(false);

        Disposable d = reactor.core.publisher.Flux.interval(Duration.ZERO, Duration.ofSeconds(1), Schedulers.boundedElastic())
                .takeUntil(tick -> stop.get())
                .subscribe(tick -> {
                    if (stop.get()) {
                        return;
                    }
                    List<SessionEvent> sessionEvents = eventRepository.pullEvents(
                            lastMsg.getAgentId(), lastMsg.getSessionId(), fromEventId.get(), 10);
                    if (sessionEvents.isEmpty()) {
                        return;
                    }
                    for (SessionEvent event : sessionEvents) {
                        try {
                            emit(sink, jsonRpcHelper.serialize(
                                    JsonRpcNotification.builder()
                                            .method("event")
                                            .params(event)
                                            .build()
                            ));

                            if (event instanceof AgentMessageStatusChangedEvent e
                                    && Objects.equals(e.getMessageId(), lastMsg.getId())) {
                                log.info("Sent ongoing message events, sessionId={}, messageId={}", lastMsg.getSessionId(), lastMsg.getId());
                                stop.set(true);
                                return;
                            }
                            fromEventId.set(event.getId());
                        } catch (Exception ex) {
                            log.warn("Failed to send message: {}", event.getId(), ex);
                            stop.set(true);
                            return;
                        }
                    }
                });
        disposables.add(d);
    }

    private void handleIncoming(String message,
                                Sinks.Many<String> sink,
                                ConnectionState state,
                                Disposable.Composite disposables) {
        log.debug("Received message: {}", message);
        try {
            JsonRpcRequest request = jsonRpcHelper.parseRequest(message);
            try {
                Object result;
                switch (request.getMethod()) {
                    case "chat": {
                        Object chatParams = request.getParams();
                        if (chatParams instanceof List<?> list && !list.isEmpty()) {
                            chatParams = list.get(0);
                        }
                        ChatRequest chatRequest = objectMapper.convertValue(chatParams, ChatRequest.class);
                        result = handleChat(chatRequest, sink, state, request.getId(), disposables);
                        break;
                    }
                    case "cancel": {
                        String cancelMessage = extractCancelMessage(request.getParams());
                        handleCancel(cancelMessage, state);
                        result = null;
                        break;
                    }
                    default:
                        emit(sink, jsonRpcHelper.serialize(
                                JsonRpcResponse.error(request.getId(),
                                        JsonRpcError.builder().code(JsonRpcError.METHOD_NOT_FOUND).message("Method not found").build()
                                )
                        ));
                        return;
                }
                emit(sink, jsonRpcHelper.serialize(JsonRpcResponse.success(request.getId(), result)));
            } catch (JsonRpcException jre) {
                emit(sink, jsonRpcHelper.serialize(jre.toResponse()));
            } catch (Exception e) {
                log.warn("Error processing request: {}", request.getId(), e);
                emit(sink, jsonRpcHelper.serialize(
                        JsonRpcResponse.error(request.getId(),
                                JsonRpcError.builder().code(JsonRpcError.INTERNAL_ERROR).message("Internal error").build()
                        )
                ));
            }
        } catch (JsonRpcException e) {
            emit(sink, jsonRpcHelper.serialize(e.toResponse()));
        }
    }

    @SuppressWarnings("unchecked")
    private String extractCancelMessage(Object params) {
        if (params == null) {
            return null;
        }
        if (params instanceof Map) {
            Object v = ((Map<String, Object>) params).get("message");
            return v == null ? null : v.toString();
        }
        if (params instanceof List) {
            List<?> list = (List<?>) params;
            if (!list.isEmpty()) {
                Object v = list.get(0);
                return v == null ? null : v.toString();
            }
        }
        return null;
    }

    private Long handleChat(
            ChatRequest request,
            Sinks.Many<String> sink,
            ConnectionState state,
            Object requestId,
            Disposable.Composite disposables
    ) {
        if (state.chatting) {
            throw new JsonRpcException(requestId, JsonRpcError.INVALID_REQUEST, "Chatting already in progress");
        }

        List<Content<?>> contents = request.getInput()
                .stream()
                .map(c -> c.toInputContent(state.agentHandler))
                .collect(Collectors.toList());

        UserSessionMessage userMessage = UserSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(state.domainSession.getAgentId())
                .sessionId(state.domainSession.getId())
                .userId(state.domainSession.getUserId())
                .status(SessionMessageStatus.SUCCEED)
                .name(state.userName)
                .contents(contents)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();

        AgentSessionMessage agentMessage = AgentSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(state.domainSession.getAgentId())
                .sessionId(state.domainSession.getId())
                .userId(state.domainSession.getUserId())
                .status(SessionMessageStatus.EXECUTING)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .gmtFinished(null)
                .build();

        EventSink eventSink = buildEventSink(agentMessage, request, sink, state);

        eventSink.newUserMessage(userMessage);
        eventSink.newAgentMessage(agentMessage);

        Disposable d = Mono.fromRunnable(() -> {
                    try {
                        state.agentHandler.handleInput(AgentInput.builder()
                                .source(AgentInput.Source.USER)
                                .userMessage(userMessage)
                                .eventSink(eventSink)
                                .build());
                    } catch (Exception e) {
                        log.warn("Error handling input for session {}", state.domainSession.getId(), e);
                    } finally {
                        state.agentHandler.saveTo(
                                agentStateRepository.agentSessionsOf(state.domainSession.getAgentId(), state.domainSession.getUserId()),
                                state.domainSession.getId());
                    }
                })
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe();
        disposables.add(d);

        return agentMessage.getId();
    }

    private EventSink buildEventSink(AgentSessionMessage agentMessage,
                                     ChatRequest chatRequest,
                                     Sinks.Many<String> sink,
                                     ConnectionState state) {
        EventSink rawEventSink = eventRepository.createEventSink(
                state.domainSession.getAgentId(),
                state.domainSession.getUserId(),
                state.domainSession.getId(),
                agentMessage.getId()
        );

        EventSink eventSink = new EventSink() {
            @Override
            public void newEvent(SessionEvent event) {
                rawEventSink.newEvent(event);
                emit(sink, jsonRpcHelper.serialize(
                        JsonRpcNotification.builder()
                                .method("event")
                                .params(event)
                                .build()
                ));
            }

            @Override
            public void saveMessage(SessionMessage sessionMessage) {
                rawEventSink.saveMessage(sessionMessage);
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
                }

                @Override
                public void onError(Throwable t) {
                    send(TtsResponse.builder().success(false).error(t.getMessage()).build());
                }

                private void send(TtsResponse response) {
                    emit(sink, jsonRpcHelper.serialize(
                            JsonRpcNotification.builder()
                                    .method("event")
                                    .params(CustomEvent.builder()
                                            .type(SessionEventType.TTS_RESPONSE)
                                            .needPersistent(false)
                                            .data(response)
                                            .build())
                                    .build()
                    ));
                }
            });
        }
        eventSink.setAgentId(rawEventSink.getAgentId());
        eventSink.setSessionId(rawEventSink.getSessionId());
        eventSink.setUserId(rawEventSink.getUserId());
        eventSink.setMessageId(rawEventSink.getMessageId());

        return eventSink;
    }

    private void handleCancel(String message, ConnectionState state) {
        state.agentHandler.cancel(message);
        log.info("Cancelled chat for session {} with message {}", state.domainSession.getId(), message);
    }

    private String getRequiredHeader(HttpHeaders headers, Map<String, List<String>> params, String name) {
        String value = lookup(headers, params, name);
        if (value == null) {
            throw new RuntimeException("Missing required header/param: " + name);
        }
        return value;
    }

    private String getOptionalHeader(HttpHeaders headers, Map<String, List<String>> params, String name, String defaultValue) {
        String value = lookup(headers, params, name);
        return value == null ? defaultValue : value;
    }

    private String lookup(HttpHeaders headers, Map<String, List<String>> params, String name) {
        List<String> headerValues = headers.get(name);
        if (headerValues != null && !headerValues.isEmpty()) {
            if (headerValues.size() > 1) {
                throw new RuntimeException("Multiple values for header: " + name);
            }
            return headerValues.get(0);
        }
        if (params != null) {
            List<String> paramValues = params.get(name);
            if (paramValues != null && !paramValues.isEmpty()) {
                if (paramValues.size() > 1) {
                    throw new RuntimeException("Multiple values for param: " + name);
                }
                return paramValues.get(0);
            }
        }
        return null;
    }

    private Map<String, List<String>> parseQueryParams(String rawQuery) {
        Map<String, List<String>> result = new HashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) {
            return result;
        }
        for (String pair : rawQuery.split("&")) {
            int idx = pair.indexOf('=');
            String key = idx >= 0 ? pair.substring(0, idx) : pair;
            String value = idx >= 0 ? pair.substring(idx + 1) : "";
            try {
                key = java.net.URLDecoder.decode(key, java.nio.charset.StandardCharsets.UTF_8);
                value = java.net.URLDecoder.decode(value, java.nio.charset.StandardCharsets.UTF_8);
            } catch (Exception ignore) {
                // ignore
            }
            result.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
        }
        return result;
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
}
