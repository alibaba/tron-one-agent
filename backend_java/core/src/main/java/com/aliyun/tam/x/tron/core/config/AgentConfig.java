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


package com.aliyun.tam.x.tron.core.config;

import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.google.common.collect.Lists;
import io.agentscope.core.rag.RAGMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Agent configuration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentConfig {
    /**
     * Agent ID
     */
    private String id;

    /**
     * Agent name
     */
    private String name;

    /**
     * Agent enabled status
     */
    private Boolean enabled;

    /**
     * Local agent type
     */
    private LocalAgentType type;

    /**
     * Chat model configuration
     */
    private ChatModelConfig chatModel;

    /**
     * System prompt
     */
    private String systemPrompt;

    /**
     * Maximum iterations
     */
    @Builder.Default
    private Integer maxIters = 10;

    /**
     * Agent tools
     */
    @Builder.Default
    private List<AgentToolConfig> tools = new ArrayList<>();

    /**
     * MCP clients
     */
    @Builder.Default
    private List<AgentMcpConfig> mcpClients = new ArrayList<>();

    @Builder.Default
    private String ragMode = RAGMode.AGENTIC.name();

    /**
     * Knowledge bases
     */
    @Builder.Default
    private List<AgentKnowledgeBaseConfig> knowledgeBases = new ArrayList<>();

    /**
     * Sub-agents (can be LocalSubAgentConfig or A2ASubAgentConfig)
     */
    @Builder.Default
    private List<SubAgentConfig> subAgents = new ArrayList<>();

    @Builder.Default
    private List<AgentSkillConfig> skills = new ArrayList<>();

    @Builder.Default
    private List<ContentType> supportInputTypes = Lists.newArrayList(ContentType.TEXT);
}
