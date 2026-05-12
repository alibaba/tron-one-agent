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
 * API tests for Knowledge Base Config endpoints.
 */
@DisplayName("Knowledge Base Config API")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class KnowledgeBaseConfigApiTest extends BaseApiTest {

    private static final String KB_ID = "test-kb-" + System.currentTimeMillis();
    private static final String NONEXISTENT_KB = "nonexistent_kb";

    // ── GET /control/kb ───────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("GET /control/kb should return KB config list")
    void getKbConfigsShouldReturn200() {
        given()
                .when()
                .get("/control/kb")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue());
    }

    // ── POST /control/kb ──────────────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("POST /control/kb should create Bailian KB config")
    void createKbConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "%s",
                            "name": "Test KB",
                            "type": "1",
                            "workspaceId": "ws-test-001",
                            "indexId": "idx-test-001",
                            "enabled": true,
                            "enableRewrite": true,
                            "enableRerank": true
                        }
                        """.formatted(KB_ID))
                .when()
                .post("/control/kb")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/kb with minimal fields should create")
    void createKbConfigMinimalShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "minimal-kb",
                            "name": "Minimal KB",
                            "type": "1"
                        }
                        """)
                .when()
                .post("/control/kb")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/kb with ElasticSearch type")
    void createKbConfigElasticSearchShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "es-kb",
                            "name": "ElasticSearch KB",
                            "type": "2"
                        }
                        """)
                .when()
                .post("/control/kb")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/kb with empty body should return 500")
    void createKbConfigEmptyBodyShouldReturn500() {
        givenJson()
                .body("{}")
                .when()
                .post("/control/kb")
                .then()
                .statusCode(200)
                .body("code", equalTo(500));
    }

    // ── GET /control/kb/{kb_id} ───────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("GET /control/kb/{kb_id} should return KB config")
    void getKbConfigShouldReturn200() {
        given()
                .when()
                .get("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data.id", equalTo(KB_ID))
                .body("data.name", equalTo("Test KB"));
    }

    @Test
    @DisplayName("GET /control/kb/{kb_id} with nonexistent KB should return 404")
    void getKbConfigWithNonexistentKbShouldReturn404() {
        given()
                .when()
                .get("/control/kb/{kbId}", NONEXISTENT_KB)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── PATCH /control/kb/{kb_id} ─────────────────────────────────────

    @Test
    @Order(4)
    @DisplayName("PATCH /control/kb/{kb_id} should update KB config")
    void patchKbConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "name": "Updated KB",
                            "enableRewrite": false,
                            "enableRerank": false
                        }
                        """)
                .when()
                .patch("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/kb/{kb_id} with workspace_id and index_id")
    void patchKbConfigBailianFieldsShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "workspaceId": "ws-updated",
                            "indexId": "idx-updated"
                        }
                        """)
                .when()
                .patch("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/kb/{kb_id} with enabled toggle")
    void patchKbConfigEnabledShouldReturn200() {
        givenJson()
                .body("{\"enabled\": false}")
                .when()
                .patch("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/kb/{kb_id} with nonexistent KB should return 404")
    void patchKbConfigWithNonexistentKbShouldReturn404() {
        givenJson()
                .body("{\"name\": \"Test\"}")
                .when()
                .patch("/control/kb/{kbId}", NONEXISTENT_KB)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── DELETE /control/kb/{kb_id} ────────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("DELETE /control/kb/{kb_id} should delete KB config")
    void deleteKbConfigShouldReturn200() {
        given()
                .when()
                .delete("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));

        // Verify it's deleted
        given()
                .when()
                .get("/control/kb/{kbId}", KB_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(404));
    }

    @Test
    @DisplayName("DELETE /control/kb/{kb_id} with nonexistent KB should still return 200")
    void deleteKbConfigWithNonexistentKbShouldReturn200() {
        given()
                .when()
                .delete("/control/kb/{kbId}", NONEXISTENT_KB)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }
}
