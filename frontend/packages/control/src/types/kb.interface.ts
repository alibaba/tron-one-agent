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


import { KnowledgeBaseType } from "./common.interface";

export interface KnowledgeBaseConfig {
  type: KnowledgeBaseType;
}

export interface BailianKnowledgeBaseConfig extends KnowledgeBaseConfig {
  type: KnowledgeBaseType.BAILIAN;
  id: string;
  enabled?: boolean;
  name: string;
  workspaceId: string;
  indexId: string;
  enableRewrite?: boolean;
  enableRerank?: boolean;
  /** 百炼知识库apiKey, $os{Bailian_Knowledge_Api_Key}, 则会从环境变量获取Bailian_Knowledge_Api_Key作为 API Key 使用 */
  apiKey: string;
}

/** Embedding 模型配置 */
export interface DashscopeEmbeddingModelConfig {
  /** API Key，支持 $os{ENV_VAR} 格式 */
  apiKey?: string;
  /** 自定义 base URL */
  baseUrl?: string;
  /** 模型名称 */
  modelName?: string;
  /** 向量维度 */
  dimensions?: number;
}

/** ElasticSearch 知识库配置 */
export interface ElasticSearchKnowledgeBaseConfig extends KnowledgeBaseConfig {
  type: KnowledgeBaseType.ELASTIC_SEARCH;
  id: string;
  enabled?: boolean;
  name: string;
  /** ElasticSearch 服务地址 */
  url: string;
  /** ES 用户名 */
  username?: string;
  /** ES 密码，支持 $os{ENV_VAR} 格式 */
  password?: string;
  /** ES 索引名称 */
  indexName: string;
  /** 向量维度 */
  dimensions?: number;
  /** Embedding 模型配置 */
  embeddingModelConfig?: DashscopeEmbeddingModelConfig;
}

/** 知识库配置联合类型 */
export type AnyKnowledgeBaseConfig = BailianKnowledgeBaseConfig | ElasticSearchKnowledgeBaseConfig;
