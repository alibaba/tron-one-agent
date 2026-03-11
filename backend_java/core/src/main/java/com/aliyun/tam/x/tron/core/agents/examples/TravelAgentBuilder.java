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
import com.google.common.collect.Lists;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TravelAgentBuilder extends BaseAgentBuilder {
    public static final String AGENT_ID = "travel_react_agent";

    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    protected TravelAgentBuilder() {
        super(AGENT_ID);
    }

    @Override
    protected AgentConfig defaultConfig() {
        return AgentConfig.builder()
                .name("旅行助手")
                .enabled(true)
                .systemPrompt("你是一个旅行助手，需要帮助我指定行程")
                .chatModel(
                        ChatModelConfig.builder()
                                .type(ChatModelType.DASHSCOPE)
                                .apiKey(apiKey)
                                .modelName("qwen3-max")
                                .build()
                )
                .skills(Lists.newArrayList(
                        AgentSkillConfig.builder()
                                .name("weather_skill")
                                .enabled(true)
                                .build()
                ))
                .type(LocalAgentType.REACT)
                .build();
    }
}
