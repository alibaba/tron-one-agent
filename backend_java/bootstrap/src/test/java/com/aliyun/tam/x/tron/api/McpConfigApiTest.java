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
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static org.hamcrest.Matchers.*;

/**
 * API tests for MCP Client Config endpoints.
 */
@DisplayName("MCP Config API")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class McpConfigApiTest extends BaseApiTest {

    private static final String MCP_ID = "test-mcp-" + System.currentTimeMillis();
    private static final String NONEXISTENT_MCP = "nonexistent_mcp";

    // ── GET /control/mcps ─────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("GET /control/mcps should return MCP config list")
    void getMcpConfigsShouldReturn200() {
        given()
                .when()
                .get("/control/mcps")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue());
    }

    // ── POST /control/mcps ────────────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("POST /control/mcps should create MCP config")
    void createMcpConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "%s",
                            "name": "Test MCP",
                            "description": "A test MCP client",
                            "transport": "sse",
                            "url": "http://localhost:8080/sse",
                            "timeout": 30,
                            "enabled": true
                        }
                        """.formatted(MCP_ID))
                .when()
                .post("/control/mcps")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/mcps with minimal fields should create")
    void createMcpConfigMinimalShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "minimal-mcp",
                            "name": "Minimal MCP"
                        }
                        """)
                .when()
                .post("/control/mcps")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/mcps with empty body should return 500")
    void createMcpConfigEmptyBodyShouldReturn500() {
        givenJson()
                .body("{}")
                .when()
                .post("/control/mcps")
                .then()
                .statusCode(200)
                .body("code", equalTo(500));
    }

    // ── GET /control/mcps/{mcp_id} ────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("GET /control/mcps/{mcp_id} should return MCP config")
    void getMcpConfigShouldReturn200() {
        given()
                .when()
                .get("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data.id", equalTo(MCP_ID))
                .body("data.name", equalTo("Test MCP"));
    }

    @Test
    @DisplayName("GET /control/mcps/{mcp_id} with nonexistent MCP should return 404")
    void getMcpConfigWithNonexistentMcpShouldReturn404() {
        given()
                .when()
                .get("/control/mcps/{mcpId}", NONEXISTENT_MCP)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── PATCH /control/mcps/{mcp_id} ──────────────────────────────────

    @Test
    @Order(4)
    @DisplayName("PATCH /control/mcps/{mcp_id} should update MCP config")
    void patchMcpConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "name": "Updated MCP",
                            "description": "Updated description",
                            "timeout": 60
                        }
                        """)
                .when()
                .patch("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/mcps/{mcp_id} with transport update")
    void patchMcpConfigTransportShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "transport": "http",
                            "url": "http://localhost:8080/mcp"
                        }
                        """)
                .when()
                .patch("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/mcps/{mcp_id} with headers update")
    void patchMcpConfigHeadersShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "headers": {
                                "Authorization": "Bearer token123"
                            }
                        }
                        """)
                .when()
                .patch("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/mcps/{mcp_id} with enabled toggle")
    void patchMcpConfigEnabledShouldReturn200() {
        givenJson()
                .body("{\"enabled\": false}")
                .when()
                .patch("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/mcps/{mcp_id} with nonexistent MCP should return 404")
    void patchMcpConfigWithNonexistentMcpShouldReturn404() {
        givenJson()
                .body("{\"name\": \"Test\"}")
                .when()
                .patch("/control/mcps/{mcpId}", NONEXISTENT_MCP)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── DELETE /control/mcps/{mcp_id} ─────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("DELETE /control/mcps/{mcp_id} should delete MCP config")
    void deleteMcpConfigShouldReturn200() {
        given()
                .when()
                .delete("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));

        // Verify it's deleted
        given()
                .when()
                .get("/control/mcps/{mcpId}", MCP_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(404));
    }

    @Test
    @DisplayName("DELETE /control/mcps/{mcp_id} with nonexistent MCP should still return 200")
    void deleteMcpConfigWithNonexistentMcpShouldReturn200() {
        given()
                .when()
                .delete("/control/mcps/{mcpId}", NONEXISTENT_MCP)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }
}
