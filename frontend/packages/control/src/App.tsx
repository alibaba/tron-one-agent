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


import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import './styles/global.less';

const themeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "PingFang SC, Microsoft YaHei, Helvetica Neue, system-ui, sans-serif",
    colorText: '#1a1a1a',
    colorTextSecondary: '#8c8c8c',
    colorBorder: '#e8e8e8',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f7fa',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export default App;
