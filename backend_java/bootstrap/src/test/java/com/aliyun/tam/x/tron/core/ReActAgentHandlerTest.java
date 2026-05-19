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
import com.aliyun.tam.x.tron.core.agents.examples.SimpleAgentBuilder;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
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
@DisplayName("ReActAgentHandler Functional Tests")
public class ReActAgentHandlerTest extends BaseFuncTest {

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
        return SimpleAgentBuilder.AGENT_ID;
    }

    // ── Basic input/output ──────────────────────────────────────────────

    @Test
    @DisplayName("should return non-empty response for simple text input")
    void testSimpleTextInput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "1+1等于几？");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
        assertThat(result.getCostInMs(), greaterThan(0L));
        assertNotNull(result.getUsage());
    }

    @Test
    @DisplayName("should track first token delay metrics")
    void testFirstTokenDelay() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "hello");

        assertNotNull(result.getFirstTokenDelayInMs());
        assertThat(result.getFirstTokenDelayInMs(), greaterThan(0L));
    }

    // ── Tool use (calculator) ─────────────────────────────────────────

    @Test
    @DisplayName("should invoke calculator tool and return correct result")
    void testToolUseCalculator() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "请用计算器工具计算 123 * 456");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), containsString("56088"));
        assertThat(result.getActions(), not(empty()));

        AgentResult.Action calcAction = result.getActions().stream()
                .filter(a -> a.getName() != null && a.getName().contains("calculator"))
                .findFirst()
                .orElse(null);
        assertNotNull(calcAction, "Should have a calculator action");
        assertThat(calcAction.getCostInMs(), greaterThan(0L));
    }

    @Test
    @DisplayName("should record action metrics when tools are used")
    void testActionMetrics() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "请使用计算器工具计算 99+1，必须用工具");

        assertNotNull(result.getActions());
        assertThat(result.getActions(), not(empty()));
        AgentResult.Action action = result.getActions().get(0);
        assertNotNull(action.getId());
        assertNotNull(action.getName());
        assertThat(action.getCostInMs(), greaterThanOrEqualTo(0L));
    }

    // ── Multi-turn conversation ─────────────────────────────────────────

    @Test
    @DisplayName("should handle multiple turns within same session without errors")
    void testMultiTurnConversation() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");

        AgentResult result1 = callAgent(sessionId, "你好，今天天气不错");
        assertNotNull(result1.getResponse());
        assertThat(result1.getResponse(), not(emptyOrNullString()));

        AgentResult result2 = callAgent(sessionId, "谢谢你的回复");
        assertNotNull(result2.getResponse());
        assertThat(result2.getResponse(), not(emptyOrNullString()));
    }

    @Test
    @DisplayName("should handle multiple consecutive turns with tool use")
    void testMultipleConsecutiveTurns() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");

        AgentResult r1 = callAgent(sessionId, "用计算器算 10+20");
        assertNotNull(r1.getResponse());
        assertThat(r1.getResponse(), containsString("30"));

        AgentResult r2 = callAgent(sessionId, "用计算器算 100*3");
        assertNotNull(r2.getResponse());
        assertThat(r2.getResponse(), containsString("300"));
    }

    // ── Cancel flow ─────────────────────────────────────────────────────

    @Test
    @DisplayName("should handle cancel without message")
    void testCancelWithoutMessage() throws Exception {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentHandler handler = agentRegistry.getAgent(agentId(), null, "test-user", sessionId);
        assertNotNull(handler);

        CompletableFuture<AgentResult> future = CompletableFuture.supplyAsync(() ->
                callAgent(sessionId, "请直接回答：从1写到10000，每个数字一行，不要省略任何数字")
        );

        Thread.sleep(1500);
        handler.cancel(null);

        AgentResult result = future.get(60, TimeUnit.SECONDS);
        assertNotNull(result);
    }

    @Test
    @DisplayName("should handle cancel with custom message")
    void testCancelWithMessage() throws Exception {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentHandler handler = agentRegistry.getAgent(agentId(), null, "test-user", sessionId);
        assertNotNull(handler);

        CompletableFuture<AgentResult> future = CompletableFuture.supplyAsync(() ->
                callAgent(sessionId, "请直接回答：详细列举所有质数，从2开始一直到10000")
        );

        Thread.sleep(1500);
        handler.cancel("用户取消了请求");

        AgentResult result = future.get(60, TimeUnit.SECONDS);
        assertNotNull(result);
    }

    // ── Usage tracking ──────────────────────────────────────────────────

    @Test
    @DisplayName("should track token usage correctly")
    void testUsageTracking() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "你好");

        assertNotNull(result.getUsage());
        assertThat(result.getUsage().getPromptTokens(), greaterThan(0L));
        assertThat(result.getUsage().getCompletionTokens(), greaterThan(0L));
    }

    // ── Different sessions isolation ─────────────────────────────────────

    @Test
    @DisplayName("should handle independent sessions without interference")
    void testSessionIsolation() {
        String session1 = UUID.randomUUID().toString().replace("-", "");
        String session2 = UUID.randomUUID().toString().replace("-", "");

        AgentResult r1 = callAgent(session1, "用计算器算 7*8");
        assertNotNull(r1.getResponse());
        assertThat(r1.getResponse(), containsString("56"));

        AgentResult r2 = callAgent(session2, "用计算器算 9*9");
        assertNotNull(r2.getResponse());
        assertThat(r2.getResponse(), containsString("81"));
    }

    // ── Empty and edge case inputs ──────────────────────────────────────

    @Test
    @DisplayName("should handle very short input")
    void testVeryShortInput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        AgentResult result = callAgent(sessionId, "hi");

        assertNotNull(result);
        assertNotNull(result.getResponse());
        assertThat(result.getResponse(), not(emptyOrNullString()));
    }

    @Test
    @DisplayName("should handle long input text")
    void testLongInput() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        String longText = "请总结以下内容：" + "这是一段测试文本。".repeat(100);
        AgentResult result = callAgent(sessionId, longText);

        assertNotNull(result);
        assertNotNull(result.getResponse());
    }

    // ── Follow-up after tool use ─────────────────────────────────────────

    @Test
    @DisplayName("should continue conversation after tool use without errors")
    void testFollowUpAfterToolUse() {
        String sessionId = UUID.randomUUID().toString().replace("-", "");

        AgentResult toolResult = callAgent(sessionId, "用计算器算 50 * 2");
        assertNotNull(toolResult.getResponse());
        assertThat(toolResult.getResponse(), containsString("100"));

        AgentResult followUp = callAgent(sessionId, "再用计算器算一下 200+300");
        assertNotNull(followUp.getResponse());
        assertThat(followUp.getResponse(), containsString("500"));
    }

    // ── Concurrent requests on different sessions ────────────────────────

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

        AgentResult r1 = f1.get(60, TimeUnit.SECONDS);
        AgentResult r2 = f2.get(60, TimeUnit.SECONDS);

        assertNotNull(r1.getResponse());
        assertNotNull(r2.getResponse());
    }
}
