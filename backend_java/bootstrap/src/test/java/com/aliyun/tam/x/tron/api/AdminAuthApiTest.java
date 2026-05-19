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

import com.aliyun.tam.x.tron.core.domain.service.AdminService;
import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DisplayName("Admin Auth & Management API")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminAuthApiTest extends BaseApiTest {

    @Autowired
    private AdminService adminService;

    private static String authToken;

    @Override
    public void prepareDbTables() throws Exception {
        adminService.init();
    }

    // ── POST /auth/login ──────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /auth/login with valid credentials should return token")
    void loginWithValidCredentials() {
        Response response = givenJson()
                .body("{\"username\": \"admin\", \"password\": \"admin@123\"}")
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("success", equalTo(true))
                .body("data.token", notNullValue())
                .body("data.username", equalTo("admin"))
                .extract().response();

        authToken = response.jsonPath().getString("data.token");
        assertNotNull(authToken);
    }

    @Test
    @Order(2)
    @DisplayName("POST /auth/login with wrong password should fail")
    void loginWithWrongPassword() {
        givenJson()
                .body("{\"username\": \"admin\", \"password\": \"wrongpassword\"}")
                .when()
                .post("/auth/login")
                .then()
                .body("success", equalTo(false));
    }

    @Test
    @Order(3)
    @DisplayName("POST /auth/login with nonexistent user should fail")
    void loginWithNonexistentUser() {
        givenJson()
                .body("{\"username\": \"nonexistent\", \"password\": \"test\"}")
                .when()
                .post("/auth/login")
                .then()
                .body("success", equalTo(false));
    }

    // ── GET /control/admins (auth required) ───────────────────────────

    @Test
    @Order(4)
    @DisplayName("GET /control/admins without token should return 401")
    void listAdminsWithoutTokenReturns401() {
        givenJsonNoAuth()
                .when()
                .get("/control/admins")
                .then()
                .statusCode(401);
    }

    @Test
    @Order(5)
    @DisplayName("GET /control/admins with valid token should return admin list")
    void listAdminsWithToken() {
        givenJson()
                .when()
                .get("/control/admins")
                .then()
                .statusCode(200)
                .body("success", equalTo(true))
                .body("data.size()", greaterThanOrEqualTo(1))
                .body("data[0].username", equalTo("admin"));
    }

    // ── POST /control/admins (create admin) ───────────────────────────

    @Test
    @Order(6)
    @DisplayName("POST /control/admins should create a new admin")
    void createAdmin() {
        givenJson()
                .body("{\"username\": \"testadmin\", \"password\": \"test@123\"}")
                .when()
                .post("/control/admins")
                .then()
                .statusCode(200)
                .body("success", equalTo(true));
    }

    @Test
    @Order(7)
    @DisplayName("POST /control/admins with duplicate username should fail")
    void createDuplicateAdmin() {
        givenJson()
                .body("{\"username\": \"testadmin\", \"password\": \"test@456\"}")
                .when()
                .post("/control/admins")
                .then()
                .body("success", equalTo(false));
    }

    // ── PUT /control/admins/{username} (update password) ──────────────

    @Test
    @Order(8)
    @DisplayName("PUT /control/admins/{username} should update password")
    void updateAdminPassword() {
        givenJson()
                .body("{\"password\": \"newpass@123\"}")
                .when()
                .put("/control/admins/testadmin")
                .then()
                .statusCode(200)
                .body("success", equalTo(true));
    }

    @Test
    @Order(9)
    @DisplayName("POST /auth/login with updated password should succeed")
    void loginWithUpdatedPassword() {
        givenJson()
                .body("{\"username\": \"testadmin\", \"password\": \"newpass@123\"}")
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("success", equalTo(true))
                .body("data.token", notNullValue());
    }

    // ── DELETE /control/admins/{username} ──────────────────────────────

    @Test
    @Order(10)
    @DisplayName("DELETE /control/admins/admin should be rejected")
    void deleteDefaultAdminShouldFail() {
        givenJson()
                .when()
                .delete("/control/admins/admin")
                .then()
                .body("success", equalTo(false));
    }

    @Test
    @Order(11)
    @DisplayName("DELETE /control/admins/{username} should delete non-default admin")
    void deleteNonDefaultAdmin() {
        givenJson()
                .when()
                .delete("/control/admins/testadmin")
                .then()
                .statusCode(200)
                .body("success", equalTo(true));
    }

    // ── GET /auth/me ──────────────────────────────────────────────────

    @Test
    @Order(12)
    @DisplayName("GET /auth/me should return current admin info")
    void getMeWithToken() {
        givenJson()
                .when()
                .get("/auth/me")
                .then()
                .statusCode(200)
                .body("success", equalTo(true))
                .body("data.username", equalTo("admin"));
    }

    // ── Existing endpoints require auth ───────────────────────────────

    @Test
    @Order(13)
    @DisplayName("GET /control/agents without token should return 401")
    void existingEndpointRequiresAuth() {
        givenJsonNoAuth()
                .when()
                .get("/control/agents")
                .then()
                .statusCode(401);
    }
}
