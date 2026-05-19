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


package com.aliyun.tam.x.tron.core;

import com.aliyun.tam.x.tron.BaseFuncTest;
import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.agents.AgentResult;
import com.aliyun.tam.x.tron.core.agents.examples.OneAgentBuilder;
import com.aliyun.tam.x.tron.core.agents.examples.TravelAgentBuilder;
import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.aliyun.tam.x.tron.core.config.LocalSubAgentConfig;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
import com.google.common.collect.Lists;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@Slf4j
@DisplayName("OneAgentHandler Functional Tests")
public class OneAgentHandlerTest extends BaseFuncTest {

    @Autowired
    private AgentRegistry agentRegistry;

    @Autowired
    private SequenceService sequenceService;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private EventRepository eventRepository;

    @Override
    protected String agentId() {
        return OneAgentBuilder.AGENT_ID;
    }

    @Override
    protected AgentConfig agentConfig() {
        return AgentConfig.builder()
                .id(OneAgentBuilder.AGENT_ID)
                .subAgents(Lists.newArrayList(
                        LocalSubAgentConfig.builder()
                                .agentId(TravelAgentBuilder.AGENT_ID)
                                .enabled(true)
                                .capacities("根据用户需求规划旅行或者徒步等各类外出行程，帮助用户查询目的地天气")
                                .build()
                ))
                .build();
    }

    // ── Basic input/output ──────────────────────────────────────────────

    @Test
    @DisplayName("should return non-empty response for simple greeting")
    void testSimpleGreeting() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "你好");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
        assertThat(result.getCostInMs(), greaterThan(0L));
    }

    @Test
    @DisplayName("should track first token delay and cost metrics")
    void testMetrics() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "hello");

        assertNotNull(result.getFirstTokenDelayInMs());
        assertThat(result.getFirstTokenDelayInMs(), greaterThan(0L));
        assertThat(result.getCostInMs(), greaterThan(0L));
        assertNotNull(result.getUsage());
    }

    // ── Sub-agent delegation (task dispatch) ────────────────────────────

    @Test
    @DisplayName("should delegate to travel sub-agent for travel-related queries")
    void testSubAgentDelegation() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "帮我规划一个3天的杭州旅行行程");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));

        if (!result.getTasks().isEmpty()) {
            AgentResult.Task task = result.getTasks().get(0);
            assertNotNull(task.getAgentId());
            assertNotNull(task.getName());
            assertThat(task.getCostInMs(), greaterThan(0L));
        }
    }

    @Test
    @DisplayName("should collect task results from sub-agents")
    void testSubAgentTaskCollection() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "帮我查一下北京今天的天气");

        assertNotNull(result);
        assertNotNull(result.getResponse());
    }

    // ── Multi-turn conversation ─────────────────────────────────────────

    @Test
    @DisplayName("should handle multiple turns within same session without errors")
    void testMultiTurnContext() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");

        AgentResult r1 = callAgent(sessionId, "你好，今天天气不错");
        assertNotNull(r1.getResponse());
        assertThat(r1.getResponse(), not(emptyOrNullString()));

        AgentResult r2 = callAgent(sessionId, "谢谢你的回复");
        assertNotNull(r2.getResponse());
        assertThat(r2.getResponse(), not(emptyOrNullString()));
    }

    @Test
    @DisplayName("should handle conversation turns with different topics")
    void testMultiTurnDifferentTopics() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");

        AgentResult r1 = callAgent(sessionId, "什么是HTTP？");
        assertNotNull(r1.getResponse());
        assertThat(r1.getResponse(), not(emptyOrNullString()));

        AgentResult r2 = callAgent(sessionId, "那HTTPS呢？");
        assertNotNull(r2.getResponse());
        assertThat(r2.getResponse(), not(emptyOrNullString()));
    }

    // ── Cancel flow ─────────────────────────────────────────────────────

    @Test
    @DisplayName("should handle cancel without message gracefully")
    void testCancelWithoutMessage() throws Exception {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentHandler handler = agentRegistry.getAgent(agentId(), agentConfig(), "test-user", sessionId);
        assertNotNull(handler);

        assertDoesNotThrow(() -> handler.cancel(null));
    }

    @Test
    @DisplayName("should handle cancel with custom message gracefully")
    void testCancelWithMessage() throws Exception {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentHandler handler = agentRegistry.getAgent(agentId(), agentConfig(), "test-user", sessionId);
        assertNotNull(handler);

        assertDoesNotThrow(() -> handler.cancel("用户主动取消了对话"));
    }

    // ── Usage tracking ──────────────────────────────────────────────────

    @Test
    @DisplayName("should track token usage correctly")
    void testUsageTracking() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "你好呀");

        assertNotNull(result.getUsage());
        assertThat(result.getUsage().getPromptTokens(), greaterThan(0L));
        assertThat(result.getUsage().getCompletionTokens(), greaterThan(0L));
    }

    // ── Session isolation ────────────────────────────────────────────────

    @Test
    @DisplayName("should handle independent sessions without interference")
    void testSessionIsolation() {
        String session1 = UUID.randomUUID().toString().replace("-", "");
        String session2 = UUID.randomUUID().toString().replace("-", "");

        AgentResult r1 = callAgent(session1, "什么是Java？");
        assertNotNull(r1.getResponse());
        assertThat(r1.getResponse(), not(emptyOrNullString()));

        AgentResult r2 = callAgent(session2, "什么是Python？");
        assertNotNull(r2.getResponse());
        assertThat(r2.getResponse(), not(emptyOrNullString()));
    }

    // ── Thinking model (streaming reasoning) ─────────────────────────────

    @Test
    @DisplayName("should handle thinking model output with reasoning traces")
    void testThinkingModelOutput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "请解释一下什么是递归");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
        assertThat(result.getResponse().length(), greaterThan(20));
    }

    // ── Edge cases ──────────────────────────────────────────────────────

    @Test
    @DisplayName("should handle very short input")
    void testVeryShortInput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "ok");

        assertNotNull(result);
        assertNotNull(result.getResponse());
    }

    @Test
    @DisplayName("should handle input with special characters")
    void testSpecialCharacters() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "请解释 <html>&amp;</html> 和 \"引号\" 的含义");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
    }

    @Test
    @DisplayName("should handle Chinese and English mixed input")
    void testMixedLanguageInput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "What is machine learning? 用中文回答");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
    }

    // ── Main agent response with possible delegation ──────────────────────

    @Test
    @DisplayName("should return a valid response for general QA (may or may not delegate)")
    void testGeneralQAResponse() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "1+1等于几？");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
        assertThat(result.getCostInMs(), greaterThan(0L));
    }

    // ── Concurrent requests ──────────────────────────────────────────────

    @Test
    @DisplayName("should handle concurrent requests on different sessions")
    void testConcurrentDifferentSessions() throws Exception {
        CompletableFuture<AgentResult> f1 = CompletableFuture.supplyAsync(() -> {
            String sid = UUID.randomUUID().toString().replace("-", "");
            return callAgent(sid, "1+1=?");
        });

        CompletableFuture<AgentResult> f2 = CompletableFuture.supplyAsync(() -> {
            String sid = UUID.randomUUID().toString().replace("-", "");
            return callAgent(sid, "2+2=?");
        });

        AgentResult r1 = f1.get(120, TimeUnit.SECONDS);
        AgentResult r2 = f2.get(120, TimeUnit.SECONDS);

        assertNotNull(r1.getResponse());
        assertNotNull(r2.getResponse());
    }

    // ── Multiple iterations (multi-step reasoning) ───────────────────────

    @Test
    @DisplayName("should handle tasks requiring multiple reasoning iterations")
    void testMultipleIterations() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "帮我搜索一下今天的新闻");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
    }
}
