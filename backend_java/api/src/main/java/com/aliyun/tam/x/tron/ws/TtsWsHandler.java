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


import com.aliyun.tam.x.tron.api.response.TtsResponse;
import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.core.tts.TtsSession;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
@RequiredArgsConstructor
public class TtsWsHandler implements WebSocketHandler {

    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private TtsService ttsService;

    @Data
    public static class Request {

        private String text;

        private Boolean completed = false;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        log.info("WebSocket connection opened, sessionId={}", session.getId());

        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();
        AtomicReference<TtsSession> ttsSessionRef = new AtomicReference<>();

        if (ttsService == null) {
            sink.tryEmitNext(serialize(TtsResponse.builder().success(false).error("TtsService is not available").build()));
            sink.tryEmitComplete();
        } else {
            TtsSession ttsSession = ttsService.newSession(new TtsService.TtsCallback() {
                @Override
                public void onData(String dataBase64) {
                    sink.tryEmitNext(serialize(TtsResponse.builder().dataBase64(dataBase64).build()));
                }

                @Override
                public void onFinished() {
                    sink.tryEmitNext(serialize(TtsResponse.builder().finished(true).build()));
                    sink.tryEmitComplete();
                }

                @Override
                public void onError(Throwable t) {
                    sink.tryEmitNext(serialize(TtsResponse.builder().success(false).error(t.getMessage()).build()));
                    sink.tryEmitComplete();
                }
            }, true);
            ttsSessionRef.set(ttsSession);
            log.info("New WebSocket session opened for {}", session.getId());
        }

        Mono<Void> output = session.send(sink.asFlux().map(session::textMessage));

        Mono<Void> input = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .doOnNext(message -> handleMessage(message, sink, ttsSessionRef))
                .doFinally(signal -> {
                    log.info("WebSocket connection closed, sessionId={}, signal={}", session.getId(), signal);
                    TtsSession current = ttsSessionRef.getAndSet(null);
                    if (current != null) {
                        current.close();
                    }
                })
                .then();

        return Mono.zip(input, output).then();
    }

    private void handleMessage(String message, Sinks.Many<String> sink, AtomicReference<TtsSession> ttsSessionRef) {
        log.debug("Received message: {}", message);
        TtsSession ttsSession = ttsSessionRef.get();
        if (ttsSession == null) {
            sink.tryEmitNext(serialize(TtsResponse.builder().success(false).error("TtsSession is not available").build()));
            return;
        }

        try {
            Request request = objectMapper.readValue(message, Request.class);
            if (StringUtils.hasText(request.text)) {
                ttsSession.appendText(request.getText());
            }
            if (Boolean.TRUE.equals(request.completed)) {
                ttsSession.complete();
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse request: {}", message);
        }
    }

    private String serialize(TtsResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize response", e);
            return "{}";
        }
    }
}
