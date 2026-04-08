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


import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { EventItem } from "../../types/event";
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

interface ServiceConfig {
  apiPrefix?: string;
  origin?: string;
  authorizationHeader?: Record<string, string>;
}

// 全局服务配置
let serviceConfig: ServiceConfig = {
  apiPrefix: "",
  origin: "",
  authorizationHeader: {},
};

// 设置全局服务配置
export const setServiceConfig = (config: ServiceConfig) => {
  serviceConfig = { ...serviceConfig, ...config };
};

// 获取完整的URL
const getFullUrl = (url: string): string => {
  const { origin, apiPrefix } = serviceConfig;
  let fullUrl = url;

  if (apiPrefix) {
    // 确保apiPrefix以/开头但不以/结尾，url以/开头
    const prefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;
    fullUrl = `${prefix}${url.startsWith("/") ? url : `/${url}`}`;
  }

  if (origin) {
    // 确保origin不以/结尾，url以/开头
    const baseOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    fullUrl = `${baseOrigin}${
      fullUrl.startsWith("/") ? fullUrl : `/${fullUrl}`
    }`;
  }

  return fullUrl;
};

/**
 * 创建会话
 * @param agentId Agent ID
 * @param requestData 创建会话的请求数据
 * @param config 请求配置
 */
export const createSession = async (
  agentId: string,
  config?: RequestConfig
): Promise<string> => {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };
    const body = config?.data;

    const url = getFullUrl(`/api/agents/${agentId}/sessions`);

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`创建会话失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 创建聊天
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param query 查询字符串
 * @param config 请求配置
 */
export const createChat = async (
  agentId: string,
  sessionId: string,
  config?: RequestConfig
): Promise<string> => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };
    const body = config?.data;

    const url = getFullUrl(`/api/agents/${agentId}/sessions/${sessionId}/chat`);

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`创建会话失败 (ID: ${agentId}):`, error);
    throw error;
  }
};

/**
 * 获取会话事件
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param lastEventId 最后事件ID
 * @param config 请求配置
 */
/**
 * 上传文件
 * @param file 文件
 * @returns 文件URL
 */
export const uploadFile = async (
  file: File,
  config?: RequestConfig
): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const url = getFullUrl('/api/file');
    const headers = {
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const location = response.headers.get('Location');
    if (!location) {
      throw new Error('No Location header in upload response');
    }
    return location;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};

/**
 * 获取会话详情
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param config 请求配置
 */
export const getSessionById = async (
  agentId: string,
  sessionId: string,
  config?: RequestConfig
): Promise<any> => {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };

    const url = getFullUrl(`/api/agents/${agentId}/sessions/${sessionId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`获取会话详情失败 (Agent ID: ${agentId}, Session ID: ${sessionId}):`, error);
    throw error;
  }
};

/**
 * 获取会话消息列表
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param config 请求配置
 */
export const getSessionMessages = async (
  agentId: string,
  sessionId: string,
  config?: RequestConfig
): Promise<any> => {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };

    const params = { ...config?.params };
    const searchParams = new URLSearchParams();

    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]));
      }
    });

    const baseUrl = getFullUrl(
      `/api/agents/${agentId}/sessions/${sessionId}/messages`
    );
    const url = searchParams.toString()
      ? `${baseUrl}?${searchParams.toString()}`
      : baseUrl;

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`获取会话消息失败 (Agent ID: ${agentId}, Session ID: ${sessionId}):`, error);
    throw error;
  }
};

export const getSessionEvents = async (
  agentId: string,
  sessionId: string,
  config?: RequestConfig
): Promise<EventItem[]> => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...serviceConfig.authorizationHeader,
      ...config?.headers,
    };

    const params = { ...config?.params };
    const searchParams = new URLSearchParams();

    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]));
      }
    });

    const baseUrl = getFullUrl(
      `/api/agents/${agentId}/sessions/${sessionId}/events`
    );
    const url = searchParams.toString()
      ? `${baseUrl}?${searchParams.toString()}`
      : baseUrl;

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`获取会话事件失败 (ID: ${agentId}):`, error);
    return [];
  }
};

/**
 * 创建聊天 (SSE 流式响应)
 * @param agentId Agent ID
 * @param sessionId Session ID
 * @param config 请求配置
 * @param callbacks 回调函数
 * @returns AbortController 用于中断请求
 */
export interface ChatStreamCallbacks {
  onEvent?: (event: EventItem) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export const createChatStream = (
  agentId: string,
  sessionId: string,
  config?: RequestConfig,
  callbacks?: ChatStreamCallbacks
): AbortController => {
  const abortController = new AbortController();

  const headers = {
    "Content-Type": "application/json",
    "accept": "text/event-stream",
    ...serviceConfig.authorizationHeader,
    ...config?.headers,
  };
  const body = config?.data;

  const url = getFullUrl(`/api/agents/${agentId}/sessions/${sessionId}/chat`);

  fetchEventSource(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
    signal: abortController.signal,

    onopen: async (response) => {
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        return;
      }
      throw new Error(`连接失败: ${response.status} ${response.statusText}`);
    },

    onmessage: (msg) => {
      try {
        const eventData: EventItem = JSON.parse(msg.data);
        callbacks?.onEvent?.(eventData);
      } catch (error) {
        callbacks?.onError?.(new Error("消息解析失败: " + msg.data));
      }
    },

    onerror: (error) => {
      if (error instanceof Error && error.name !== "AbortError") {
        callbacks?.onError?.(error);
      }
      // 抛出错误以阻止自动重试
      throw error;
    },

    onclose: () => {
      callbacks?.onComplete?.();
    },
  }).catch((error) => {
    if (error instanceof Error && error.name !== "AbortError") {
      callbacks?.onError?.(error);
    }
  });

  return abortController;
};

