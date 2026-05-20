/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Lightweight zero-dependency locale registry for the chatbox package.
 *
 * The chatbox does NOT take a hard dependency on any i18n library. The
 * host application (e.g. `control`) is expected to call `setChatboxLocale`
 * once on startup and again on language change, passing in a fully
 * translated dictionary. The chatbox internally reads strings via the
 * exported `t(key, vars?)` helper.
 */

export interface ChatboxHitlLocale {
  multiSelect: string;
  singleSelect: string;
  prevQuestion: string;
  nextQuestion: string;
  inputPlaceholder: string;
  waitingMessage: string;
  userRejected: string;
  completed: string;
  skip: string;
  submit: string;
  continue: string;
}

export interface ChatboxTaskLocale {
  /** Supports `{{time}}` placeholder. */
  finishedAt: string;
}

export interface ChatboxLocale {
  newSession: string;
  newSessionBtn: string;
  send: string;
  sending: string;
  interrupt: string;
  chatPlaceholder: string;
  hitlPendingPlaceholder: string;
  voiceInput: string;
  stopRecording: string;
  recording: string;
  selectFile: string;
  uploadFile: string;
  uploading: string;
  remove: string;
  uploadFailed: string;
  loading: string;
  parseError: string;
  messageSendFailed: string;
  messageGetFailed: string;
  playVoice: string;
  stopVoice: string;
  userFallback: string;
  aiAgentFallback: string;
  deepThinking: string;
  msgStatusSending: string;
  msgStatusCompleted: string;
  msgStatusProcessing: string;
  msgStatusCancelled: string;
  hitl: ChatboxHitlLocale;
  task: ChatboxTaskLocale;
}

/** Default Chinese locale, used until the host overrides it. */
const DEFAULT_LOCALE: ChatboxLocale = {
  newSession: '新会话',
  newSessionBtn: '新建会话',
  send: '发送',
  sending: '发送中...',
  interrupt: '中断',
  chatPlaceholder: '输入消息... (Enter发送，Shift+Enter换行)',
  hitlPendingPlaceholder: '请先完成问卷后再发送消息',
  voiceInput: '语音输入',
  stopRecording: '停止录音',
  recording: '正在录音...',
  selectFile: '选择文件',
  uploadFile: '上传文件',
  uploading: '文件上传中...',
  remove: '移除',
  uploadFailed: '上传失败',
  loading: '正在加载...',
  parseError: '解析错误',
  messageSendFailed: '消息发送失败，请稍后重试',
  messageGetFailed: '消息获取失败，请稍后重试或者刷新页面尝试获取消息',
  playVoice: '语音播放',
  stopVoice: '停止播放',
  userFallback: '用户',
  aiAgentFallback: 'AI Agent',
  deepThinking: '深度思考',
  msgStatusSending: '发送中',
  msgStatusCompleted: '已完成',
  msgStatusProcessing: '处理中',
  msgStatusCancelled: '已取消',
  hitl: {
    multiSelect: '多选',
    singleSelect: '单选',
    prevQuestion: '上一题',
    nextQuestion: '下一题',
    inputPlaceholder: '请输入...',
    waitingMessage: '等待消息完成后可作答',
    userRejected: '用户拒绝',
    completed: '已完成',
    skip: '跳过',
    submit: '提交',
    continue: '继续',
  },
  task: {
    finishedAt: '完成于 {{time}}',
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

let currentLocale: ChatboxLocale = DEFAULT_LOCALE;
const listeners = new Set<(locale: ChatboxLocale) => void>();

/** Optional label mapper for backend-returned tool names. */
let labelMapper: ((raw: string) => string) | null = null;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === '[object Object]';

const deepMerge = <T extends Record<string, unknown>>(base: T, patch: DeepPartial<T>): T => {
  const out: Record<string, unknown> = { ...base };
  Object.entries(patch).forEach(([k, v]) => {
    if (v == null) return;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as DeepPartial<Record<string, unknown>>);
    } else {
      out[k] = v;
    }
  });
  return out as T;
};

/** Replace the current chatbox locale (deep-merged onto the default). */
export const setChatboxLocale = (patch: DeepPartial<ChatboxLocale>): void => {
  currentLocale = deepMerge(DEFAULT_LOCALE as unknown as Record<string, unknown>, patch as DeepPartial<Record<string, unknown>>) as unknown as ChatboxLocale;
  listeners.forEach((fn) => {
    try {
      fn(currentLocale);
    } catch {
      /* ignore listener errors */
    }
  });
};

/** Return the current locale snapshot. */
export const getChatboxLocale = (): ChatboxLocale => currentLocale;

/** Set a mapper function that translates backend-supplied labels (e.g. tool names). */
export const setBackendLabelMapper = (fn: (raw: string) => string): void => {
  labelMapper = fn;
};

/** Map a backend label through the registered mapper, falling back to the raw string. */
export const mapLabel = (raw: string): string => {
  return labelMapper ? labelMapper(raw) : raw;
};

/** Subscribe to locale changes. Returns an unsubscribe function. */
export const subscribeChatboxLocale = (fn: (locale: ChatboxLocale) => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/**
 * Read a dot-path key (e.g. `hitl.prevQuestion`) and interpolate
 * `{{name}}` placeholders. Falls back to the key itself when missing.
 */
export const t = (
  key: string,
  vars?: Record<string, string | number>,
): string => {
  const parts = key.split('.');
  let cur: unknown = currentLocale;
  for (const p of parts) {
    if (isPlainObject(cur) && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      cur = undefined;
      break;
    }
  }
  let str = typeof cur === 'string' ? cur : key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    });
  }
  return str;
};
