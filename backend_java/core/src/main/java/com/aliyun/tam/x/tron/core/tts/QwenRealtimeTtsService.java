package com.aliyun.tam.x.tron.core.tts;

import com.alibaba.dashscope.audio.qwen_tts_realtime.QwenTtsRealtime;
import com.alibaba.dashscope.audio.qwen_tts_realtime.QwenTtsRealtimeCallback;
import com.alibaba.dashscope.audio.qwen_tts_realtime.QwenTtsRealtimeConfig;
import com.alibaba.dashscope.audio.qwen_tts_realtime.QwenTtsRealtimeParam;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.google.gson.JsonObject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

@RequiredArgsConstructor
@Slf4j
public class QwenRealtimeTtsService implements TtsService {
    private final QwenRealtimeTtsConfig.QwenRealtimeTtsProperties properties;


    @Override
    public TtsSession newSession(TtsCallback callback) {
        final CountDownLatch startLatch = new CountDownLatch(1);
        final CountDownLatch finishLatch = new CountDownLatch(1);
        QwenTtsRealtime realtime = new QwenTtsRealtime(param(), new QwenTtsRealtimeCallback() {

            @Override
            public void onOpen() {
                log.info("WebSocket connection opened");
            }

            @Override
            public void onEvent(JsonObject message) {
                log.debug("Received message: {}", message);
                String type = message.get("type").getAsString();
                AtomicReference<String> sessionId = new AtomicReference<>();
                switch (type) {
                    case "session.created":
                        if (message.has("session")) {
                            String eventId = message.get("event_id").getAsString();
                            sessionId.set(message.get("session").getAsJsonObject().get("id").getAsString());
                            log.info("Session created with event_id: {}, session_id: {}", eventId, sessionId.get());
                            startLatch.countDown();
                        }
                        break;
                    case "response.audio.delta":
                        String eventId = message.get("event_id").getAsString();
                        String audioDataBase64 = message.get("delta").getAsString();
                        log.debug("Received audio data, event_id: {}, session_id: {}, size: {}", eventId, sessionId.get(), audioDataBase64.length());
                        callback.onData(audioDataBase64);
                        break;
                    case "response.done":
                        break;
                    case "session.finished":
                        log.info("Session finished,session_id: {}", sessionId.get());
                        finishLatch.countDown();
                        break;
                    default:
                        break;
                }
            }

            @Override
            public void onClose(int i, String s) {
                log.info("WebSocket connection closed with code {} and reason {}", i, s);
            }
        });


        try {
            realtime.connect();
            realtime.updateSession(config());
            if (!startLatch.await(10, TimeUnit.SECONDS)) {
                throw new TimeoutException("Session creation timed out");
            }

            return new TtsSession() {
                @Override
                public void appendText(String text) {
                    realtime.appendText(text);
                }

                @Override
                public void complete() {
                    try {
                        realtime.finish();
                        if (!finishLatch.await(10, TimeUnit.SECONDS)) {
                            throw new TimeoutException("Response completion timed out");
                        }
                    } catch (InterruptedException | TimeoutException e) {
                        throw new RuntimeException(e);
                    }
                }

                @Override
                public void close() {
                    realtime.close();
                }
            };
        } catch (NoApiKeyException | InterruptedException | TimeoutException e) {
            throw new RuntimeException(e);
        }
    }

    private QwenTtsRealtimeParam param() {
        return QwenTtsRealtimeParam.builder()
                .model(properties.getModel())
                .url(properties.getUrl())
                .apikey(properties.getApiKey())
                .build();
    }

    private QwenTtsRealtimeConfig config() {
        return QwenTtsRealtimeConfig.builder()
                .voice(properties.getVoice())
                .mode(properties.getMode())
                .responseFormat(properties.getFormat())
                .instructions(properties.getInstructions())
                .optimizeInstructions(properties.getOptimizeInstructions())
                .build();
    }
}
