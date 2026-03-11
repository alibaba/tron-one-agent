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
