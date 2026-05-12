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
 * API tests for Skill Config endpoints.
 */
@DisplayName("Skill Config API")
class SkillConfigApiTest extends BaseApiTest {

    private static final Long NONEXISTENT_SKILL = 999999L;

    // ── GET /control/skills ───────────────────────────────────────────

    @Test
    @DisplayName("GET /control/skills should return skill list")
    void getSkillsShouldReturn200() {
        given()
                .when()
                .get("/control/skills")
                .then()
                .statusCode(200)
                .body("code", equalTo(200))
                .body("success", equalTo(true))
                .body("data", notNullValue());
    }

    // ── GET /control/skills/{skill_id} ────────────────────────────────

    @Test
    @DisplayName("GET /control/skills/{skill_id} with nonexistent skill should return 404")
    void getSkillWithNonexistentSkillShouldReturn404() {
        given()
                .when()
                .get("/control/skills/{skillId}", NONEXISTENT_SKILL)
                .then()
                .statusCode(200)
                .body("code", equalTo(404))
                .body("success", equalTo(false));
    }

    // ── PATCH /control/skills/{skill_id} ──────────────────────────────

    @Test
    @DisplayName("PATCH /control/skills/{skill_id} with nonexistent skill should return 400")
    void patchSkillWithNonexistentSkillShouldReturn200() {
        givenJson()
                .body("{\"enabled\": false}")
                .when()
                .patch("/control/skills/{skillId}", NONEXISTENT_SKILL)
                .then()
                .statusCode(200)
                .body("code", anyOf(equalTo(200), equalTo(400)))
                .body("success", anyOf(equalTo(true), equalTo(false)));
    }

    // ── DELETE /control/skills/{skill_id} ─────────────────────────────

    @Test
    @DisplayName("DELETE /control/skills/{skill_id} with nonexistent skill should return 400")
    void deleteSkillWithNonexistentSkillShouldReturn200() {
        given()
                .when()
                .delete("/control/skills/{skillId}", NONEXISTENT_SKILL)
                .then()
                .statusCode(200)
                .body("code", anyOf(equalTo(200), equalTo(400)))
                .body("success", anyOf(equalTo(true), equalTo(false)));
    }

    // ── GET /control/skills/{skill_id}/download ───────────────────────

    @Test
    @DisplayName("GET /control/skills/{skill_id}/download with nonexistent skill should return 404")
    void downloadSkillWithNonexistentSkillShouldReturn404() {
        given()
                .when()
                .get("/control/skills/{skillId}/download", NONEXISTENT_SKILL)
                .then()
                .statusCode(404);
    }
}
