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
import com.aliyun.tam.x.tron.api.auth.JwtUtils;
import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Base class for REST API integration tests.
 * Provides REST Assured configuration and common helper methods.
 * Overrides DB reset to preserve data between API test methods.
 */
public abstract class BaseApiTest extends BaseFuncTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    public void prepareDbTables() throws Exception {
        // Skip per-test DB reset for API tests
    }

    @BeforeEach
    void setUpRestAssured() {
        RestAssured.port = port;
    }

    protected String apiPath() {
        return "";
    }

    protected RequestSpecification given() {
        String token = jwtUtils.generateToken("admin");
        return RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "test-user")
                .header("Authorization", "Bearer " + token);
    }

    protected RequestSpecification givenJson() {
        return given()
                .contentType("application/json");
    }

    protected RequestSpecification givenNoAuth() {
        return RestAssured.given()
                .basePath(apiPath())
                .header("X-User-Id", "test-user");
    }

    protected RequestSpecification givenJsonNoAuth() {
        return givenNoAuth()
                .contentType("application/json");
    }
}
