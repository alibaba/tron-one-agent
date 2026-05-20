/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import zhCommon from './locales/zh-CN/common.json';
import zhMenu from './locales/zh-CN/menu.json';
import zhLayout from './locales/zh-CN/layout.json';
import zhLogin from './locales/zh-CN/login.json';
import zhAgents from './locales/zh-CN/agents.json';
import zhDebug from './locales/zh-CN/debug.json';
import zhTools from './locales/zh-CN/tools.json';
import zhMcp from './locales/zh-CN/mcp.json';
import zhKb from './locales/zh-CN/kb.json';
import zhSkills from './locales/zh-CN/skills.json';
import zhMemory from './locales/zh-CN/memory.json';
import zhBackend from './locales/zh-CN/backend.json';
import zhChatbox from './locales/zh-CN/chatbox.json';

import enCommon from './locales/en-US/common.json';
import enMenu from './locales/en-US/menu.json';
import enLayout from './locales/en-US/layout.json';
import enLogin from './locales/en-US/login.json';
import enAgents from './locales/en-US/agents.json';
import enDebug from './locales/en-US/debug.json';
import enTools from './locales/en-US/tools.json';
import enMcp from './locales/en-US/mcp.json';
import enKb from './locales/en-US/kb.json';
import enSkills from './locales/en-US/skills.json';
import enMemory from './locales/en-US/memory.json';
import enBackend from './locales/en-US/backend.json';
import enChatbox from './locales/en-US/chatbox.json';

export const LANG_STORAGE_KEY = 'lang';
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const resources = {
  'zh-CN': {
    common: zhCommon,
    menu: zhMenu,
    layout: zhLayout,
    login: zhLogin,
    agents: zhAgents,
    debug: zhDebug,
    tools: zhTools,
    mcp: zhMcp,
    kb: zhKb,
    skills: zhSkills,
    memory: zhMemory,
    backend: zhBackend,
    chatbox: zhChatbox,
  },
  'en-US': {
    common: enCommon,
    menu: enMenu,
    layout: enLayout,
    login: enLogin,
    agents: enAgents,
    debug: enDebug,
    tools: enTools,
    mcp: enMcp,
    kb: enKb,
    skills: enSkills,
    memory: enMemory,
    backend: enBackend,
    chatbox: enChatbox,
  },
};

/** Normalise detected language codes to our supported set. */
const normaliseLng = (lng: string): string => {
  const lower = lng.toLowerCase();
  if (lower.startsWith('en')) return 'en-US';
  return 'zh-CN';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    ns: [
      'common',
      'menu',
      'layout',
      'login',
      'agents',
      'debug',
      'tools',
      'mcp',
      'kb',
      'skills',
      'memory',
      'backend',
      'chatbox',
    ],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: normaliseLng,
    },
  });

export default i18n;
