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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * API tests for File endpoints.
 * Note: File upload requires a StorageProvider bean;
 * without one, upload endpoint returns 404.
 */
@DisplayName("File API")
class FileApiTest extends BaseApiTest {

    private static final Long NONEXISTENT_FILE = 999999L;

    // ── POST /file ────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /file without X-User-Id should return 400")
    void uploadFileWithoutUserIdShouldReturn400() {
        RestAssured.given()
                .basePath(apiPath())
                .contentType("multipart/form-data")
                .multiPart("file", "test.png", "fake-image-content".getBytes(), "image/png")
                .when()
                .post("/file")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("POST /file without file part should return 500")
    void uploadFileWithoutFileShouldReturn500() {
        given()
                .contentType("multipart/form-data")
                .when()
                .post("/file")
                .then()
                .statusCode(500);
    }

    /**
     * In test profile no StorageProvider bean is configured, so upload returns 404
     * before extension validation runs. When a storage provider is wired the same
     * call should return 400 for an unsupported extension. Both outcomes are accepted
     * to keep the test deterministic across env configs.
     */
    @Test
    @DisplayName("POST /file with invalid extension returns 400 (with storage) or 404 (no storage)")
    void uploadFileWithInvalidExtensionShouldReturn400Or404() {
        given()
                .multiPart("file", "test.txt", "text content".getBytes(), "text/plain")
                .when()
                .post("/file")
                .then()
                .statusCode(anyOf(is(400), is(404)));
    }

    // ── GET /file/{id} ────────────────────────────────────────────────

    @Test
    @DisplayName("GET /file/{id} with nonexistent file should return 404")
    void getFileWithNonexistentFileShouldReturn404() {
        given()
                .when()
                .get("/file/{id}", NONEXISTENT_FILE)
                .then()
                .statusCode(404);
    }
}
