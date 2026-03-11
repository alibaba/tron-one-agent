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
import io.a2a.spec.AgentCapabilities;
import io.a2a.spec.AgentCard;
import io.a2a.spec.AgentSkill;
import io.a2a.spec.TransportProtocol;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SimpleAgentBuilder extends BaseAgentBuilder {
    public static final String AGENT_ID = "simple_agent";

    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    public static final AgentCard AGENT_CARD = new AgentCard.Builder()
            .name("个人助手")
            .description("个人助手")
            .url("http://localhost:8080/api/a2a/simple_agent/")
            .version("1.0.0")
            .capabilities(new AgentCapabilities.Builder().streaming(false).build())
            .defaultInputModes(Lists.newArrayList("text", "text/plain"))
            .defaultOutputModes(Lists.newArrayList("text", "text/plain"))
            .preferredTransport(TransportProtocol.JSONRPC.asString())
            .skills(Lists.newArrayList(
                    new AgentSkill.Builder()
                            .id("general_qa")
                            .name("通用问答")
                            .description("回答用户的通用问题")
                            .tags(Lists.newArrayList("general_qa"))
                            .examples(Lists.newArrayList("1+1=？", "strawberry有几个r？"))
                            .build(),
                    new AgentSkill.Builder()
                            .id("web_search")
                            .name("互联网信息搜索")
                            .description("为用户搜索互联网信息并整理答案")
                            .tags(Lists.newArrayList("web_search"))
                            .examples(Lists.newArrayList("阿里巴巴今天的股价怎么样？"))
                            .build()
            ))
            .build();

    protected SimpleAgentBuilder() {
        super(AGENT_ID);
    }

    @Override
    protected AgentConfig defaultConfig() {
        return AgentConfig.builder()
                .name("个人助手")
                .enabled(true)
                .chatModel(
                        ChatModelConfig.builder()
                                .type(ChatModelType.OPENAI_COMPATIBLE)
                                .baseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")
                                .apiKey(apiKey)
                                .modelName("qwen-plus")
                                .build()
                )
                .tools(Lists.newArrayList(
                        AgentToolConfig.builder()
                                .enabled(true)
                                .name("calculator")
                                .build()
                ))
                .mcpClients(Lists.newArrayList(
                        AgentMcpConfig.builder()
                                .clientId("WebSearch")
                                .enabled(true)
                                .build()
                ))
//                .knowledgeBases(Lists.newArrayList(
//                        AgentKnowledgeBaseConfig.builder()
//                                .enabled(true)
//                                .knowledgeId("bailian_rag")
//                                .agenticToolDescription("xxx")
//                                .build()
//                ))
                .type(LocalAgentType.REACT)
                .build();
    }

    @Override
    public AgentCard publishAsA2AAgent() {
        return AGENT_CARD;
    }
}
