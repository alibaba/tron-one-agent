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


import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { router } from './router';
import { syncChatboxLocale } from './i18n/chatboxBridge';
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
  const { i18n } = useTranslation();
  const isEn = (i18n.language || '').toLowerCase().startsWith('en');
  const antdLocale = isEn ? enUS : zhCN;

  useEffect(() => {
    document.documentElement.lang = isEn ? 'en' : 'zh-CN';
    syncChatboxLocale(i18n);
  }, [isEn, i18n]);

  useEffect(() => {
    const handler = () => syncChatboxLocale(i18n);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [i18n]);

  return (
    <ConfigProvider locale={antdLocale} theme={themeConfig}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export default App;
