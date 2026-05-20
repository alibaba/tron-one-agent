/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import i18n from './index';

/**
 * Map fixed Chinese labels returned by the backend (e.g. ToolFormatter
 * tool action names) to i18n keys under the `backend` namespace.
 *
 * Persisted business data such as default Agent / KB names are
 * intentionally NOT translated here — they are user-owned data.
 */
const BACKEND_LABEL_TO_KEY: Record<string, string> = {
  加载技能: 'backend:tool.loadSkill',
  网络搜索: 'backend:tool.webSearch',
  知识检索: 'backend:tool.knowledgeRetrieval',
  执行命令: 'backend:tool.executeCommand',
  更新文件: 'backend:tool.updateFile',
  读取文件: 'backend:tool.readFile',
  读取目录: 'backend:tool.readDirectory',
};

/**
 * Translate a backend-supplied label if it is a known fixed enum string.
 * Returns the original input when no mapping exists.
 */
export const mapBackendLabel = (raw: string | undefined | null): string => {
  if (raw == null) return '';
  const key = BACKEND_LABEL_TO_KEY[raw.trim()];
  if (!key) return raw;
  return i18n.t(key);
};
