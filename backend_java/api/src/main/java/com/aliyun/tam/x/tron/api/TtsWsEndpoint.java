package com.aliyun.tam.x.tron.api;


import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.core.tts.TtsSession;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.Builder;
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

    @Data
    @Builder
    public static class Response {
        @Builder.Default
        private Boolean success = true;

        private String dataBase64;

        @Builder.Default
        private Boolean finished = false;

        private String error;
    }

    private volatile Session session;

    private volatile TtsSession ttsSession;

    @OnOpen
    public void onOpen(Session session) {
        log.info("WebSocket connection opened");
        this.session = session;
        if (ttsService == null) {
            send(Response.builder().success(false).error("TtsService is not available").build());
            return;
        }

        this.ttsSession = ttsService.newSession(new TtsService.TtsCallback() {
            @Override
            public void onData(String dataBase64) {
                send(Response.builder().dataBase64(dataBase64).build());
            }

            @Override
            public void onFinished() {
                send(Response.builder().finished(true).build());
                try {
                    session.close();
                } catch (IOException e) {
                    log.error("Failed to close session", e);
                }
            }

            @Override
            public void onError(Throwable t) {
                send(Response.builder().success(false).error(t.getMessage()).build());
                try {
                    session.close();
                } catch (IOException e) {
                    log.error("Failed to close session", e);
                }
            }

        });
        log.info("New WebSocket session opened for {}", session.getId());
    }

    private void send(Response response) {
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
            send(Response.builder().success(false).error("TtsSession is not available").build());
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
            send(Response.builder().success(false).error("WebSocket error").build());
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
