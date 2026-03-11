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

export interface BaseMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string, attachments?: AttachmentItem[]) => void;
  disabled?: boolean;
  placeholder?: string;
  supportInputTypes?: ContentType[];
  options?: {
    enableThinking?: boolean;
  };
  onOptionsChanged?: (options: { enableThinking: boolean }) => void;
}
