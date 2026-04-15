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


import { ContentType } from '../../../types/enums';

export interface AttachmentItem {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'audio';
  serverUrl?: string;    // 上传成功后服务器返回的 URL
  uploading?: boolean;   // 是否正在上传中
  uploadError?: boolean; // 是否上传失败
}

/**
 * 语音输入模式
 * - text: 语音转文本后发送文本
 * - audio: 直接发送音频数据
 */
export type VoiceInputMode = 'text' | 'audio';

/**
 * 语音输入配置
 */
export interface VoiceInputConfig {
  /** 是否启用语音输入 */
  enabled?: boolean;
  /** 语音输入模式，默认 'text' */
  mode?: VoiceInputMode;
  /** ASR WebSocket URL */
  wsUrl?: string;
}

export interface BaseMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string, attachments?: AttachmentItem[]) => void;
  /** 发送音频数据（预留接口，用于 audio 模式） */
  onSendAudio?: (audioData: Blob) => void;
  disabled?: boolean;
  /** Agent 正在回复中 */
  running?: boolean;
  /** 中断回调 */
  onStop?: () => void;
  placeholder?: string;
  supportInputTypes?: ContentType[];
  options?: {
    enableThinking?: boolean;
  };
  onOptionsChanged?: (options: { enableThinking: boolean }) => void;
  /** 语音输入配置 */
  voiceInput?: VoiceInputConfig;
}
