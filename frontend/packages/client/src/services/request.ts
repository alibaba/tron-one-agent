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


import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { message } from "antd";
import { getUserId } from "../utils/userInfo";

const getBaseURL = () => {
  return "/client";
};

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    if (config.headers) {
      if (!config.headers["X-User-Id"]) {
        (config.headers as Record<string, string>)["X-User-Id"] = getUserId();
      }
    }
    return config;
  },
  (error) => {
    console.error("请求拦截器错误:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    // 根据业务需要处理响应数据
    if (data.code !== undefined && ![200, 201, 204].includes(data.code)) {
      message.error(data.message || "请求失败");
      return Promise.reject(new Error(data.message || "请求失败"));
    }

    console.log(".interceptors.response: ", data);

    return data;
  },
  (error) => {
    console.error("响应拦截器错误:", error);

    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error(data?.message || "请求参数错误");
          break;
        case 401:
          message.error("未授权，请重新登录");
          // 可以在这里处理登录跳转
          break;
        case 403:
          message.error("拒绝访问");
          break;
        case 404:
          message.error("请求的资源不存在");
          break;
        case 500:
          message.error("服务器内部错误");
          break;
        default:
          message.error(data?.message || `请求失败 (${status})`);
      }
    } else if (error.request) {
      message.error("网络错误，请检查网络连接");
    } else {
      message.error("请求配置错误");
    }

    return Promise.reject(error);
  }
);

export default request;

// 导出常用的请求方法
export const get = <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  return request.get(url, config);
};

export const post = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return request.post(url, data, config);
};

export const put = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return request.put(url, data, config);
};

export const patch = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return request.patch(url, data, config);
};

export const del = <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  return request.delete(url, config);
};
