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


package com.aliyun.tam.x.tron.core.agents;

import io.agentscope.core.model.ChatUsage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Agent result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentResult {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Usage {
        @Builder.Default
        private int times = 0;

        @Builder.Default
        private long costInMs = 0;

        @Builder.Default
        private long promptTokens = 0;

        @Builder.Default
        private long completionTokens = 0;

        public void increment(ChatUsage usage) {
            times++;
            costInMs += (long) Math.ceil(usage.getTime() * 1000);
            promptTokens += usage.getInputTokens();
            completionTokens += usage.getOutputTokens();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        private Long id;

        private String name;

        private Long costInMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Task {
        private Long id;

        private String agentId;

        private String name;

        @Builder.Default
        private boolean success = true;

        private Long costInMs;
    }

    private String response;

    private Long firstTokenDelayInMs = 0L;

    private Long firstResponseTokenDelayInMs = 0L;

    private Long costInMs;

    @Builder.Default
    private Usage usage = Usage.builder().build();

    @Builder.Default
    private List<Action> actions = new ArrayList<>();

    @Builder.Default
    private List<Task> tasks = new ArrayList<>();
}
