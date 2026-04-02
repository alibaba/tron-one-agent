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
        final CountDownLatch sessionCreatedLatch = new CountDownLatch(1);
        final CountDownLatch sessionUpdatedLatch = new CountDownLatch(1);

        final AtomicReference<String> sessionId = new AtomicReference<>();
        QwenTtsRealtime realtime = new QwenTtsRealtime(param(), new QwenTtsRealtimeCallback() {

            @Override
            public void onOpen() {
                log.info("WebSocket connection opened");
            }

            @Override
            public void onEvent(JsonObject message) {
                log.debug("Received message: {}", message);
                String type = message.get("type").getAsString();
                switch (type) {
                    case "session.created":
                        JsonObject session = message.get("session").getAsJsonObject();
                        sessionId.set(session.get("id").getAsString());
                        log.info("tts session created, session_id: {}", sessionId.get());
                        sessionCreatedLatch.countDown();
                        break;
                    case "session.updated":
                        log.info("tts session updated, session_id: {}", sessionId.get());
                        sessionUpdatedLatch.countDown();
                        break;
                    case "response.audio.delta":
                        String audioDataBase64 = message.get("delta").getAsString();
                        log.debug("Received audio data, session_id: {}, size: {}", sessionId.get(), audioDataBase64.length());
                        callback.onData(audioDataBase64);
                        break;
                    case "session.finished":
                        log.info("Session finished,session_id: {}", sessionId.get());
                        callback.onFinished();
                        break;
                    case "error":
                        JsonObject error = message.getAsJsonObject("error");
                        log.error("Encounter tts error, sessionId={}, code={}, message={}", sessionId.get(), error.get("code"), error.get("message"));
                        callback.onError(new RuntimeException(error.get("code") + " - " + error.get("message")));
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
            long startInMs = System.currentTimeMillis();
            realtime.connect();
            if (!sessionCreatedLatch.await(properties.getSessionCreateTimeoutInMills(), TimeUnit.MILLISECONDS)) {
                throw new TimeoutException("Session creation timed out");
            }

            long costInMs = System.currentTimeMillis() - startInMs;
            realtime.updateSession(config());
            if (!sessionUpdatedLatch.await(properties.getSessionCreateTimeoutInMills() - costInMs, TimeUnit.MILLISECONDS)) {
                throw new TimeoutException("Session update timed out");
            }

            return new TtsSession() {
                @Override
                public synchronized void appendText(String text) {
                    for (int i = 0; i < text.length(); i += properties.getMaxChunkSize()) {
                        String chunk = text.substring(i, Math.min(i + properties.getMaxChunkSize(), text.length()));
                        realtime.appendText(chunk);
                        sleep(properties.getChunkIntervalInMills());
                    }
                }

                private void sleep(long millis) {
                    try {
                        Thread.sleep(millis);
                    } catch (InterruptedException e) {
                        // ignore
                    }
                }

                @Override
                public void complete() {
                    realtime.finish();
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
