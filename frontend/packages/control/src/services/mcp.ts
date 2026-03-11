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


import { get, post, patch, del } from './request';
import { McpClientConfig } from '../types/mcp.interface';
import { ApiResponse } from '../types/common.interface';

/**
 * 新增MCP客户端
 * @param mcpData MCP客户端配置数据
 */
export const createMcp = async (mcpData: Omit<McpClientConfig, 'id'>): Promise<McpClientConfig> => {
  try {
    return await post<McpClientConfig>('/api/control/mcps', mcpData);
  } catch (error) {
    console.error('创建MCP客户端失败:', error);
    throw error;
  }
};

/**
 * 获取所有MCP客户端列表
 */
export const getAllMcps = async (): Promise<ApiResponse<McpClientConfig[]>> => {
  try {
    return await get<ApiResponse<McpClientConfig[]>>('/api/control/mcps');
  } catch (error) {
    console.error('获取MCP客户端列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取MCP客户端详情
 * @param mcpId MCP客户端ID
 */
export const getMcpById = async (mcpId: string): Promise<McpClientConfig> => {
  try {
    return await get<McpClientConfig>(`/api/control/mcps/${mcpId}`);
  } catch (error) {
    console.error(`获取MCP客户端详情失败 (ID: ${mcpId}):`, error);
    throw error;
  }
};

/**
 * 更新MCP客户端配置
 * @param mcpId MCP客户端ID
 * @param updateData 更新的数据
 */
export const updateMcp = async (
  mcpId: string, 
  updateData: Partial<McpClientConfig>
): Promise<McpClientConfig> => {
  try {
    return await patch<McpClientConfig>(`/api/control/mcps/${mcpId}`, updateData);
  } catch (error) {
    console.error(`更新MCP客户端失败 (ID: ${mcpId}):`, error);
    throw error;
  }
};

/**
 * 删除MCP客户端
 * @param mcpId MCP客户端ID
 */
export const deleteMcp = async (mcpId: string): Promise<void> => {
  try {
    return await del<void>(`/api/control/mcps/${mcpId}`);
  } catch (error) {
    console.error(`删除MCP客户端失败 (ID: ${mcpId}):`, error);
    throw error;
  }
};

// 导出所有MCP相关的API方法
export const mcpService = {
  createMcp,
  getAllMcps,
  getMcpById,
  updateMcp,
  deleteMcp,
};

export default mcpService;
