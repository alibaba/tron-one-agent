package com.aliyun.tam.x.tron.api;


import com.aliyun.tam.x.tron.core.asr.AsrService;
import com.aliyun.tam.x.tron.core.asr.AsrSession;
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
@ServerEndpoint("/asr")
@Slf4j
public class AsrWsEndpoint {

    private volatile static AsrService asrService;

    private volatile static ObjectMapper objectMapper;

    @Data
    public static class Request {

        private String dataBase64;

        private Boolean completed = false;
    }

    @Data
    @Builder
    public static class Response {
        @Builder.Default
        private Boolean success = true;

        private String text;

        @Builder.Default
        private Boolean finished = false;

        private String error;
    }

    private volatile Session session;

    private volatile AsrSession asrSession;

    @OnOpen
    public void onOpen(Session session) {
        log.info("WebSocket connection opened");
        if (asrService == null) {
            send(Response.builder().success(false).error("AsrService is not available").build());
            return;
        }

        this.asrSession = asrService.newSession(new AsrService.AsrCallback() {
            @Override
            public void onText(String text) {
                send(Response.builder().text(text).build());
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
        this.session = session;
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
            log.error("Failed to send response to client", e);
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        log.debug("Received message: {}", message);
        if (asrSession == null) {
            send(Response.builder().success(false).error("AsrService is not available").build());
            return;
        }

        try {
            Request request = objectMapper.readValue(message, Request.class);
            if (StringUtils.hasText(request.dataBase64)) {
                asrSession.appendData(request.getDataBase64());
            }
            if (Boolean.TRUE.equals(request.completed)) {
                asrSession.complete();
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse request: {}", message);
        }
    }

    @OnClose
    public void onClose() {
        log.info("WebSocket connection closed, sessionId={}", session == null ? "" : session.getId());
        if (asrSession != null) {
            asrSession.close();
            asrSession = null;
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
    public void setAsrService(AsrService ttsService) {
        AsrWsEndpoint.asrService = ttsService;
    }

    @Autowired
    public void setObjectMapper(ObjectMapper objectMapper) {
        AsrWsEndpoint.objectMapper = objectMapper;
    }
}
