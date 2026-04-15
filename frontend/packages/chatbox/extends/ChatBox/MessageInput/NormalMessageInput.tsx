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
import { useASR } from './hooks/useASR';
import styles from './index.module.less';

export interface NormalMessageInputProps extends BaseMessageInputProps {}

export function NormalMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  running = false,
  onStop,
  placeholder,
  voiceInput,
}: NormalMessageInputProps) {
  const { textareaRef, adjustHeight } = useTextareaAutoResize();
  const { isComposing, handleCompositionStart, handleCompositionEnd } = useInputComposition();

  // 语音输入
  const voiceEnabled = voiceInput?.enabled ?? false;
  const voiceMode = voiceInput?.mode ?? 'text';

  // 语音识别实时文本回调
  const handleASRText = useCallback((text: string) => {
    if (voiceMode === 'text') {
      onChange(text);
      adjustHeight();
    }
  }, [voiceMode, onChange, adjustHeight]);

  // 语音识别最终文本回调
  const handleASRFinalText = useCallback((text: string) => {
    if (voiceMode === 'text' && text) {
      onChange(text);
      adjustHeight();
    }
  }, [voiceMode, onChange, adjustHeight]);

  const { 
    isRecording,
    startRecording, 
    stopRecording,
  } = useASR({
    wsUrl: voiceInput?.wsUrl,
    onText: handleASRText,
    onFinalText: handleASRFinalText,
  });

  const handleSend = useCallback(() => {
    if (value.trim()) {
      onSend(value);
    }
  }, [value, onSend]);

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

  // 处理语音按钮点击
  const handleVoiceClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputContainer}>
        {/* 语音输入按钮 */}
        {voiceEnabled && (
          <button
            className={`${styles.voiceButton} ${isRecording ? styles.recording : ''}`}
            onClick={handleVoiceClick}
            disabled={disabled}
            title={isRecording ? '停止录音' : '语音输入'}
          >
            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={isRecording ? '正在录音...' : (placeholder || '输入消息... (Enter发送，Shift+Enter换行)')}
          className={styles.messageTextarea}
          rows={2}
          disabled={disabled || isRecording}
        />
        <button
          onClick={running && onStop ? onStop : handleSend}
          disabled={running ? !onStop : (!value.trim() || disabled || isRecording)}
          className={`${styles.sendButton}${running && onStop ? ` ${styles.stopButton}` : ''}`}
        >
          {running && onStop ? (
            <i className="fas fa-stop"></i>
          ) : disabled ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </div>
    </div>
  );
}
