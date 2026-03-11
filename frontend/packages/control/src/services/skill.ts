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
import { SkillConfig } from '../types/skill.interface';
import { ApiResponse } from '../types/common.interface';
import request from './request';

/**
 * 获取所有Skill列表
 */
export const getAllSkills = async (): Promise<ApiResponse<SkillConfig[]>> => {
  try {
    return await get<ApiResponse<SkillConfig[]>>('/api/control/skills');
  } catch (error) {
    console.error('获取Skill列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取Skill详情
 * @param skillId Skill ID
 */
export const getSkillById = async (skillId: number): Promise<ApiResponse<SkillConfig>> => {
  try {
    return await get<ApiResponse<SkillConfig>>(`/api/control/skills/${skillId}`);
  } catch (error) {
    console.error(`获取Skill详情失败 (ID: ${skillId}):`, error);
    throw error;
  }
};

/**
 * 上传Skill（新增或更新）
 * @param file 上传的zip文件
 * @param id 可选，如果传入则为更新已有skill
 */
export const uploadSkill = async (file: File, id?: number): Promise<ApiResponse<number>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (id !== undefined) {
      formData.append('id', id.toString());
    }
    return await request.post('/api/control/skills', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    console.error('上传Skill失败:', error);
    throw error;
  }
};

/**
 * 更新Skill配置（启用/禁用）
 * @param skillId Skill ID
 * @param updateData 更新的数据
 */
export const updateSkill = async (
  skillId: number,
  updateData: Partial<SkillConfig>
): Promise<ApiResponse<string>> => {
  try {
    return await patch<ApiResponse<string>>(`/api/control/skills/${skillId}`, updateData);
  } catch (error) {
    console.error(`更新Skill失败 (ID: ${skillId}):`, error);
    throw error;
  }
};

/**
 * 删除Skill
 * @param skillId Skill ID
 */
export const deleteSkill = async (skillId: number): Promise<void> => {
  try {
    return await del<void>(`/api/control/skills/${skillId}`);
  } catch (error) {
    console.error(`删除Skill失败 (ID: ${skillId}):`, error);
    throw error;
  }
};

/**
 * 下载Skill文件
 * @param skillId Skill ID
 */
export const downloadSkill = (skillId: number): string => {
  return `/api/control/skills/${skillId}/download`;
};

// 导出所有Skill相关的API方法
export const skillService = {
  getAllSkills,
  getSkillById,
  uploadSkill,
  updateSkill,
  deleteSkill,
  downloadSkill,
};

export default skillService;
