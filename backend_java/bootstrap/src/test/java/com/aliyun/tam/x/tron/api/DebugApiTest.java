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
 * API tests for Debug endpoints.
 */
@DisplayName("Debug API")
class DebugApiTest extends BaseApiTest {

    private static final String NONEXISTENT_TOOL = "nonexistent_tool";
    private static final String NONEXISTENT_MCP = "nonexistent_mcp_client";
    private static final String NONEXISTENT_KB = "nonexistent_knowledge_base";

    // ── GET /debug/tools/{tool_name}/schema ────────────────────────────

    @Test
    @DisplayName("GET /debug/tools/{tool_name}/schema with nonexistent tool should return 404")
    void getToolSchemaWithNonexistentToolShouldReturn404() {
        given()
                .when()
                .get("/debug/tools/{toolName}/schema", NONEXISTENT_TOOL)
                .then()
                .statusCode(404);
    }

    // ── POST /debug/tools/{tool_name} ─────────────────────────────────

    @Test
    @DisplayName("POST /debug/tools/{tool_name} with nonexistent tool should return 404")
    void debugToolWithNonexistentToolShouldReturn404() {
        givenJson()
                .body("{\"input\": \"test\"}")
                .when()
                .post("/debug/tools/{toolName}", NONEXISTENT_TOOL)
                .then()
                .statusCode(404);
    }

    // ── GET /debug/mcp/{client_id}/tools ──────────────────────────────

    @Test
    @DisplayName("GET /debug/mcp/{client_id}/tools with nonexistent client should return 404")
    void getMcpToolsWithNonexistentClientShouldReturn404() {
        given()
                .when()
                .get("/debug/mcp/{clientId}/tools", NONEXISTENT_MCP)
                .then()
                .statusCode(404);
    }

    // ── POST /debug/mcp/{client_id}/tools/{func_name} ─────────────────

    @Test
    @DisplayName("POST /debug/mcp/{client_id}/tools/{func_name} with nonexistent client should return 404")
    void debugMcpToolWithNonexistentClientShouldReturn404() {
        givenJson()
                .body("{\"input\": \"test\"}")
                .when()
                .post("/debug/mcp/{clientId}/tools/{funcName}", NONEXISTENT_MCP, "test_func")
                .then()
                .statusCode(404);
    }

    // ── POST /debug/knowledge_base/{knowledge_base_id} ────────────────

    @Test
    @DisplayName("POST /debug/knowledge_base/{kb_id} with nonexistent KB should return 404")
    void debugKnowledgeBaseWithNonexistentKbShouldReturn404() {
        givenJson()
                .body("{\"query\": \"test query\"}")
                .when()
                .post("/debug/knowledge_base/{kbId}", NONEXISTENT_KB)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("POST /debug/knowledge_base/{kb_id} without query field should return 404")
    void debugKnowledgeBaseWithEmptyQueryShouldReturn404() {
        givenJson()
                .body("{}")
                .when()
                .post("/debug/knowledge_base/{kbId}", NONEXISTENT_KB)
                .then()
                .statusCode(404);
    }
}
