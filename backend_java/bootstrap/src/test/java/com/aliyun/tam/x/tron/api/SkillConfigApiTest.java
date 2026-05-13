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

import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

    /**
     * The repository checks existence and throws IllegalArgumentException for missing
     * skills, which the ConfigController exception handler maps to code=400.
     * (Semantically a 404 would be more correct, but this pins the current contract.)
     */
    @Test
    @DisplayName("PATCH /control/skills/{skill_id} on nonexistent skill returns code=400 with 'not found' message")
    void patchSkillWithNonexistentSkillReturns400() {
        givenJson()
                .body("{\"enabled\": false}")
                .when()
                .patch("/control/skills/{skillId}", NONEXISTENT_SKILL)
                .then()
                .statusCode(200)
                .body("code", equalTo(400))
                .body("success", equalTo(false))
                .body("message", containsString("not found"));
    }

    // ── DELETE /control/skills/{skill_id} ─────────────────────────────

    /**
     * Delete on a missing skill throws IllegalArgumentException → code=400.
     */
    @Test
    @DisplayName("DELETE /control/skills/{skill_id} on nonexistent skill returns code=400 with 'not found' message")
    void deleteSkillWithNonexistentSkillReturns400() {
        given()
                .when()
                .delete("/control/skills/{skillId}", NONEXISTENT_SKILL)
                .then()
                .statusCode(200)
                .body("code", equalTo(400))
                .body("success", equalTo(false))
                .body("message", containsString("not found"));
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

    // ── POST /control/skills (multipart upload) ───────────────────────

    /**
     * Upload requires a file part. Missing the part should fail at Spring's
     * multipart binding and not reach the controller.
     */
    @Test
    @DisplayName("POST /control/skills without file part should fail")
    void uploadSkillWithoutFileShouldFail() {
        given()
                .contentType("multipart/form-data")
                .when()
                .post("/control/skills")
                .then()
                .statusCode(anyOf(is(400), is(500)));
    }

    /**
     * Upload with a malformed ZIP (no `skill.md` inside) is rejected by the parser
     * with IllegalArgumentException → ControlResponse.error(400).
     */
    @Test
    @DisplayName("POST /control/skills with ZIP missing skill.md should return code=400")
    void uploadSkillWithoutSkillMdShouldReturn400() throws Exception {
        byte[] zipBytes = buildZip(entry("readme.txt", "no skill metadata here"));
        given()
                .multiPart("file", "bad-skill.zip", zipBytes, "application/zip")
                .when()
                .post("/control/skills")
                .then()
                .statusCode(200)
                .body("code", equalTo(400))
                .body("success", equalTo(false))
                .body("message", containsString("skill.md"));
    }

    /**
     * Upload with a malformed skill.md (missing the `name` metadata) is rejected with 400.
     */
    @Test
    @DisplayName("POST /control/skills with skill.md missing 'name' should return code=400")
    void uploadSkillWithMissingNameShouldReturn400() throws Exception {
        // Body must start with `---`, contain YAML metadata, then `---`, then content.
        String skillMd = "---\ndescription: only description, no name\n---\nbody\n";
        byte[] zipBytes = buildZip(entry("skill.md", skillMd));
        given()
                .multiPart("file", "noname-skill.zip", zipBytes, "application/zip")
                .when()
                .post("/control/skills")
                .then()
                .statusCode(200)
                .body("code", equalTo(400))
                .body("success", equalTo(false));
    }

    // ── helpers ───────────────────────────────────────────────────────

    private static Entry entry(String path, String content) {
        return new Entry(path, content.getBytes());
    }

    private static byte[] buildZip(Entry... entries) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Entry e : entries) {
                ZipEntry ze = new ZipEntry(e.path);
                zos.putNextEntry(ze);
                zos.write(e.content);
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    private record Entry(String path, byte[] content) {
    }
}
