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


import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { message } from "antd";
import { getToken, clearAuth } from '@/utils/auth';
import i18n from '@/i18n';

// 获取baseURL，优先使用环境变量，否则使用默认值
const getBaseURL = () => {
  return "/api";
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
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    // 根据业务需要处理响应数据
    if (data.code !== undefined && data.code !== 200) {
      message.error(data.message || i18n.t('common:requestFailed'));
      return Promise.reject(new Error(data.message || i18n.t('common:requestFailed')));
    }

    console.log(".interceptors.response: ", data);

    return data;
  },
  (error) => {
    console.error("Response interceptor error:", error);

    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error(data?.message || i18n.t('common:requestParamError'));
          break;
        case 401:
          message.error(i18n.t('common:unauthorized'));
          clearAuth();
          window.location.hash = '#/login';
          break;
        case 403:
          message.error(i18n.t('common:forbidden'));
          break;
        case 404:
          message.error(i18n.t('common:notFoundResource'));
          break;
        case 500:
          message.error(i18n.t('common:serverError'));
          break;
        default:
          message.error(data?.message || i18n.t('common:requestFailedWithStatus', { status }));
      }
    } else if (error.request) {
      message.error(i18n.t('common:networkError'));
    } else {
      message.error(i18n.t('common:requestConfigError'));
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
