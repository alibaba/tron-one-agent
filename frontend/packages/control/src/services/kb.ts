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
import { BailianKnowledgeBaseConfig } from '../types/kb.interface';
import { ApiResponse } from '../types/common.interface';

/**
 * 创建知识库
 * @param kbData 知识库配置数据
 */
export const createKb = async (kbData: Omit<BailianKnowledgeBaseConfig, 'id'>): Promise<BailianKnowledgeBaseConfig> => {
  try {
    return await post<BailianKnowledgeBaseConfig>('/api/control/kb', kbData);
  } catch (error) {
    console.error('创建知识库失败:', error);
    throw error;
  }
};

/**
 * 获取所有知识库列表
 */
export const getAllKbs = async (): Promise<ApiResponse<BailianKnowledgeBaseConfig[]>> => {
  try {
    return await get<ApiResponse<BailianKnowledgeBaseConfig[]>>('/api/control/kb');
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取知识库详情
 * @param kbId 知识库ID
 */
export const getKbById = async (kbId: string): Promise<ApiResponse<BailianKnowledgeBaseConfig>> => {
  try {
    return await get<ApiResponse<BailianKnowledgeBaseConfig>>(`/api/control/kb/${kbId}`);
  } catch (error) {
    console.error(`获取知识库详情失败 (ID: ${kbId}):`, error);
    throw error;
  }
};

/**
 * 更新知识库配置
 * @param kbId 知识库ID
 * @param updateData 更新的数据
 */
export const updateKb = async (
  kbId: string, 
  updateData: Partial<BailianKnowledgeBaseConfig>
): Promise<BailianKnowledgeBaseConfig> => {
  try {
    return await patch<BailianKnowledgeBaseConfig>(`/api/control/kb/${kbId}`, updateData);
  } catch (error) {
    console.error(`更新知识库失败 (ID: ${kbId}):`, error);
    throw error;
  }
};

/**
 * 删除知识库
 * @param kbId 知识库ID
 */
export const deleteKb = async (kbId: string): Promise<void> => {
  try {
    return await del<void>(`/api/control/kb/${kbId}`);
  } catch (error) {
    console.error(`删除知识库失败 (ID: ${kbId}):`, error);
    throw error;
  }
};

// 导出所有知识库相关的API方法
export const kbService = {
  createKb,
  getAllKbs,
  getKbById,
  updateKb,
  deleteKb,
};

export default kbService;
