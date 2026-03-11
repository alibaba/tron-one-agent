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


import { LocalAgentType, ApiResponse } from "./common.interface";
import { ChatModelConfig } from "./chat-model.interface";
import { AgentToolConfig } from "./tool.interface";
import { McpClientConfig } from "./mcp.interface";
import { KnowledgeBaseConfig } from "./kb.interface";
import { ContentType } from "chatbox";

export interface SubAgentConfig {
  agentId: string;
  capacities: string;
  enabled?: boolean;
}

export interface RemoteSubAgentConfig extends SubAgentConfig {
  endpoint: string;
  transport: "post" | "sse";
  timeout?: number;
}

export type SubAgent = SubAgentConfig | RemoteSubAgentConfig;

export interface AgentMcpConfig {
  enabled: boolean;
  clientId: string;
  enable_funcs: string[];
  disable_funcs: string[];
}

export interface AgentKnowledgeBaseConfig {
  enabled: boolean; 
  knowledgeId: string;
  mode: 'agentic' | 'generic';
  agentic_tool_description?: string | null;
  defaultLimit?: number;
  defaultScoreThreshold?: number | null;
}

export interface AgentConfig {
  id?: string;
  name: string;
  enabled: boolean;
  type: LocalAgentType;
  chatModel?: ChatModelConfig;
  systemPrompt?: string;
  maxIters?: number;
  tools: AgentToolConfig[];
  mcpClients: AgentMcpConfig[];
  knowledgeBases: AgentKnowledgeBaseConfig[];
  subAgents: SubAgent[];
  supportInputTypes?: Array<ContentType.TEXT | ContentType.IMAGE | ContentType.VIDEO | ContentType.AUDIO>;
}

export interface UpdateAgentRequest {
  name?: string;
  enabled?: boolean;
  systemPrompt?: string;
  maxIters?: number;
  tools?: any[];
  mcpClients?: AgentMcpConfig[];
  knowledgeBases?: AgentKnowledgeBaseConfig[];
  subAgents?: any[];
}

export interface CreateSessionRequest {
  name?: string;
}