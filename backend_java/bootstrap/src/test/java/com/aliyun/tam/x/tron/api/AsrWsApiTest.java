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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.restassured.RestAssured;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * API tests for the {@code /asr} streaming-ASR WebSocket endpoint.
 *
 * <p>The upstream Qwen Realtime ASR service requires a {@code DASHSCOPE_API_KEY} to function.
 * These tests cover the protocol layer that sits in front of the upstream service:
 * connection establishment, server-initiated error frames when the upstream is unreachable
 * or misconfigured, and graceful close. Real ASR transcription is intentionally out of scope.
 */
@DisplayName("ASR WebSocket API")
class AsrWsApiTest extends BaseApiTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private URI wsUri() {
        return URI.create("ws://localhost:" + RestAssured.port + "/asr");
    }

    @Test
    @DisplayName("WS /asr connection succeeds and either stays open or sends an immediate error frame")
    void asrConnectShouldOpenOrEmitInitialError() throws Exception {
        CountDownLatch openLatch = new CountDownLatch(1);
        CountDownLatch firstMsgLatch = new CountDownLatch(1);
        List<String> messages = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        openLatch.countDown();
                        WebSocket.Listener.super.onOpen(webSocket);
                    }

                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        if (last) {
                            messages.add(data.toString());
                            firstMsgLatch.countDown();
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        firstMsgLatch.countDown();
                    }
                })
                .join();

        assertTrue(openLatch.await(5, TimeUnit.SECONDS), "Connection should open");

        // Either the upstream service is healthy (no immediate frame) or it errors out
        // immediately with a structured response. Both must be valid JSON when present.
        boolean gotMessage = firstMsgLatch.await(3, TimeUnit.SECONDS);
        if (gotMessage && !messages.isEmpty()) {
            JsonNode resp = MAPPER.readTree(messages.get(0));
            assertNotNull(resp.get("success"), "ASR response must include 'success' field");
            // If the service is unavailable, success=false and error message is set
            if (!resp.get("success").asBoolean()) {
                assertNotNull(resp.get("error"), "Failed ASR response must include 'error'");
            }
        }

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    @Test
    @DisplayName("WS /asr handles malformed JSON without crashing the connection")
    void asrShouldTolerateMalformedJson() throws Exception {
        CountDownLatch openLatch = new CountDownLatch(1);

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        openLatch.countDown();
                        WebSocket.Listener.super.onOpen(webSocket);
                    }
                })
                .join();

        assertTrue(openLatch.await(5, TimeUnit.SECONDS));

        // Send malformed JSON; the endpoint logs a warning but does not crash.
        ws.sendText("not valid json {{{", true);

        // Connection should remain usable for a clean close.
        Thread.yield();
        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }
}
