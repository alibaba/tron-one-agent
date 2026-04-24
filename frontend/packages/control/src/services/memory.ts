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
import { LongTermMemoryConfig } from '../types/memory.interface';
import { ApiResponse } from '../types/common.interface';

/**
 * 创建长期记忆配置
 * @param data 长期记忆配置数据
 */
export const createMemory = async (data: Omit<LongTermMemoryConfig, 'id'>): Promise<ApiResponse<string>> => {
  try {
    return await post<ApiResponse<string>>('/api/control/memory', data);
  } catch (error) {
    console.error('创建长期记忆配置失败:', error);
    throw error;
  }
};

/**
 * 获取所有长期记忆配置列表
 */
export const getAllMemories = async (): Promise<ApiResponse<LongTermMemoryConfig[]>> => {
  try {
    return await get<ApiResponse<LongTermMemoryConfig[]>>('/api/control/memory');
  } catch (error) {
    console.error('获取长期记忆配置列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取长期记忆配置详情
 * @param memoryId 长期记忆配置ID
 */
export const getMemoryById = async (memoryId: string): Promise<ApiResponse<LongTermMemoryConfig>> => {
  try {
    return await get<ApiResponse<LongTermMemoryConfig>>(`/api/control/memory/${memoryId}`);
  } catch (error) {
    console.error(`获取长期记忆配置详情失败 (ID: ${memoryId}):`, error);
    throw error;
  }
};

/**
 * 更新长期记忆配置
 * @param memoryId 长期记忆配置ID
 * @param updateData 更新的数据
 */
export const updateMemory = async (
  memoryId: string,
  updateData: Partial<LongTermMemoryConfig>
): Promise<ApiResponse<string>> => {
  try {
    return await patch<ApiResponse<string>>(`/api/control/memory/${memoryId}`, updateData);
  } catch (error) {
    console.error(`更新长期记忆配置失败 (ID: ${memoryId}):`, error);
    throw error;
  }
};

/**
 * 删除长期记忆配置
 * @param memoryId 长期记忆配置ID
 */
export const deleteMemory = async (memoryId: string): Promise<void> => {
  try {
    return await del<void>(`/api/control/memory/${memoryId}`);
  } catch (error) {
    console.error(`删除长期记忆配置失败 (ID: ${memoryId}):`, error);
    throw error;
  }
};

// 导出所有长期记忆相关的API方法
export const memoryService = {
  createMemory,
  getAllMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
};

export default memoryService;
