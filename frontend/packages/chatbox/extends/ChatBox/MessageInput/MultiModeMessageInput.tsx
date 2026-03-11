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


import React, { useCallback, useMemo } from 'react';
import { BaseMessageInputProps } from './types';
import { useTextareaAutoResize } from './hooks/useTextareaAutoResize';
import { useInputComposition } from './hooks/useInputComposition';
import { useAttachments } from './hooks/useAttachments';
import { AttachmentPreview } from './components/AttachmentPreview';
import { ContentType } from '../../../types/enums';
import styles from './index.module.less';

export interface MultiModeMessageInputProps extends BaseMessageInputProps {}

export function MultiModeMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder,
  supportInputTypes,
}: MultiModeMessageInputProps) {
  const { textareaRef, adjustHeight } = useTextareaAutoResize();
  const { isComposing, handleCompositionStart, handleCompositionEnd } = useInputComposition();

  // 根据 supportInputTypes 计算 accept 属性
  const accept = useMemo(() => {
    if (!supportInputTypes) return 'image/*,video/*';
    const parts: string[] = [];
    if (supportInputTypes.includes(ContentType.IMAGE)) parts.push('image/*');
    if (supportInputTypes.includes(ContentType.VIDEO)) parts.push('video/*');
    if (supportInputTypes.includes(ContentType.AUDIO)) parts.push('audio/*');
    return parts.join(',') || 'image/*,video/*';
  }, [supportInputTypes]);

  const {
    attachments,
    fileInputRef,
    handleFileSelect,
    handleFileChange,
    handleRemoveAttachment,
    clearAttachments,
  } = useAttachments(supportInputTypes);

  const isUploading = attachments.some((a) => a.uploading);

  const handleSend = useCallback(() => {
    if ((value.trim() || attachments.length > 0) && !isUploading) {
      onSend(value, attachments.length > 0 ? [...attachments] : undefined);
      clearAttachments();
    }
  }, [value, attachments, isUploading, onSend, clearAttachments]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [isComposing, handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustHeight();
    },
    [onChange, adjustHeight]
  );

  return (
    <div className={styles.messageInput}>
      <AttachmentPreview attachments={attachments} onRemove={handleRemoveAttachment} />
      <div className={styles.inputContainer}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          title="选择文件"
        />
        <button
          className={styles.attachButton}
          onClick={handleFileSelect}
          disabled={disabled}
          title="上传文件"
        >
          <i className="fas fa-paperclip"></i>
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder || '输入消息... (Enter发送，Shift+Enter换行)'}
          className={styles.messageTextarea}
          rows={2}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={(!value.trim() && attachments.length === 0) || disabled || isUploading}
          className={styles.sendButton}
          title={isUploading ? '文件上传中...' : undefined}
        >
          {disabled ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </div>
    </div>
  );
}
