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


import React, { useCallback } from 'react';
import { BaseMessageInputProps } from './types';
import { useTextareaAutoResize } from './hooks/useTextareaAutoResize';
import { useInputComposition } from './hooks/useInputComposition';
import styles from './index.module.less';

export interface NormalMessageInputProps extends BaseMessageInputProps {}

export function NormalMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder,
}: NormalMessageInputProps) {
  const { textareaRef, adjustHeight } = useTextareaAutoResize();
  const { isComposing, handleCompositionStart, handleCompositionEnd } = useInputComposition();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [isComposing]
  );

  const handleSend = useCallback(() => {
    if (value.trim()) {
      onSend(value);
    }
  }, [value, onSend]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustHeight();
    },
    [onChange, adjustHeight]
  );

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputContainer}>
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
          disabled={!value.trim() || disabled}
          className={styles.sendButton}
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
