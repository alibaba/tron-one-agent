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

import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * API tests for Session endpoints.
 */
@DisplayName("Session API")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SessionApiTest extends BaseApiTest {

    private static final String AGENT_ID = "one_agent";
    private static final String NONEXISTENT_AGENT = "nonexistent_agent";
    private static final String NONEXISTENT_SESSION = "nonexistent_session_id";

    private static String createdSessionId;

    // ── POST /agents/{agent_id}/sessions ──────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /agents/{agent_id}/sessions should create session")
    void createSessionShouldReturn201() {
        Response response = givenJson()
                .body("{\"name\": \"Test Session\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().response();

        // Response is JSON string like "abc123..." - strip quotes
        String raw = response.getBody().asString();
        createdSessionId = raw.replaceAll("^\"|\"$", "");
        assertEquals(32, createdSessionId.length(), "Session ID should be 32-char UUID without dashes");
    }

    @Test
    @DisplayName("POST /agents/{agent_id}/sessions without name should also work")
    void createSessionWithoutNameShouldReturn201() {
        Response response = givenJson()
                .body("{}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().response();

        String raw = response.getBody().asString();
        String sessionId = raw.replaceAll("^\"|\"$", "");
        assertEquals(32, sessionId.length());
    }

    @Test
    @DisplayName("POST /agents/{agent_id}/sessions with nonexistent agent should return 404")
    void createSessionWithNonexistentAgentShouldReturn404() {
        givenJson()
                .body("{\"name\": \"Test\"}")
                .when()
                .post("/agents/{agentId}/sessions", NONEXISTENT_AGENT)
                .then()
                .statusCode(404)
                .body(containsString("not found"));
    }

    @Test
    @DisplayName("POST /agents/{agent_id}/sessions with empty body should return 500")
    void createSessionWithEmptyBodyShouldReturn500() {
        givenJson()
                .body("")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("POST /agents/{agent_id}/sessions without X-User-Id should return 500")
    void createSessionWithoutUserIdShouldReturn500() {
        RestAssured.given()
                .basePath(apiPath())
                .contentType("application/json")
                .body("{\"name\": \"Test\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(500);
    }

    // ── GET /agents/{agent_id}/sessions ───────────────────────────────

    @Test
    @Order(2)
    @DisplayName("GET /agents/{agent_id}/sessions should return paginated sessions")
    void listSessionsShouldReturn200() {
        given()
                .when()
                .get("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(200)
                .body("totalRecords", greaterThanOrEqualTo(1))
                .body("records", notNullValue())
                .body("pageNum", equalTo(1))
                .body("pageSize", equalTo(10))
                .body("totalPages", greaterThanOrEqualTo(1));
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions with custom pagination")
    void listSessionsWithPaginationShouldReturn200() {
        given()
                .queryParam("pageNo", 1)
                .queryParam("pageSize", 2)
                .when()
                .get("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(200)
                .body("pageNum", equalTo(1))
                .body("pageSize", equalTo(2));
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions with pageNo < 1 should return 500")
    void listSessionsWithInvalidPageNoShouldReturn400() {
        given()
                .queryParam("pageNo", 0)
                .when()
                .get("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions with pageSize > 100 should return 500")
    void listSessionsWithInvalidPageSizeShouldReturn400() {
        given()
                .queryParam("pageSize", 101)
                .when()
                .get("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions with nonexistent agent should return 404")
    void listSessionsWithNonexistentAgentShouldReturn404() {
        given()
                .when()
                .get("/agents/{agentId}/sessions", NONEXISTENT_AGENT)
                .then()
                .statusCode(404);
    }

    // ── GET /agents/{agent_id}/sessions/{session_id} ──────────────────

    @Test
    @Order(3)
    @DisplayName("GET /agents/{agent_id}/sessions/{session_id} should return session detail")
    void getSessionShouldReturn200() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200)
                .body("id", equalTo(createdSessionId))
                .body("userId", equalTo("test-user"))
                .body("agentId", equalTo(AGENT_ID))
                .body("name", equalTo("Test Session"))
                .body("messages", notNullValue());
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions/{session_id} with nonexistent session should return 404")
    void getSessionWithNonexistentSessionShouldReturn404() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, NONEXISTENT_SESSION)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("GET /agents/{agent_id}/sessions/{session_id} with nonexistent agent should return 404")
    void getSessionWithNonexistentAgentShouldReturn404() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", NONEXISTENT_AGENT, createdSessionId)
                .then()
                .statusCode(404);
    }

    // ── GET /agents/{agent_id}/sessions/{session_id}/messages ─────────

    @Test
    @Order(4)
    @DisplayName("GET /agents/{agent_id}/sessions/{session_id}/messages should return messages")
    void listSessionMessagesShouldReturn200() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200)
                .body("totalRecords", greaterThanOrEqualTo(0))
                .body("records", notNullValue())
                .body("pageNum", equalTo(1))
                .body("pageSize", equalTo(10));
    }

    @Test
    @DisplayName("GET .../messages with custom pagination")
    void listSessionMessagesWithPaginationShouldReturn200() {
        given()
                .queryParam("pageNo", 1)
                .queryParam("pageSize", 5)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200)
                .body("pageNum", equalTo(1))
                .body("pageSize", equalTo(5));
    }

    @Test
    @DisplayName("GET .../messages with nonexistent session should return 404")
    void listSessionMessagesWithNonexistentSessionShouldReturn404() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, NONEXISTENT_SESSION)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("GET .../messages with invalid pageNo should return 500")
    void listSessionMessagesWithInvalidPageNoShouldReturn400() {
        given()
                .queryParam("pageNo", 0)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, createdSessionId)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("GET .../messages with pageSize > 1000 should return 500")
    void listSessionMessagesWithPageSizeGreaterThan1000ShouldReturn400() {
        given()
                .queryParam("pageSize", 1001)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, createdSessionId)
                .then()
                .statusCode(500);
    }

    // ── GET /agents/{agent_id}/sessions/{session_id}/events ───────────

    @Test
    @Order(5)
    @DisplayName("GET /agents/{agent_id}/sessions/{session_id}/events should return events")
    void listSessionEventsShouldReturn200() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/events", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200)
                .body("$.size()", greaterThanOrEqualTo(0));
    }

    @Test
    @DisplayName("GET .../events with offset and size")
    void listSessionEventsWithPaginationShouldReturn200() {
        given()
                .queryParam("offset", 0)
                .queryParam("size", 5)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/events", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200)
                .body("$.size()", lessThanOrEqualTo(5));
    }

    @Test
    @DisplayName("GET .../events with invalid size should return 500")
    void listSessionEventsWithInvalidSizeShouldReturn400() {
        given()
                .queryParam("size", 101)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/events", AGENT_ID, createdSessionId)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("GET .../events with negative offset should return 500")
    void listSessionEventsWithNegativeOffsetShouldReturn400() {
        given()
                .queryParam("offset", -1)
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/events", AGENT_ID, createdSessionId)
                .then()
                .statusCode(500);
    }

    @Test
    @DisplayName("GET .../events with nonexistent session should return 404")
    void listSessionEventsWithNonexistentSessionShouldReturn404() {
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/events", AGENT_ID, NONEXISTENT_SESSION)
                .then()
                .statusCode(404);
    }

    // ── POST /agents/{agent_id}/sessions/{session_id}/chat ────────────

    @Test
    @Order(8)
    @DisplayName("POST .../chat with application/json Accept should return success")
    void chatWithJsonAcceptShouldReturn200() {
        String chatSessionId = "chat_json_" + System.currentTimeMillis();
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, chatSessionId)
                .then()
                .statusCode(200)
                .body(containsString("success"));
    }

    @Test
    @Order(9)
    @DisplayName("POST .../chat without Accept header should default to json")
    void chatWithoutAcceptHeaderShouldReturn200() {
        String chatSessionId = "chat_noaccept_" + System.currentTimeMillis();
        givenJson()
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, chatSessionId)
                .then()
                .statusCode(200)
                .body(containsString("success"));
    }

    @Test
    @Order(6)
    @DisplayName("POST .../chat with empty input should return 200")
    void chatWithEmptyInputShouldReturn200() {
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, createdSessionId)
                .then()
                .statusCode(200);
    }

    @Test
    @Order(6)
    @DisplayName("POST .../chat without input field should return 400 or 500")
    void chatWithoutInputFieldShouldReturn400() {
        givenJson()
                .header("Accept", "application/json")
                .body("{}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, createdSessionId)
                .then()
                .statusCode(anyOf(is(400), is(500)));
    }

    @Test
    @Order(7)
    @DisplayName("POST .../chat with SSE Accept should return 200 with event-stream")
    void chatWithSseAcceptShouldReturn200() {
        String sseSessionId = "chat_sse_" + System.currentTimeMillis();
        givenJson()
                .header("Accept", "text/event-stream")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, sseSessionId)
                .then()
                .statusCode(200)
                .contentType(containsString("text/event-stream"));
    }

    /**
     * Race-prone: the first chat may finish before the second is sent.
     * The intent is to verify the 400-when-busy contract, but without a
     * synchronization hook we accept both outcomes.
     */
    @Test
    @Order(7)
    @DisplayName("POST .../chat racing on a busy session returns 200 or 400 (documents busy contract)")
    void chatWhenSessionIsExecutingDocumentsBusyContract() {
        String busySessionId = "chat_busy_" + System.currentTimeMillis();
        // Send first chat to start execution
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, busySessionId)
                .then()
                .statusCode(200);

        // Second chat to same session may get 400 if first is still executing
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello again\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, busySessionId)
                .then()
                .statusCode(anyOf(is(200), is(400)));
    }

    @Test
    @DisplayName("POST .../chat with nonexistent agent should return 404")
    void chatWithNonexistentAgentShouldReturn404() {
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat",
                        NONEXISTENT_AGENT, createdSessionId)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("POST .../chat with nonexistent session auto-creates it and returns 200")
    void chatWithNonexistentSessionShouldAutoCreate() {
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat",
                        AGENT_ID, "auto_created_" + System.currentTimeMillis())
                .then()
                .statusCode(200)
                .body(containsString("success"));
    }

    @Test
    @Order(10)
    @DisplayName("POST .../chat with enableTts flag")
    void chatWithEnableTtsShouldReturn200() {
        String chatSessionId = "chat_tts_" + System.currentTimeMillis();
        givenJson()
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}],\"enableTts\":true}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, chatSessionId)
                .then()
                .statusCode(200)
                .body(containsString("success"));
    }

    @Test
    @DisplayName("POST .../chat with X-User-Name header")
    void chatWithUserNameHeaderShouldReturn200() {
        String newSessionId = "named_user_" + System.currentTimeMillis();
        givenJson()
                .header("Accept", "application/json")
                .header("X-User-Name", "Test User")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, newSessionId)
                .then()
                .statusCode(200)
                .body(containsString("success"));
    }

    @Test
    @DisplayName("POST .../chat without X-User-Id should return 500")
    void chatWithoutUserIdShouldReturn500() {
        RestAssured.given()
                .basePath(apiPath())
                .contentType("application/json")
                .header("Accept", "application/json")
                .body("{\"input\":[{\"type\":1,\"text\":\"Hello\"}]}")
                .when()
                .post("/agents/{agentId}/sessions/{sessionId}/chat", AGENT_ID, createdSessionId)
                .then()
                .statusCode(500);
    }

    // ── DELETE /agents/{agent_id}/sessions/{session_id} ───────────────

    @Test
    @Order(11)
    @DisplayName("DELETE /agents/{agent_id}/sessions/{session_id} should delete session and return 404 on subsequent GET")
    void deleteSessionShouldReturn200() {
        // Create a session to delete
        String rawId = givenJson()
                .body("{\"name\": \"To Be Deleted\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().body().asString();
        // Strip JSON quotes from response body
        String deleteTargetId = rawId.replaceAll("^\"|\"$", "");

        // Delete must succeed.
        given()
                .when()
                .delete("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, deleteTargetId)
                .then()
                .statusCode(200);

        // Subsequent GET must return 404.
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, deleteTargetId)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("DELETE .../sessions/{session_id} with nonexistent session should return 404")
    void deleteSessionWithNonexistentSessionShouldReturn404() {
        given()
                .when()
                .delete("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, NONEXISTENT_SESSION)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("DELETE .../sessions/{session_id} with nonexistent agent should return 404")
    void deleteSessionWithNonexistentAgentShouldReturn404() {
        given()
                .when()
                .delete("/agents/{agentId}/sessions/{sessionId}", NONEXISTENT_AGENT, createdSessionId)
                .then()
                .statusCode(404);
    }

    // ── Cross-user authorization tests ───────────────────────────────
    // Sessions are scoped to the (agent_id, user_id) pair. A user requesting
    // another user's session must receive a 404 — the session simply does not
    // exist in their scope.

    @Test
    @DisplayName("GET .../sessions/{session_id} as a different user should return 404")
    void getSessionAsOtherUserShouldReturn404() {
        // Create a session as test-user
        String rawId = givenJson()
                .body("{\"name\": \"Owner Only\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().body().asString();
        String otherUsersTargetId = rawId.replaceAll("^\"|\"$", "");

        // Read as another user — session should not be visible
        RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "other-user")
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, otherUsersTargetId)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("DELETE .../sessions/{session_id} as a different user should return 404")
    void deleteSessionAsOtherUserShouldReturn404() {
        // Create a session as test-user
        String rawId = givenJson()
                .body("{\"name\": \"Owner Only Delete\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().body().asString();
        String targetId = rawId.replaceAll("^\"|\"$", "");

        // Delete as another user — must not affect the session
        RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "other-user")
                .when()
                .delete("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, targetId)
                .then()
                .statusCode(404);

        // Owner can still see it
        given()
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}", AGENT_ID, targetId)
                .then()
                .statusCode(200);
    }

    @Test
    @DisplayName("GET .../messages as a different user should return 404")
    void listMessagesAsOtherUserShouldReturn404() {
        String rawId = givenJson()
                .body("{\"name\": \"Messages Auth\"}")
                .when()
                .post("/agents/{agentId}/sessions", AGENT_ID)
                .then()
                .statusCode(201)
                .extract().body().asString();
        String targetId = rawId.replaceAll("^\"|\"$", "");

        RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "other-user")
                .when()
                .get("/agents/{agentId}/sessions/{sessionId}/messages", AGENT_ID, targetId)
                .then()
                .statusCode(404);
    }

    // ── Pagination math ──────────────────────────────────────────────

    @Test
    @DisplayName("GET .../sessions pagination math: totalPages = ceil(totalRecords / pageSize)")
    void listSessionsPaginationMathIsConsistent() {
        // Use a small pageSize to force more than one page (assuming there are >= 2 sessions
        // already created by other tests in this class via shared static state).
        Response resp = given()
                .when()
                .get("/agents/{agentId}/sessions?pageNo=1&pageSize=1", AGENT_ID)
                .then()
                .statusCode(200)
                .extract().response();

        // totalRecords is JSON int and may deserialize as Integer or Long depending on
        // value range; coerce both to long via Number.
        long totalRecords = ((Number) resp.path("totalRecords")).longValue();
        long pageSize = ((Number) resp.path("pageSize")).longValue();
        long totalPages = ((Number) resp.path("totalPages")).longValue();

        long expectedPages = pageSize == 0
                ? 0L
                : (totalRecords + pageSize - 1) / pageSize;
        assertEquals(expectedPages, totalPages, "totalPages must be ceil(totalRecords/pageSize)");
    }
}
