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

import com.aliyun.tam.x.tron.BaseFuncTest;
import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Base class for REST API integration tests.
 * Provides REST Assured configuration and common helper methods.
 * Overrides DB reset to preserve data between API test methods.
 */
public abstract class BaseApiTest extends BaseFuncTest {

    @LocalServerPort
    private int port;

    /**
     * Override to skip DB reset between tests so that
     * ordered tests in the same class can share session/config state.
     */
    @Override
    public void prepareDbTables() throws Exception {
        // Skip per-test DB reset for API tests
    }

    @BeforeEach
    void setUpRestAssured() {
        RestAssured.port = port;
    }

    /**
     * Returns the base URI path prefix for API calls.
     * In test profile, the context-path is not set, so we use empty string.
     */
    protected String apiPath() {
        return "";
    }

    /**
     * Creates a request specification with the required X-User-Id header and base path.
     */
    protected RequestSpecification given() {
        return RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "test-user");
    }

    /**
     * Creates a request specification with the required X-User-Id header and base path,
     * including Content-Type application/json.
     */
    protected RequestSpecification givenJson() {
        return given()
                .contentType("application/json");
    }
}
