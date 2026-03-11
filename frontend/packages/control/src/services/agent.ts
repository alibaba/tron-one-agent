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


import { get, post, patch } from "./request";
import {
  AgentConfig,
  UpdateAgentRequest,
  CreateSessionRequest,
} from "../types/agent.interface";
import { ContentType, EventItem } from "chatbox";
import { getUserId, getUserName } from "../utils/userInfo";

/**
 * 查询所有agents
 */
export const getAllAgents = async (): Promise<AgentConfig[]> => {
  try {
    return await get<AgentConfig[]>("/api/control/agents");
  } catch (error) {
    console.error("获取Agent列表失败:", error);
    throw error;
  }
};

/**
 * 根据ID查询agent详情
 * @param agentId Agent ID
 */
export const getAgentById = async (agentId: string): Promise<AgentConfig> => {
  try {
    return await get<AgentConfig>(`/api/control/agents/${agentId}`);
  } catch (error) {
    console.error(`获取Agent详情失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 更新agent数据
 * @param agentId Agent ID
 * @param updateData 更新的数据
 */
export const updateAgent = async (
  agentId: string,
  updateData: UpdateAgentRequest
): Promise<AgentConfig> => {
  try {
    return await patch<AgentConfig>(`/api/control/agents/${agentId}`, updateData);
  } catch (error) {
    console.error(`更新Agent失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 更新agent数据
 * @param agentId Agent ID
 * @param requestData 创建会话的请求数据
 */
export const createSession = async (
  agentId: string,
  requestData: CreateSessionRequest
): Promise<string> => {
  try {
    return await post<string>(`/agents/${agentId}/sessions`, requestData, {
      headers: {
        "X-User-Id": encodeURIComponent(getUserId()),
        "X-User-Name": encodeURIComponent(getUserName()),
      },
    });
  } catch (error) {
    console.error(`创建会话失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 创建对话
 * @param agentId Agent ID
 * @param sessionId 会话 ID
 * @param query 用户输入
 */
export const createChat = async (
  agentId: string,
  sessionId: string,
  query: string
): Promise<string> => {
  try {
    return await post<string>(
      `/agents/${agentId}/sessions/${sessionId}/chat`,
      {
        input: [
          {
            type: ContentType.TEXT,
            text: query,
          },
        ],
      },
      {
        headers: {
          "X-User-Id": encodeURIComponent(getUserId()),
          "X-User-Name": encodeURIComponent(getUserName()),
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    console.error(`创建对话失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

export const getSessionEvents = async (
  agentId: string,
  sessionId: string,
  lastEventId: number
): Promise<EventItem[]> => {
  try {
    return await get<EventItem[]>(`/agents/${agentId}/sessions/${sessionId}/events`, {
      params: {
        offset: lastEventId,
        size: 10,
      },
      headers: {
        "X-User-Id": encodeURIComponent(getUserId()),
        "X-User-Name": encodeURIComponent(getUserName()),
        Accept: "application/json",
      },
    });
  } catch (error) {
    console.error(`获取会话事件失败 (ID: ${agentId}):`, error);
    return [];
  }
};

// 导出所有Agent相关的API方法
export const agentService = {
  getAllAgents,
  getAgentById,
  updateAgent,
};

export interface SessionListItem {
  id: string;
  name: string;
  lastAppliedEventId: number;
  gmtCreated: string;
  gmtModified: string;
}

export interface SessionListResult {
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  records: SessionListItem[];
}

/**
 * 获取会话列表
 * @param agentId Agent ID
 * @param pageNo 页码
 * @param pageSize 每页条数
 */
export const getSessionList = async (
  agentId: string,
  pageNo: number = 1,
  pageSize: number = 10
): Promise<SessionListResult> => {
  try {
    return await get<SessionListResult>(`/api/agents/${agentId}/sessions`, {
      params: { pageNo, pageSize },
      headers: {
        "X-User-Id": encodeURIComponent(getUserId()),
        "X-User-Name": encodeURIComponent(getUserName()),
      },
    });
  } catch (error) {
    console.error(`获取会话列表失败 (agentId: ${agentId}):`, error);
    throw error;
  }
};

export default agentService;
