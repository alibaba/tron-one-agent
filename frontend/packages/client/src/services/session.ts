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


import { get, post, del, patch } from "./request";
import { Session } from "../types/session.interface";
import { AgentSessionMessage, UserSessionMessage } from "chatbox";
export type { Session } from "../types/session.interface";

/**
 * 获取会话列表
 */
export type SessionHistoryItem = {
  id: string;
  userId: string;
  agentId: string;
  name: string;
  lastAppliedEventId: string;
  gmtCreated: string;
  gmtModified: string;
  messages: null;
};
export type SessionHistoryResult = {
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  records: SessionHistoryItem[];
};
export const getSessions = async (
  agentId: string,
  options: Record<string, any>
): Promise<SessionHistoryResult> => {
  try {
    return await get<SessionHistoryResult>(`/api/agents/${agentId}/sessions`, {
      params: options,
    });
  } catch (error) {
    console.error(`获取会话列表失败 (Agent ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 创建会话
 * @param agentId Agent ID
 */
export const createSession = async (agentId: string): Promise<string> => {
  try {
    return await post<string>(`/api/agents/${agentId}/sessions`, {});
  } catch (error) {
    console.error(`创建会话失败 (Agent ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 创建聊天
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param query 查询字符串
 * @param options 请求配置
 */
export const createChat = async (
  agentId: string,
  sessionId: string,
  options?: Record<string, any>
): Promise<string> => {
  try {
    return await post<string>(
      `/api/agents/${agentId}/sessions/${sessionId}/chat`,
      options
    );
  } catch (error) {
    console.error(`创建会话失败 (Agent ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 删除会话
 */
export const deleteSession = async (
  agentId: string,
  sessionId: string
): Promise<void> => {
  try {
    await del(`/api/agents/${agentId}/sessions/${sessionId}`);
  } catch (error) {
    console.error(
      `删除会话失败 (Agent ID: ${agentId}, Session ID: ${sessionId}):`,
      error
    );
    throw error;
  }
};

/**
 * 获取会话详情
 */
export type SessionResult = {
  agentId: string;
  gmtCreated: string;
  gmtModified: string;
  id: string;
  lastAppliedEventId: number;
  name: string;
  userId: string;
};
export const getSessionById = async (
  agentId: string,
  sessionId: string
): Promise<SessionResult> => {
  try {
    return await get<SessionResult>(
      `/api/agents/${agentId}/sessions/${sessionId}`
    );
  } catch (error) {
    console.error(
      `获取会话详情失败 (Agent ID: ${agentId}, Session ID: ${sessionId}):`,
      error
    );
    throw error;
  }
};

/**
 * 获取会话消息
 */
export type SessionMessagesResult = {
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  records: Array<UserSessionMessage | AgentSessionMessage>;
};
export const getSessionMessagesById = async (
  agentId: string,
  sessionId: string,
  options?: Record<string, any>
): Promise<SessionMessagesResult> => {
  try {
    return await get<SessionMessagesResult>(
      `/api/agents/${agentId}/sessions/${sessionId}/messages`,
      {
        params: options,
      }
    );
  } catch (error) {
    console.error(
      `获取会话详情失败 (Agent ID: ${agentId}, Session ID: ${sessionId}):`,
      error
    );
    throw error;
  }
};
