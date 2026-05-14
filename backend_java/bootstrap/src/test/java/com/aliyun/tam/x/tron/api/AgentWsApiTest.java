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
 * API tests for Agent WebSocket JSON-RPC 2.0 endpoints.
 * Uses JDK 17 built-in java.net.http.WebSocket client.
 * X-User-Id is passed as a query parameter (supported by AgentEndpointConfigurator).
 */
@DisplayName("Agent WebSocket API")
class AgentWsApiTest extends BaseApiTest {

    private static final String AGENT_ID = "one_agent";
    private static final String NONEXISTENT_AGENT = "nonexistent_agent";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private int serverPort() {
        return RestAssured.port;
    }

    private URI wsUri(String agentId, String sessionId, String userId) {
        String query = userId != null ? "?X-User-Id=" + userId : "";
        return URI.create("ws://localhost:" + serverPort()
                + "/ws/agents/" + agentId + "/sessions/" + sessionId + query);
    }

    // ── Connection tests ──────────────────────────────────────────────

    @Test
    @DisplayName("WS connect should receive session notification")
    void connectShouldReceiveSessionNotification() throws Exception {
        String sessionId = "ws_connect_" + System.currentTimeMillis();
        CountDownLatch msgLatch = new CountDownLatch(1);
        List<String> messages = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (last) {
                            messages.add(data.toString());
                            msgLatch.countDown();
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        msgLatch.countDown();
                    }
                })
                .join();

        assertTrue(msgLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");
        assertFalse(messages.isEmpty(), "Should have at least one message");

        JsonNode msg = MAPPER.readTree(messages.get(0));
        assertEquals("2.0", msg.get("jsonrpc").asText());
        assertEquals("session", msg.get("method").asText());
        assertNotNull(msg.get("params"));
        assertEquals(sessionId, msg.get("params").get("id").asText());

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    /**
     * The endpoint's {@code onOpen} throws {@code IllegalArgumentException} for unknown agents,
     * which causes Tomcat to close the WebSocket immediately after the handshake. The JDK
     * WebSocket client surfaces that as either {@code onError} or, more commonly, an early
     * {@code onClose} with a non-1000 code. Both are accepted as "the connection failed".
     */
    @Test
    @DisplayName("WS connect to nonexistent agent should fail (onError or early onClose)")
    void connectToNonexistentAgentShouldFail() throws Exception {
        String sessionId = "ws_badagent_" + System.currentTimeMillis();
        CountDownLatch failLatch = new CountDownLatch(1);

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws;
        try {
            ws = client.newWebSocketBuilder()
                    .buildAsync(wsUri(NONEXISTENT_AGENT, sessionId, "test-user"), new WebSocket.Listener() {
                        @Override
                        public void onError(WebSocket webSocket, Throwable error) {
                            failLatch.countDown();
                        }

                        @Override
                        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                            failLatch.countDown();
                            return null;
                        }
                    })
                    .join();
        } catch (Exception e) {
            // Handshake itself can throw if the server rejects before upgrade — also a valid failure.
            return;
        }

        assertTrue(failLatch.await(10, TimeUnit.SECONDS),
                "Connection to nonexistent agent must fail via onError or onClose");

        try {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
        } catch (Exception ignored) {
        }
    }

    /**
     * Same handling pattern as the nonexistent-agent test: the missing X-User-Id makes
     * the endpoint's {@code onOpen} throw, and Tomcat closes the connection.
     */
    @Test
    @DisplayName("WS connect without X-User-Id should fail (onError or early onClose)")
    void connectWithoutUserIdShouldFail() throws Exception {
        String sessionId = "ws_nouser_" + System.currentTimeMillis();
        CountDownLatch failLatch = new CountDownLatch(1);

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws;
        try {
            ws = client.newWebSocketBuilder()
                    .buildAsync(wsUri(AGENT_ID, sessionId, null), new WebSocket.Listener() {
                        @Override
                        public void onError(WebSocket webSocket, Throwable error) {
                            failLatch.countDown();
                        }

                        @Override
                        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                            failLatch.countDown();
                            return null;
                        }
                    })
                    .join();
        } catch (Exception e) {
            return;
        }

        assertTrue(failLatch.await(10, TimeUnit.SECONDS),
                "Connection without X-User-Id must fail via onError or onClose");

        try {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
        } catch (Exception ignored) {
        }
    }

    // ── JSON-RPC chat tests ───────────────────────────────────────────

    @Test
    @DisplayName("JSON-RPC chat should return messageId")
    void chatShouldReturnMessageId() throws Exception {
        String sessionId = "ws_chat_" + System.currentTimeMillis();
        CountDownLatch sessionLatch = new CountDownLatch(1);
        CountDownLatch responseLatch = new CountDownLatch(1);
        List<String> messages = new ArrayList<>();
        List<String> responses = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (!last) {
                            return null;
                        }
                        String text = data.toString();
                        try {
                            JsonNode node = MAPPER.readTree(text);
                            // Notifications have no "id" field; responses do
                            if (node.has("id") && node.get("id") != null && !node.get("id").isNull()) {
                                responses.add(text);
                                responseLatch.countDown();
                            } else {
                                messages.add(text);
                                if (node.has("method") && "session".equals(node.get("method").asText())) {
                                    sessionLatch.countDown();
                                }
                            }
                        } catch (Exception e) {
                            messages.add(text);
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        sessionLatch.countDown();
                        responseLatch.countDown();
                    }
                })
                .join();

        // Wait for session notification
        assertTrue(sessionLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");

        // Send chat request
        String chatRequest = """
                {"jsonrpc":"2.0","method":"chat","id":1,"params":[{"input":[{"type":1,"text":"Hello"}]}]}""";
        ws.sendText(chatRequest, true);

        // Wait for response
        assertTrue(responseLatch.await(30, TimeUnit.SECONDS), "Should receive chat response");
        assertFalse(responses.isEmpty(), "Should have a response");

        JsonNode resp = MAPPER.readTree(responses.get(0));
        assertEquals("2.0", resp.get("jsonrpc").asText());
        assertNotNull(resp.get("result"), "Response should have result (messageId)");
        assertTrue(resp.get("result").isLong() || resp.get("result").isInt(), "Result should be a number");

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    @Test
    @DisplayName("JSON-RPC chat should stream event notifications")
    void chatShouldStreamEventNotifications() throws Exception {
        String sessionId = "ws_events_" + System.currentTimeMillis();
        CountDownLatch sessionLatch = new CountDownLatch(1);
        CountDownLatch eventLatch = new CountDownLatch(1);
        List<String> events = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (!last) {
                            return null;
                        }
                        String text = data.toString();
                        try {
                            JsonNode node = MAPPER.readTree(text);
                            if (node.has("method")) {
                                String method = node.get("method").asText();
                                if ("session".equals(method)) {
                                    sessionLatch.countDown();
                                } else if ("event".equals(method)) {
                                    events.add(text);
                                    eventLatch.countDown();
                                }
                            }
                        } catch (Exception ignored) {
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        sessionLatch.countDown();
                        eventLatch.countDown();
                    }
                })
                .join();

        // Wait for session notification
        assertTrue(sessionLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");

        // Send chat request
        String chatRequest = """
                {"jsonrpc":"2.0","method":"chat","id":1,"params":[{"input":[{"type":1,"text":"Hello"}]}]}""";
        ws.sendText(chatRequest, true);

        // Wait for at least one event notification
        assertTrue(eventLatch.await(60, TimeUnit.SECONDS), "Should receive event notification");
        assertFalse(events.isEmpty(), "Should have at least one event");

        JsonNode event = MAPPER.readTree(events.get(0));
        assertEquals("2.0", event.get("jsonrpc").asText());
        assertEquals("event", event.get("method").asText());
        assertNotNull(event.get("params"), "Event should have params");

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    // ── JSON-RPC cancel test ──────────────────────────────────────────

    @Test
    @DisplayName("JSON-RPC cancel should return null result")
    void cancelShouldReturnNullResult() throws Exception {
        String sessionId = "ws_cancel_" + System.currentTimeMillis();
        CountDownLatch sessionLatch = new CountDownLatch(1);
        CountDownLatch responseLatch = new CountDownLatch(1);
        List<String> responses = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (!last) {
                            return null;
                        }
                        String text = data.toString();
                        try {
                            JsonNode node = MAPPER.readTree(text);
                            if (node.has("id") && node.get("id") != null && !node.get("id").isNull()) {
                                responses.add(text);
                                responseLatch.countDown();
                            } else if (node.has("method") && "session".equals(node.get("method").asText())) {
                                sessionLatch.countDown();
                            }
                        } catch (Exception ignored) {
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        sessionLatch.countDown();
                        responseLatch.countDown();
                    }
                })
                .join();

        // Wait for session notification
        assertTrue(sessionLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");

        // Send cancel request — params must be list-form for JsonRpcHelper to bind
        // positional args to handleCancel(String message).
        String cancelRequest = """
                {"jsonrpc":"2.0","method":"cancel","id":1,"params":["test cancel"]}""";
        ws.sendText(cancelRequest, true);

        // Wait for response
        assertTrue(responseLatch.await(10, TimeUnit.SECONDS), "Should receive cancel response");
        assertFalse(responses.isEmpty(), "Should have a response");

        JsonNode resp = MAPPER.readTree(responses.get(0));
        assertEquals("2.0", resp.get("jsonrpc").asText());
        // handleCancel returns void → JSON-RPC result is null. Jackson's NON_NULL default
        // omits the field entirely, so accept both an absent `result` and an explicit null.
        JsonNode resultNode = resp.get("result");
        assertTrue(resultNode == null || resultNode.isNull(),
                "Cancel should return absent or JSON null result, got: " + resp);
        assertFalse(resp.has("error"), "Cancel should not return error");

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    // ── JSON-RPC error handling tests ─────────────────────────────────

    @Test
    @DisplayName("JSON-RPC unknown method should return METHOD_NOT_FOUND error")
    void unknownMethodShouldReturnError() throws Exception {
        String sessionId = "ws_unknown_" + System.currentTimeMillis();
        CountDownLatch sessionLatch = new CountDownLatch(1);
        CountDownLatch responseLatch = new CountDownLatch(1);
        List<String> responses = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (!last) {
                            return null;
                        }
                        String text = data.toString();
                        try {
                            JsonNode node = MAPPER.readTree(text);
                            if (node.has("id") && node.get("id") != null && !node.get("id").isNull()
                                    && node.has("error")) {
                                responses.add(text);
                                responseLatch.countDown();
                            } else if (node.has("method") && "session".equals(node.get("method").asText())) {
                                sessionLatch.countDown();
                            }
                        } catch (Exception ignored) {
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        sessionLatch.countDown();
                        responseLatch.countDown();
                    }
                })
                .join();

        // Wait for session notification
        assertTrue(sessionLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");

        // Send unknown method
        String unknownRequest = """
                {"jsonrpc":"2.0","method":"nonexistent_method","id":1}""";
        ws.sendText(unknownRequest, true);

        // Wait for error response
        assertTrue(responseLatch.await(10, TimeUnit.SECONDS), "Should receive error response");
        assertFalse(responses.isEmpty());

        JsonNode resp = MAPPER.readTree(responses.get(0));
        assertNotNull(resp.get("error"), "Should have error object");
        assertEquals(-32601, resp.get("error").get("code").asInt(), "Should be METHOD_NOT_FOUND");

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }

    @Test
    @DisplayName("JSON-RPC invalid JSON should return PARSE_ERROR")
    void invalidJsonShouldReturnParseError() throws Exception {
        String sessionId = "ws_badjson_" + System.currentTimeMillis();
        CountDownLatch sessionLatch = new CountDownLatch(1);
        CountDownLatch responseLatch = new CountDownLatch(1);
        List<String> responses = new ArrayList<>();

        HttpClient client = HttpClient.newHttpClient();
        WebSocket ws = client.newWebSocketBuilder()
                .buildAsync(wsUri(AGENT_ID, sessionId, "test-user"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        // JDK's WebSocket.Listener delivers only one message per request.
                        // Pull the next one immediately so latches that wait for >1 message
                        // (session notification + JSON-RPC response, event stream, etc.) fire.
                        webSocket.request(1);
                        if (!last) {
                            return null;
                        }
                        String text = data.toString();
                        try {
                            JsonNode node = MAPPER.readTree(text);
                            if (node.has("error")) {
                                responses.add(text);
                                responseLatch.countDown();
                            } else if (node.has("method") && "session".equals(node.get("method").asText())) {
                                sessionLatch.countDown();
                            }
                        } catch (Exception ignored) {
                        }
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        sessionLatch.countDown();
                        responseLatch.countDown();
                    }
                })
                .join();

        // Wait for session notification
        assertTrue(sessionLatch.await(10, TimeUnit.SECONDS), "Should receive session notification");

        // Send malformed JSON
        ws.sendText("this is not json {{{", true);

        // Wait for error response
        assertTrue(responseLatch.await(10, TimeUnit.SECONDS), "Should receive parse error");
        assertFalse(responses.isEmpty());

        JsonNode resp = MAPPER.readTree(responses.get(0));
        assertNotNull(resp.get("error"), "Should have error object");
        assertEquals(-32700, resp.get("error").get("code").asInt(), "Should be PARSE_ERROR");

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "ok");
    }
}
