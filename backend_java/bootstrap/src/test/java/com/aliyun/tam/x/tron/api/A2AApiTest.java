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

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * API tests for A2A (Agent-to-Agent) endpoints.
 */
@DisplayName("A2A API")
class A2AApiTest extends BaseApiTest {

    private static final String AGENT_ID = "simple_agent";
    private static final String NONEXISTENT_AGENT = "nonexistent_agent";

    // ── GET /a2a/{agent_id}/.well-known/agent-card.json ───────────────

    @Test
    @DisplayName("GET agent-card should return 200 for valid agent")
    void getAgentCardShouldReturn200() {
        given()
                .when()
                .get("/a2a/{agentId}/.well-known/agent-card.json", AGENT_ID)
                .then()
                .statusCode(200)
                .body("name", notNullValue())
                .body("url", notNullValue());
    }

    @Test
    @DisplayName("GET agent-card with nonexistent agent should return 404")
    void getAgentCardWithNonexistentAgentShouldReturn404() {
        given()
                .when()
                .get("/a2a/{agentId}/.well-known/agent-card.json", NONEXISTENT_AGENT)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("GET agent-card for agent without A2A support should return 404")
    void getAgentCardForNonA2AAgentShouldReturn404() {
        given()
                .when()
                .get("/a2a/{agentId}/.well-known/agent-card.json", "travel_react_agent")
                .then()
                .statusCode(404);
    }

    // ── POST /a2a/{agent_id}/ ─────────────────────────────────────────

    @Test
    @DisplayName("POST A2A JSON-RPC tasks/send should return 200")
    void a2aJsonRpcTasksSendShouldReturn200() {
        String body = """
                {
                    "jsonrpc": "2.0",
                    "method": "tasks/send",
                    "params": {
                        "id": "task-001",
                        "message": {
                            "role": "user",
                            "parts": [{"type": "text", "text": "Hello"}]
                        }
                    },
                    "id": "1"
                }
                """;

        givenJson()
                .body(body)
                .when()
                .post("/a2a/{agentId}/", AGENT_ID)
                .then()
                .statusCode(200)
                .body("jsonrpc", equalTo("2.0"))
                .body("id", notNullValue());
    }

    @Test
    @DisplayName("POST A2A JSON-RPC with nonexistent agent should return 404")
    void a2aJsonRpcWithNonexistentAgentShouldReturn404() {
        givenJson()
                .body("{\"jsonrpc\":\"2.0\",\"method\":\"tasks/send\",\"id\":\"1\"}")
                .when()
                .post("/a2a/{agentId}/", NONEXISTENT_AGENT)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("POST A2A JSON-RPC with invalid JSON should return 200 with JSON-RPC error body")
    void a2aJsonRpcWithInvalidJsonShouldReturn200WithError() {
        givenJson()
                .body("not valid json at all {{{")
                .when()
                .post("/a2a/{agentId}/", AGENT_ID)
                .then()
                .statusCode(200)
                .body("jsonrpc", equalTo("2.0"))
                .body("error", notNullValue())
                .body("error.code", notNullValue())
                .body("error.message", notNullValue());
    }

    @Test
    @DisplayName("POST A2A JSON-RPC tasks/sendSubscribe should return 200")
    void a2aJsonRpcTasksSendSubscribeShouldReturn200() {
        String body = """
                {
                    "jsonrpc": "2.0",
                    "method": "tasks/sendSubscribe",
                    "params": {
                        "id": "task-002",
                        "message": {
                            "role": "user",
                            "parts": [{"type": "text", "text": "Hello"}]
                        }
                    },
                    "id": "2"
                }
                """;

        givenJson()
                .body(body)
                .when()
                .post("/a2a/{agentId}/", AGENT_ID)
                .then()
                .statusCode(200)
                .body("jsonrpc", equalTo("2.0"));
    }

    @Test
    @DisplayName("POST A2A JSON-RPC tasks/get returns JSON-RPC envelope")
    void a2aJsonRpcTasksGetShouldReturnEnvelope() {
        String body = """
                {
                    "jsonrpc": "2.0",
                    "method": "tasks/get",
                    "params": {
                        "id": "nonexistent-task"
                    },
                    "id": "3"
                }
                """;

        givenJson()
                .body(body)
                .when()
                .post("/a2a/{agentId}/", AGENT_ID)
                .then()
                .statusCode(200)
                .body("jsonrpc", equalTo("2.0"))
                .body("id", anyOf(equalTo("3"), equalTo(3)));
    }

    @Test
    @DisplayName("POST A2A JSON-RPC tasks/cancel returns JSON-RPC envelope")
    void a2aJsonRpcTasksCancelShouldReturnEnvelope() {
        String body = """
                {
                    "jsonrpc": "2.0",
                    "method": "tasks/cancel",
                    "params": {
                        "id": "nonexistent-task"
                    },
                    "id": "4"
                }
                """;

        givenJson()
                .body(body)
                .when()
                .post("/a2a/{agentId}/", AGENT_ID)
                .then()
                .statusCode(200)
                .body("jsonrpc", equalTo("2.0"))
                .body("id", anyOf(equalTo("4"), equalTo(4)));
    }

    @Test
    @DisplayName("Agent card body contains canonical A2A fields")
    void agentCardBodyShouldContainCanonicalFields() {
        given()
                .when()
                .get("/a2a/{agentId}/.well-known/agent-card.json", AGENT_ID)
                .then()
                .statusCode(200)
                .body("name", notNullValue())
                .body("url", notNullValue())
                .body("description", notNullValue());
    }
}
