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


package com.aliyun.tam.x.tron.core.agents.examples;

import com.aliyun.tam.x.tron.core.agents.BaseAgentBuilder;
import com.aliyun.tam.x.tron.core.config.*;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OneAgentBuilder extends BaseAgentBuilder {
    public static final String AGENT_ID = "one_agent";

    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    protected OneAgentBuilder() {
        super(AGENT_ID);
    }

    @Override
    protected AgentConfig defaultConfig() {
        return AgentConfig.builder()
                .name("小AI")
                .enabled(true)
                .chatModel(
                        ChatModelConfig.builder()
                                .type(ChatModelType.OPENAI_COMPATIBLE)
                                .baseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")
                                .apiKey(apiKey)
                                .modelName("qwen3.5-plus")
                                .build()
                ).subAgents(Lists.newArrayList(
                        A2ASubAgentConfig.builder()
                                .agentId(SimpleAgentBuilder.AGENT_ID + "_a2a")
                                .agentCard(SimpleAgentBuilder.AGENT_CARD)
                                .build(),
                        LocalSubAgentConfig.builder()
                                .agentId(TravelAgentBuilder.AGENT_ID)
                                .capacities("根据用户需求规划旅行或者徒步等各类外出行程，帮助用户查询目的地天气")
                                .build()
                ))
                .tools(Lists.newArrayList(
                        AgentToolConfig.builder()
                                .name("datetime")
                                .enabled(true)
                                .build()
                ))
                .type(LocalAgentType.ONE)
                .supportInputTypes(Lists.newArrayList(ContentType.TEXT, ContentType.IMAGE))
                .build();
    }

}
