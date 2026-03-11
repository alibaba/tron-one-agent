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


package com.aliyun.tam.x.tron.api.request;

import com.aliyun.tam.x.tron.core.config.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Session model
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatchAgentConfigRequest {
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
    private Integer maxIters;

    /**
     * Agent tools
     */
    private List<AgentToolConfig> tools;

    /**
     * MCP clients
     */
    private List<AgentMcpConfig> mcpClients;

    private String ragMode;

    /**
     * Knowledge bases
     */
    private List<AgentKnowledgeBaseConfig> knowledgeBases;

    /**
     * Sub-agents (can be LocalSubAgentConfig or A2ASubAgentConfig)
     */
    private List<SubAgentConfig> subAgents;

    /**
     * Skills
     */
    private List<AgentSkillConfig> skills;
}
