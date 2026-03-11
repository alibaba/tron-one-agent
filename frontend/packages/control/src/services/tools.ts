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


import { get } from './request';
import { AgentToolConfig } from '../types/tool.interface';

/**
 * 查询所有工具
 */
export const getAllTools = async (): Promise<{data: AgentToolConfig[]}> => {
  try {
    return await get<{data: AgentToolConfig[]}>('/api/control/tools');
  } catch (error) {
    console.error('获取工具列表失败:', error);
    throw error;
  }
};

// 导出所有工具相关的API方法
export const toolsService = {
  getAllTools,
};

export default toolsService;
