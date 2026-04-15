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


import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.core.tts.TtsSession;
import com.aliyun.tam.x.tron.api.response.TtsResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;

@Component
@ServerEndpoint("/tts")
@Slf4j
public class TtsWsEndpoint {

    private volatile static TtsService ttsService;

    private volatile static ObjectMapper objectMapper;

    @Data
    public static class Request {

        private String text;

        private Boolean completed = false;
    }

    private volatile Session session;

    private volatile TtsSession ttsSession;

    @OnOpen
    public void onOpen(Session session) {
        log.info("WebSocket connection opened");
        this.session = session;
        if (ttsService == null) {
            send(TtsResponse.builder().success(false).error("TtsService is not available").build());
            return;
        }

        this.ttsSession = ttsService.newSession(new TtsService.TtsCallback() {
            @Override
            public void onData(String dataBase64) {
                send(TtsResponse.builder().dataBase64(dataBase64).build());
            }

            @Override
            public void onFinished() {
                send(TtsResponse.builder().finished(true).build());
                try {
                    session.close();
                } catch (IOException e) {
                    log.error("Failed to close session", e);
                }
            }

            @Override
            public void onError(Throwable t) {
                send(TtsResponse.builder().success(false).error(t.getMessage()).build());
                try {
                    session.close();
                } catch (IOException e) {
                    log.error("Failed to close session", e);
                }
            }

        }, true);
        log.info("New WebSocket session opened for {}", session.getId());
    }

    private void send(TtsResponse response) {
        if (session != null && !session.isOpen()) {
            return;
        }
        try {
            session.getBasicRemote().sendText(
                    objectMapper.writeValueAsString(response)
            );
        } catch (IOException e) {
            log.error("Failed to send text to client", e);
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        log.debug("Received message: {}", message);
        if (ttsSession == null) {
            send(TtsResponse.builder().success(false).error("TtsSession is not available").build());
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

    @OnClose
    public void onClose() {
        log.info("WebSocket connection closed, sessionId={}", session == null ? "" : session.getId());
        if (ttsSession != null) {
            ttsSession.close();
            ttsSession = null;
        }
    }

    @OnError
    public void onError(Session session, Throwable error) {
        log.error("WebSocket error, sessionId={}", session.getId(), error);
        try {
            send(TtsResponse.builder().success(false).error("WebSocket error").build());
            session.close();
        } catch (IOException e) {
            log.error("Failed to close session", e);
        }
    }

    @Autowired(required = false)
    public void setTtsService(TtsService ttsService) {
        TtsWsEndpoint.ttsService = ttsService;
    }

    @Autowired
    public void setObjectMapper(ObjectMapper objectMapper) {
        TtsWsEndpoint.objectMapper = objectMapper;
    }
}
