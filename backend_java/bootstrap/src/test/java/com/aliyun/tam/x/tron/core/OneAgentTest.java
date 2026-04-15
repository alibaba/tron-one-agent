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
import com.aliyun.tam.x.tron.JudgeLMFactory;
import com.aliyun.tam.x.tron.core.agents.AgentResult;
import com.aliyun.tam.x.tron.core.agents.examples.OneAgentBuilder;
import dev.dokimos.core.*;
import dev.dokimos.core.evaluators.LLMJudgeEvaluator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.greaterThan;

public class OneAgentTest extends BaseFuncTest {

    @Autowired
    private JudgeLMFactory judgeLMFactory;

    @Override
    protected String agentId() {
        return OneAgentBuilder.AGENT_ID;
    }


    @Test
    public void testOneAgent() throws Exception {
        Dataset dataset = DatasetResolverRegistry.getInstance().resolve("classpath:datasets/test-one-agent-v1.json");

        Task task = example -> {
            String sessionId = UUID.randomUUID().toString();
            AgentResult result = callAgent(sessionId, example.input());
            return Map.of(
                    "sessionId", sessionId,
                    "output", result.getResponse()
            );
        };

        List<Evaluator> evaluators = List.of(
                LLMJudgeEvaluator.builder()
                        .name("Relevance")
                        .criteria("Is the answer relevant to the question?")
                        .threshold(0.7)
                        .evaluationParams(List.of(
                                EvalTestCaseParam.INPUT,
                                EvalTestCaseParam.ACTUAL_OUTPUT
                        ))
                        .judge(judgeLMFactory.create())
                        .build(),
                LLMJudgeEvaluator.builder()
                        .name("Answer Quality")
                        .criteria("Is the answer helpful and addresses the user's question?")
                        .evaluationParams(List.of(
                                EvalTestCaseParam.INPUT,
                                EvalTestCaseParam.ACTUAL_OUTPUT
                        ))
                        .threshold(0.5)
                        .judge(judgeLMFactory.create())
                        .build()
        );

        String timestamp = Instant.now().toString();

        ExperimentResult result = Experiment.builder()
                .name("One Agent Evaluation")
                .dataset(dataset)
                .task(task)
                .evaluators(evaluators)
                .metadata("agnet", agentId())
                .metadata("timestamp", timestamp)
                .metadata("version", "1.0.0")
                .runs(2)
                .parallelism(4)
                .build()
                .run();

        System.out.println("Experiment: " + result.name());
        System.out.println("Description: " + result.description());
        System.out.println("Total examples: " + result.totalCount());
        System.out.println("Passed: " + result.passCount());
        System.out.println("Failed: " + result.failCount());
        System.out.println("Pass rate: " + String.format("%.2f%%", result.passRate() * 100));

        System.out.println("\nAverage scores:");
        for (Evaluator evaluator : evaluators) {
            System.out.println(evaluator.name() + ": " + result.averageScore(evaluator.name()));
        }

        if (result.runCount() > 1) {
            System.out.println("\nScore stability (standard deviation):");
            for (Evaluator evaluator : evaluators) {
                System.out.println(evaluator.name() + ": " + result.scoreStdDev(evaluator.name()));
            }
        }

        Path resultBaseDir = Paths.get("results", "one-agent-test", timestamp);
        if (!Files.exists(resultBaseDir)) {
            Files.createDirectories(resultBaseDir);
        }
        result.exportJson(resultBaseDir.resolve(result.name() + ".json"));
        result.exportHtml(resultBaseDir.resolve(result.name() + ".html"));
        result.exportMarkdown(resultBaseDir.resolve(result.name() + ".md"));

        assertThat("Pass rate " + result.passRate() + " is below threshold 0.75", result.passRate(), greaterThan(0.75));
        for (Evaluator evaluator : evaluators) {
            assertThat("Score " + result.averageScore(evaluator.name()) + " is below threshold 0.5 for evaluator " + evaluator.name(),
                    result.averageScore(evaluator.name()),
                    greaterThan(evaluator.threshold()));
        }

    }
}
