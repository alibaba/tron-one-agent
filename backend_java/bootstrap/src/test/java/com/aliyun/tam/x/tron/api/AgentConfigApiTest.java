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
 * API tests for Agent Config endpoints.
 */
@DisplayName("Agent Config API")
class AgentConfigApiTest extends BaseApiTest {

    private static final String AGENT_ID = "one_agent";
    private static final String NONEXISTENT_AGENT = "nonexistent_agent";

    // ── GET /control/agents ───────────────────────────────────────────

    @Test
    @DisplayName("GET /control/agents should return agent list")
    void getAgentConfigsShouldReturn200() {
        given()
                .when()
                .get("/control/agents")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue())
                .body("data.size()", greaterThanOrEqualTo(1));
    }

    // ── GET /control/agents/{agent_id} ─────────────────────────────────

    @Test
    @DisplayName("GET /control/agents/{agent_id} should return agent config")
    void getAgentConfigShouldReturn200() {
        given()
                .when()
                .get("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue())
                .body("data.id", equalTo(AGENT_ID))
                .body("data.name", notNullValue())
                .body("data.enabled", notNullValue());
    }

    @Test
    @DisplayName("GET /control/agents/{agent_id} with nonexistent agent should return 404")
    void getAgentConfigWithNonexistentAgentShouldReturn404() {
        given()
                .when()
                .get("/control/agents/{agentId}", NONEXISTENT_AGENT)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false))
                .body("message", equalTo("not found"));
    }

    // ── PATCH /control/agents/{agent_id} ──────────────────────────────

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} should update agent name")
    void patchAgentConfigNameShouldReturn200() {
        givenJson()
                .body("{\"name\": \"Updated Agent Name\"}")
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data.name", equalTo("Updated Agent Name"));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} should update multiple fields")
    void patchAgentConfigMultipleFieldsShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "name": "Multi Update",
                            "systemPrompt": "You are a helpful assistant.",
                            "maxIters": 5
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data.name", equalTo("Multi Update"))
                .body("data.maxIters", equalTo(5));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with empty body should succeed")
    void patchAgentConfigEmptyBodyShouldReturn200() {
        givenJson()
                .body("{}")
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with chatModel config")
    void patchAgentConfigChatModelShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "chatModel": {
                                "type": 2,
                                "modelName": "qwen-plus",
                                "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
                                "stream": true
                            }
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with tools config")
    void patchAgentConfigToolsShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "tools": [
                                {"name": "calculator", "enabled": true}
                            ]
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with skills config")
    void patchAgentConfigSkillsShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "skills": [
                                {"name": "weather", "enabled": true}
                            ]
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with long-term memory config")
    void patchAgentConfigMemoryShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "longTermMemoryMode": "BOTH",
                            "longTermMemoryId": "test-memory-id"
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with subAgents config")
    void patchAgentConfigSubAgentsShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "subAgents": [
                                {"type": "1", "agentId": "travel_agent", "enabled": true}
                            ]
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with knowledgeBases config")
    void patchAgentConfigKnowledgeBasesShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "knowledgeBases": [
                                {
                                    "knowledgeId": "test-kb-id",
                                    "enabled": true,
                                    "mode": "AGENTIC"
                                }
                            ]
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/agents/{agent_id} with nonexistent agent should return 404")
    void patchAgentConfigWithNonexistentAgentShouldReturn404() {
        givenJson()
                .body("{\"name\": \"Test\"}")
                .when()
                .patch("/control/agents/{agentId}", NONEXISTENT_AGENT)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    /**
     * Verifies the patch is persisted: a follow-up GET must return the patched fields.
     */
    @Test
    @DisplayName("PATCH /control/agents/{agent_id} persists name across requests")
    void patchAgentConfigPersistsName() {
        String newName = "Persisted Name " + System.currentTimeMillis();
        givenJson()
                .body("{\"name\": \"" + newName + "\"}")
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("data.name", equalTo(newName));

        // Read back via GET — name must match
        given()
                .when()
                .get("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("data.name", equalTo(newName));
    }

    /**
     * PATCH must be partial: patching one field must not reset other fields.
     */
    @Test
    @DisplayName("PATCH /control/agents/{agent_id} is partial — does not clobber unmentioned fields")
    void patchAgentConfigIsPartial() {
        // Step 1: set systemPrompt and maxIters explicitly.
        givenJson()
                .body("""
                        {
                            "systemPrompt": "Initial prompt",
                            "maxIters": 7
                        }
                        """)
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("data.maxIters", equalTo(7));

        // Step 2: patch only the name.
        String newName = "Partial Patch " + System.currentTimeMillis();
        givenJson()
                .body("{\"name\": \"" + newName + "\"}")
                .when()
                .patch("/control/agents/{agentId}", AGENT_ID)
                .then()
                .statusCode(200)
                .body("data.name", equalTo(newName))
                // Unmentioned fields must be preserved.
                .body("data.systemPrompt", equalTo("Initial prompt"))
                .body("data.maxIters", equalTo(7));
    }
}
