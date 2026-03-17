package com.aliyun.tam.x.tron.core.asr;

import com.alibaba.dashscope.audio.omni.*;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.google.gson.JsonObject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Base64;
import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@RequiredArgsConstructor
public class QwenRealtimeAsrService implements AsrService {
    private final QwenRealtimeAsrConfig.QwenRealtimeAsrProperties properties;

    @Override
    public AsrSession newSession(AsrCallback callback) {
        OmniRealtimeParam param = OmniRealtimeParam.builder()
                .model(properties.getModel())
                .url(properties.getUrl())
                .apikey(properties.getApiKey())
                .build();

        CountDownLatch sessionCreatedLatch = new CountDownLatch(1);
        CountDownLatch sessionUpdatedLatch = new CountDownLatch(1);

        final AtomicReference<String> sessionId = new AtomicReference<>();
        OmniRealtimeConversation conversation = new OmniRealtimeConversation(param, new OmniRealtimeCallback() {
            @Override
            public void onOpen() {
            }

            @Override
            public void onEvent(JsonObject jsonObject) {
                String type = jsonObject.get("type").getAsString();
                switch (type) {
                    case "session.created":
                        JsonObject session = jsonObject.get("session").getAsJsonObject();
                        sessionId.set(session.get("id").getAsString());
                        log.info("asr session created, sessionId={}", sessionId.get());
                        sessionCreatedLatch.countDown();
                        break;
                    case "session.updated":
                        log.info("asr session updated, sessionId={}", sessionId.get());
                        sessionUpdatedLatch.countDown();
                        break;
                    case "conversation.item.input_audio_transcription.text":
                        String text = jsonObject.get("text").getAsString();
                        String stash = jsonObject.get("stash").getAsString();
                        log.debug("asr mid result, sessionId={}, text={}, stash={}", sessionId.get(), text, stash);
                        callback.onText(text + stash);
                        break;
                    case "conversation.item.input_audio_transcription.completed":
                        String transcript = jsonObject.get("transcript").getAsString();
                        log.info("asr result, sessionId={}, result={}", sessionId.get(), transcript);
                        callback.onText(transcript);
                        break;
                    case "session.finished":
                        log.info("Session finished, sessionId={}", sessionId.get());
                        callback.onFinished();
                        break;
                    case "conversation.item.input_audio_transcription.failed":
                        JsonObject failed = jsonObject.get("error").getAsJsonObject();
                        log.error("Encounter asr error event, sessionId={}, error={}", sessionId.get(), failed.toString());
                        callback.onError(new RuntimeException(failed.get("code") + " - " + failed.get("message")));
                    case "error":
                        JsonObject error = jsonObject.get("error").getAsJsonObject();
                        log.error("Encounter asr error event, sessionId={}, error={}", sessionId.get(), error.toString());
                        callback.onError(new RuntimeException(error.get("code") + " - " + error.get("message")));
                        break;
                    default:
                        break;
                }
            }

            @Override
            public void onClose(int i, String s) {
                log.info("Session closed, code={}, reason={}", i, s);
            }
        });
        try {
            long startTime = System.currentTimeMillis();
            conversation.connect();
            if (!sessionCreatedLatch.await(properties.getSessionCreateTimeoutInMills(), TimeUnit.MILLISECONDS)) {
                throw new TimeoutException("Session creation timed out");
            }

            OmniRealtimeTranscriptionParam transcriptionParam = new OmniRealtimeTranscriptionParam();
            transcriptionParam.setLanguage(properties.getLanguage());
            transcriptionParam.setInputSampleRate(properties.getInputSampleRate());
            transcriptionParam.setInputAudioFormat(properties.getInputAudioFormat());

            OmniRealtimeConfig config = OmniRealtimeConfig.builder()
                    .modalities(Collections.singletonList(OmniRealtimeModality.TEXT))
                    .enableTurnDetection(false)
                    .transcriptionConfig(transcriptionParam)
                    .build();

            long costInMs = System.currentTimeMillis() - startTime;
            conversation.updateSession(config);
            if (!sessionUpdatedLatch.await(properties.getSessionCreateTimeoutInMills() - costInMs, TimeUnit.MILLISECONDS)) {
                throw new TimeoutException("Session update timed out");
            }

            return new AsrSession() {
                @Override
                public void appendData(String dataBase64) {
                    conversation.appendAudio(dataBase64);
                }

                @Override
                public void complete() {
                    conversation.commit();
                }

                @Override
                public void close() {
                    conversation.close();
                }
            };
        } catch (NoApiKeyException | InterruptedException | TimeoutException e) {
            throw new RuntimeException(e);
        }
    }
}
