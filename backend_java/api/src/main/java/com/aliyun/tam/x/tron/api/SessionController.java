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

import com.aliyun.tam.x.tron.api.dto.PageResultDTO;
import com.aliyun.tam.x.tron.api.dto.SessionDTO;
import com.aliyun.tam.x.tron.api.dto.SessionMessageDTO;
import com.aliyun.tam.x.tron.api.request.ChatRequest;
import com.aliyun.tam.x.tron.api.request.CreateSessionRequest;
import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.agents.AgentInput;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.aliyun.tam.x.tron.core.domain.models.Session;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.events.CustomEvent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.events.SessionEvent;
import com.aliyun.tam.x.tron.core.domain.models.events.SessionEventType;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.MessageRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aliyun.tam.x.tron.core.tts.TtsEventSinkWrapper;
import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.api.response.TtsResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/agents/{agent_id}")
@RequiredArgsConstructor
@Validated
public class SessionController {
    private final ApplicationContext applicationContext;

    private final AgentRegistry agentRegistry;

    private final SessionRepository sessionRepository;

    private final MessageRepository messageRepository;

    private final EventRepository eventRepository;

    private final SequenceService sequenceService;

    private final AgentStateRepository agentStateRepository;

    private final ObjectMapper objectMapper;

    private final TtsService ttsService;

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
        log.error("Internal server error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Internal server error");
    }

    @PostMapping("/sessions")
    @Transactional
    public ResponseEntity<String> createSession(
            @PathVariable("agent_id") String agentId,
            @RequestHeader("X-User-Id") String userId,
            @RequestBody @NotNull CreateSessionRequest request
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("agent %s not found", agentId));
        }

        Session session = Session.builder()
                .id(UUID.randomUUID().toString().replaceAll("-", ""))
                .userId(userId)
                .agentId(agentId)
                .name(request.getName())
                .lastAppliedEventId(0L)
                .gmtCreated(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();
        sessionRepository.newSession(session);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(session.getId());
    }

    @GetMapping("/sessions")
    @Transactional(readOnly = true)
    public ResponseEntity<Object> listSessions(
            @PathVariable("agent_id") String agentId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(value = "pageNo", required = false, defaultValue = "1") @Min(1) int pageNo,
            @RequestParam(value = "pageSize", required = false, defaultValue = "10") @Min(1) @Max(100) int pageSize
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("agent %s not found", agentId));
        }

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(PageResultDTO.from(sessionRepository.listSessions(agentId, userId, pageNo, pageSize), s -> {
                    return SessionDTO.builder()
                            .id(s.getId())
                            .name(s.getName())
                            .lastAppliedEventId(s.getLastAppliedEventId())
                            .gmtCreated(s.getGmtCreated())
                            .gmtModified(s.getGmtModified())
                            .build();
                }));
    }

    @GetMapping("/sessions/{session_id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getSession(
            @PathVariable("agent_id") String agentId,
            @PathVariable("session_id") String sessionId,
            @RequestHeader("X-User-Id") String userId
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("agent %s not found", agentId));
        }
        Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("session %s not found", sessionId));
        }

        PageResultDTO<SessionMessageDTO> messages = PageResultDTO.from(
                messageRepository.listMessages(agentId, sessionId, 1, 10),
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
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(sessionDTO);
    }

    @DeleteMapping("/sessions/{session_id}")
    @Transactional
    public ResponseEntity<String> deleteSession(
            @PathVariable("agent_id") String agentId,
            @PathVariable("session_id") String sessionId,
            @RequestHeader("X-User-Id") String userId
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("agent %s not found", agentId));
        }
        Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("session %s not found", sessionId));
        }

        sessionRepository.deleteSession(agentId, sessionId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .build();
    }

    @GetMapping("/sessions/{session_id}/messages")
    @Transactional(readOnly = true)
    public ResponseEntity<Object> list_session_messages(
            @PathVariable("agent_id") String agentId,
            @PathVariable("session_id") String sessionId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(value = "pageNo", required = false, defaultValue = "1") @Min(1) int pageNo,
            @RequestParam(value = "pageSize", required = false, defaultValue = "10") @Min(1) @Max(1000) int pageSize
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("agent %s not found", agentId));
        }

        Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(String.format("session %s not found", sessionId));
        }

        PageResultDTO<SessionMessageDTO> messages = PageResultDTO.from(
                messageRepository.listMessages(agentId, sessionId, pageNo, pageSize),
                SessionMessageDTO::from
        );

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(messages);
    }

    @GetMapping("/sessions/{session_id}/events")
    public ResponseEntity<?> listSessionMessages(
            @PathVariable("agent_id") String agentId,
            @PathVariable("session_id") String sessionId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(value = "offset", required = false, defaultValue = "0") @Min(0) long offset,
            @RequestParam(value = "size", required = false, defaultValue = "10") @Min(1) @Max(100) int size
    ) {
        AgentConfig agent = getAgentConfig(agentId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(String.format("agent %s not found", agentId));
        }

        Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(String.format("session %s not found", sessionId));
        }

        List<SessionEvent> sessionEvents = eventRepository.pullEvents(agentId, sessionId, offset, size);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(sessionEvents);
    }

    @PostMapping("/sessions/{session_id}/chat")
    public ResponseEntity<?> chat(
            @PathVariable("agent_id") String agentId,
            @PathVariable("session_id") String sessionId,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            @RequestHeader(value = "accept", required = false) String accept,
            @RequestBody @NotNull ChatRequest chatRequest
    ) {
        AgentHandler agent = agentRegistry.getAgent(agentId, null, userId, sessionId);
        if (agent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(String.format("agent %s not found", agentId));
        }

        Session session = applicationContext.getBean(this.getClass()).getOrCreateSession(agentId, sessionId, userId);
        SessionMessage message = messageRepository.lastMessage(agentId, session.getId());
        if (message instanceof AgentSessionMessage agentSessionMessage && agentSessionMessage.getStatus() == SessionMessageStatus.EXECUTING) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(String.format("session %s is completing", session.getId()));
        }

        if (Objects.equals("text/event-stream", accept)) {
            Sinks.Many<ServerSentEvent<?>> sink = Sinks.many().unicast().onBackpressureBuffer();
            Runnable task = this.doChat(agent, agentId, userId, userName, sessionId, chatRequest, sink);
            Mono.fromRunnable(task)
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe(
                            null,
                            err -> log.error("chat task failed", err)
                    );
            Flux<ServerSentEvent<?>> flux = sink.asFlux()
                    .doOnCancel(() -> agent.cancel(null));
            return ResponseEntity.status(HttpStatus.OK)
                    .contentType(MediaType.TEXT_EVENT_STREAM)
                    .body(flux);
        } else {
            Runnable task = this.doChat(agent, agentId, userId, userName, sessionId, chatRequest, null);
            Mono.fromRunnable(task)
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe(
                            null,
                            err -> log.error("chat task failed", err)
                    );
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("success");
        }
    }

    private Runnable doChat(
            AgentHandler agentHandler,
            String agentId,
            String userId,
            String userName,
            String sessionId,
            ChatRequest chatRequest,
            Sinks.Many<ServerSentEvent<?>> sseSink
    ) {
        List<Content<?>> contents = chatRequest.getInput()
                .stream()
                .map(c -> c.toInputContent(agentHandler))
                .collect(Collectors.toList());


        UserSessionMessage userMessage = UserSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(agentId)
                .sessionId(sessionId)
                .userId(userId)
                .status(SessionMessageStatus.SUCCEED)
                .name(userName)
                .contents(contents)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();

        AgentSessionMessage agentMessage = AgentSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(agentId)
                .sessionId(sessionId)
                .userId(userId)
                .status(SessionMessageStatus.EXECUTING)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .gmtFinished(null)
                .build();

        EventSink rawEventSink = eventRepository.createEventSink(
                agentId,
                userId,
                sessionId,
                agentMessage.getId()
        );
        EventSink eventSink = wrapEventSink(agentHandler, rawEventSink, chatRequest, sseSink);

        eventSink.newUserMessage(userMessage);
        eventSink.newAgentMessage(agentMessage);
        return () -> {
            io.agentscope.core.session.Session session = agentStateRepository.agentSessionsOf(agentId, userId);
            try {
                agentHandler.loadFrom(session, sessionId);
                agentHandler.handleInput(AgentInput.builder()
                        .source(AgentInput.Source.USER)
                        .userMessage(userMessage)
                        .eventSink(eventSink)
                        .build());
            } finally {
                agentHandler.saveTo(session, sessionId);
            }
        };
    }

    private EventSink wrapEventSink(AgentHandler handler, EventSink rawEventSink, ChatRequest chatRequest, Sinks.Many<ServerSentEvent<?>> sseSink) {
        EventSink eventSink;
        if (sseSink == null) {
            eventSink = rawEventSink;
        } else if (!chatRequest.isEnableTts()) {
            AtomicBoolean completed = new AtomicBoolean(false);
            eventSink = new EventSink() {
                @Override
                public void newEvent(SessionEvent event) {
                    rawEventSink.newEvent(event);
                    if (completed.get()) {
                        return;
                    }
                    Sinks.EmitResult result = sseSink.tryEmitNext(ServerSentEvent.builder().data(event).build());
                    if (result.isFailure()) {
                        log.warn("SSE sink emit failed: {}", result);
                        handler.cancel(null);
                        completed.set(true);
                    }
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
                    sseSink.tryEmitComplete();
                }
            };
        } else {
            EventSink ttsEventSink = new TtsEventSinkWrapper(ttsService, rawEventSink, new TtsService.TtsCallback() {
                @Override
                public void onData(String dataBase64) {
                    send(TtsResponse.builder().dataBase64(dataBase64).finished(false).build());
                }

                @Override
                public void onFinished() {
                    send(TtsResponse.builder().finished(true).build());

                    rawEventSink.onComplete();
                    sseSink.tryEmitComplete();
                }

                @Override
                public void onError(Throwable t) {
                    send(TtsResponse.builder().success(false).error(t.getMessage()).build());
                    sseSink.tryEmitError(t);
                }

                private void send(TtsResponse response) {
                    Sinks.EmitResult result = sseSink.tryEmitNext(ServerSentEvent.builder()
                            .data(CustomEvent.builder()
                                    .type(SessionEventType.TTS_RESPONSE)
                                    .needPersistent(false)
                                    .data(response)
                                    .build())
                            .build());
                    if (result.isFailure()) {
                        log.error("Failed to send text to client: {}", result);
                    }
                }
            });

            AtomicBoolean completed = new AtomicBoolean(false);
            eventSink = new EventSink() {
                @Override
                public void newEvent(SessionEvent event) {
                    ttsEventSink.newEvent(event);
                    if (completed.get()) {
                        return;
                    }
                    Sinks.EmitResult result = sseSink.tryEmitNext(ServerSentEvent.builder().data(event).build());
                    if (result.isFailure()) {
                        log.warn("SSE sink emit failed: {}", result);
                        handler.cancel(null);
                        completed.set(true);
                    }
                }

                @Override
                public void saveMessage(SessionMessage sessionMessage) {
                    ttsEventSink.saveMessage(sessionMessage);
                }

                @Override
                public Long nextSequence(SequenceService.SequenceName sequenceName) {
                    return ttsEventSink.nextSequence(sequenceName);
                }

                @Override
                public void onComplete() {
                }
            };
        }

        eventSink.setAgentId(rawEventSink.getAgentId());
        eventSink.setSessionId(rawEventSink.getSessionId());
        eventSink.setUserId(rawEventSink.getUserId());
        eventSink.setMessageId(rawEventSink.getMessageId());

        return eventSink;
    }

    @Transactional
    public Session getOrCreateSession(String agentId, String sessionId, String userId) {
        Session session = sessionRepository.getSession(agentId, sessionId);
        if (session == null || !Objects.equals(userId, session.getUserId())) {
            session = Session.builder()
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


    private AgentConfig getAgentConfig(String agentId) {
        AgentConfig config = agentRegistry.getAgentConfigById(agentId);
        if (config != null && !Boolean.TRUE.equals(config.getEnabled())) {
            config = null;
        }
        return config;
    }
}
