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
 * API tests for Long-Term Memory Config endpoints.
 */
@DisplayName("Memory Config API")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MemoryConfigApiTest extends BaseApiTest {

    private static final String MEMORY_ID = "test-memory-" + System.currentTimeMillis();
    private static final String NONEXISTENT_MEMORY = "nonexistent_memory";

    // ── GET /control/memory ───────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("GET /control/memory should return memory config list")
    void getMemoryConfigsShouldReturn200() {
        given()
                .when()
                .get("/control/memory")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue());
    }

    // ── POST /control/memory ──────────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("POST /control/memory should create memory config")
    void createMemoryConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "%s",
                            "name": "Test Memory",
                            "type": "1",
                            "apiKey": "test-api-key",
                            "memoryLibraryId": "ml-test-001",
                            "projectId": "pj-test-001",
                            "enabled": true
                        }
                        """.formatted(MEMORY_ID))
                .when()
                .post("/control/memory")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/memory with minimal fields should create")
    void createMemoryConfigMinimalShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "id": "minimal-memory",
                            "name": "Minimal Memory",
                            "type": "1"
                        }
                        """)
                .when()
                .post("/control/memory")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("POST /control/memory with empty body should return 500")
    void createMemoryConfigEmptyBodyShouldReturn500() {
        givenJson()
                .body("{}")
                .when()
                .post("/control/memory")
                .then()
                .statusCode(200)
                .body("code", equalTo(500));
    }

    // ── GET /control/memory/{memory_id} ───────────────────────────────

    @Test
    @Order(3)
    @DisplayName("GET /control/memory/{memory_id} should return memory config")
    void getMemoryConfigShouldReturn200() {
        given()
                .when()
                .get("/control/memory/{memoryId}", MEMORY_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data.id", equalTo(MEMORY_ID))
                .body("data.name", equalTo("Test Memory"));
    }

    @Test
    @DisplayName("GET /control/memory/{memory_id} with nonexistent memory should return 404")
    void getMemoryConfigWithNonexistentMemoryShouldReturn404() {
        given()
                .when()
                .get("/control/memory/{memoryId}", NONEXISTENT_MEMORY)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── PATCH /control/memory/{memory_id} ─────────────────────────────

    @Test
    @Order(4)
    @DisplayName("PATCH /control/memory/{memory_id} should update memory config")
    void patchMemoryConfigShouldReturn200() {
        givenJson()
                .body("""
                        {
                            "name": "Updated Memory",
                            "type": "1",
                            "apiKey": "new-api-key",
                            "memoryLibraryId": "ml-updated",
                            "projectId": "pj-updated"
                        }
                        """)
                .when()
                .patch("/control/memory/{memoryId}", MEMORY_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @Order(4)
    @DisplayName("PATCH /control/memory/{memory_id} with enabled toggle")
    void patchMemoryConfigEnabledShouldReturn200() {
        givenJson()
                .body("{\"name\": \"Disabled Memory\", \"type\": \"1\", \"enabled\": false}")
                .when()
                .patch("/control/memory/{memoryId}", MEMORY_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }

    @Test
    @DisplayName("PATCH /control/memory/{memory_id} with nonexistent memory should return 404")
    void patchMemoryConfigWithNonexistentMemoryShouldReturn404() {
        givenJson()
                .body("{\"name\": \"Test\", \"type\": \"1\"}")
                .when()
                .patch("/control/memory/{memoryId}", NONEXISTENT_MEMORY)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── DELETE /control/memory/{memory_id} ────────────────────────────

    @Test
    @Order(5)
    @DisplayName("DELETE /control/memory/{memory_id} should delete memory config")
    void deleteMemoryConfigShouldReturn200() {
        given()
                .when()
                .delete("/control/memory/{memoryId}", MEMORY_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));

        // Verify it's deleted
        given()
                .when()
                .get("/control/memory/{memoryId}", MEMORY_ID)
                .then()
                .statusCode(200)
                .body("code", equalTo(404));
    }

    @Test
    @DisplayName("DELETE /control/memory/{memory_id} with nonexistent memory should still return 200")
    void deleteMemoryConfigWithNonexistentMemoryShouldReturn200() {
        given()
                .when()
                .delete("/control/memory/{memoryId}", NONEXISTENT_MEMORY)
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true));
    }
}
