package com.aliyun.tam.x.tron.api;


import com.aliyun.tam.x.tron.core.tts.TtsService;
import com.aliyun.tam.x.tron.core.tts.TtsSession;
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
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

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
        if (ttsService == null) {
            log.warn("TtsService is not available");
            return;
        }

        this.ttsSession = ttsService.newSession(dataBase64 -> {
            if (!session.isOpen()) {
                return;
            }
            try {
                session.getBasicRemote().sendText(dataBase64);
            } catch (IOException e) {
                log.error("Failed to send text to client", e);
            }
        });
        this.session = session;
        log.info("New WebSocket session opened for {}", session.getId());
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        log.debug("Received message: {}", message);
        if (ttsSession == null) {
            log.warn("TtsSession is not available");
            return;
        }
        try {
            Request request = objectMapper.readValue(message, Request.class);
            if (StringUtils.hasText(request.text)) {
                ttsSession.appendText(message);
            }
            if (Boolean.TRUE.equals(request.completed)) {
                ttsSession.complete();
                try {
                    session.close();
                } catch (IOException e) {
                    log.error("Failed to close session", e);
                }
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
