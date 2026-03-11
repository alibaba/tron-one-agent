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


package com.aliyun.tam.x.tron.api;

import com.aliyun.tam.x.tron.core.agents.AgentBuilder;
import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.domain.models.Session;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import io.a2a.server.agentexecution.AgentExecutor;
import io.a2a.server.agentexecution.RequestContext;
import io.a2a.server.events.EventQueue;
import io.a2a.server.events.InMemoryQueueManager;
import io.a2a.server.requesthandlers.DefaultRequestHandler;
import io.a2a.server.requesthandlers.RequestHandler;
import io.a2a.server.tasks.BasePushNotificationSender;
import io.a2a.server.tasks.InMemoryPushNotificationConfigStore;
import io.a2a.server.tasks.InMemoryTaskStore;
import io.a2a.spec.*;
import io.a2a.transport.jsonrpc.handler.JSONRPCHandler;
import io.agentscope.core.a2a.server.transport.jsonrpc.JsonRpcTransportWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/a2a/{agent_id}")
@RequiredArgsConstructor
public class A2AController {
    private final AgentRegistry agentRegistry;

    private final SessionRepository sessionRepository;

    private final SequenceService sequenceService;

    private final EventRepository eventRepository;

    private final AgentStateRepository agentStateRepository;

    private final ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(
            10,
            10,
            Long.MAX_VALUE,
            TimeUnit.SECONDS,
            new LinkedBlockingDeque<>(1000),
            new ThreadFactoryBuilder()
                    .setNameFormat("a2a-%d")
                    .setDaemon(true)
                    .build(),
            new ThreadPoolExecutor.CallerRunsPolicy()
    );

    @GetMapping(value = "/.well-known/agent-card.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AgentCard> getAgentCard(
            @PathVariable("agent_id") String agentId
    ) {
        AgentCard agentCard = agentRegistry.getAgentBuilders()
                .stream()
                .filter(b -> Objects.equals(agentId, b.getAgentId()))
                .findFirst()
                .map(AgentBuilder::publishAsA2AAgent)
                .orElse(null);
        if (agentCard == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(agentCard);
    }

    @PostMapping(value = "/", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> jsonRpc(
            @PathVariable("agent_id") String agentId,
            @RequestHeader HttpHeaders headers,
            InputStream requestBody
    ) throws IOException {
        AgentBuilder agentBuilder = agentRegistry.getAgentBuilders()
                .stream()
                .filter(b -> Objects.equals(agentId, b.getAgentId()))
                .findFirst()
                .orElse(null);
        if (agentBuilder == null) {
            return ResponseEntity.notFound().build();
        }
        AgentCard agentCard = agentBuilder.publishAsA2AAgent();
        if (agentCard == null) {
            return ResponseEntity.notFound().build();
        }
        JsonRpcTransportWrapper wrapper = getJsonRpcTransportWrapper(agentBuilder, agentCard);
        String body = new String(requestBody.readAllBytes());
        return ResponseEntity.ok(wrapper.handleRequest(body, ImmutableMap.of(), ImmutableMap.of()));
    }

    private class TronAgentExecutor implements AgentExecutor {
        private final AgentBuilder agentBuilder;

        private TronAgentExecutor(AgentBuilder agentBuilder) {
            this.agentBuilder = agentBuilder;
        }

        @Override
        public void execute(RequestContext context, EventQueue eventQueue) throws JSONRPCError {
            AgentHandler agentHandler = agentBuilder.build(agentBuilder.getAgentId(), null);
            if (agentHandler == null) {
                throw new InvalidRequestError("agent not found");
            }

            String query = context.getUserInput("");
            String sessionId = String.format("a2a_%s", context.getContextId());
            String userId = String.format("a2a_%s", context.getContextId());

            {
                Session session = sessionRepository.getSession(agentBuilder.getAgentId(), sessionId);
                if (session == null) {
                    sessionRepository.newSession(Session.builder()
                            .id(sessionId)
                            .userId(userId)
                            .agentId(agentBuilder.getAgentId())
                            .gmtCreated(LocalDateTime.now())
                            .gmtModified(LocalDateTime.now())
                            .build());
                }
            }

            UserSessionMessage userMsg = UserSessionMessage.builder()
                    .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                    .sessionId(sessionId)
                    .userId(userId)
                    .agentId(agentBuilder.getAgentId())
                    .status(SessionMessageStatus.SUCCEED)
                    .name(userId)
                    .contents(Lists.newArrayList(
                            TextContent.builder().type(ContentType.TEXT).text(query).build()
                    ))
                    .gmtCreate(LocalDateTime.now())
                    .gmtModified(LocalDateTime.now())
                    .build();

            AgentSessionMessage agentMsg = AgentSessionMessage.builder()
                    .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                    .sessionId(sessionId)
                    .userId(userId)
                    .agentId(agentBuilder.getAgentId())
                    .status(SessionMessageStatus.EXECUTING)
                    .gmtCreate(LocalDateTime.now())
                    .gmtModified(LocalDateTime.now())
                    .build();

            EventSink eventSink = eventRepository.createEventSink(
                    agentBuilder.getAgentId(),
                    userId,
                    sessionId,
                    agentMsg.getId()
            );
            eventSink.newUserMessage(userMsg);
            eventSink.newAgentMessage(agentMsg);

            io.agentscope.core.session.Session session = agentStateRepository.agentSessionsOf(agentBuilder.getAgentId(), userId);
            try {
                agentHandler.loadFrom(session, sessionId);
                String result = agentHandler.handleInput(userMsg, eventSink);
                eventQueue.enqueueEvent(
                        new Message.Builder()
                                .role(Message.Role.AGENT)
                                .parts(new TextPart(result))
                                .messageId(UUID.randomUUID().toString())
                                .taskId(context.getTaskId())
                                .contextId(context.getContextId())
                                .build()
                );
            } catch (Exception e) {
                log.error("encounter unknown exception during handling a2a message", e);
            } finally {
                agentHandler.saveTo(session, sessionId);
            }
        }

        @Override
        public void cancel(RequestContext context, EventQueue eventQueue) throws JSONRPCError {
            throw new UnsupportedOperationError();
        }
    }

    private JsonRpcTransportWrapper getJsonRpcTransportWrapper(AgentBuilder agentBuilder, AgentCard agentCard) {
        InMemoryTaskStore taskStore = new InMemoryTaskStore();
        RequestHandler requestHandler = new DefaultRequestHandler(
                new TronAgentExecutor(agentBuilder),
                taskStore,
                new InMemoryQueueManager(taskStore),
                new InMemoryPushNotificationConfigStore(),
                new BasePushNotificationSender(
                        new InMemoryPushNotificationConfigStore()
                ),
                threadPoolExecutor
        );
        JSONRPCHandler handler = new JSONRPCHandler(agentCard, requestHandler, threadPoolExecutor);
        JsonRpcTransportWrapper wrapper = new JsonRpcTransportWrapper(handler);
        return wrapper;
    }
}
