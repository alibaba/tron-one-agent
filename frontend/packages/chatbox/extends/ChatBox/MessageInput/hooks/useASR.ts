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

import { useState, useRef, useCallback } from 'react';

export type ASRStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'error';

interface ASRResponse {
  success: boolean;
  text?: string;
  finished?: boolean;
  error?: string;
}

interface UseASROptions {
  wsUrl?: string;
  onText?: (text: string) => void;
  onFinalText?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseASRReturn {
  status: ASRStatus;
  text: string;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export function useASR(options: UseASROptions = {}): UseASRReturn {
  const { wsUrl, onText, onFinalText, onError } = options;

  const [status, setStatus] = useState<ASRStatus>('idle');
  const [text, setText] = useState('');
  const statusRef = useRef<ASRStatus>('idle');

  // 使用 ref 存储回调，确保 WebSocket 回调中始终调用最新的函数
  const onTextRef = useRef(onText);
  const onFinalTextRef = useRef(onFinalText);
  const onErrorRef = useRef(onError);
  onTextRef.current = onText;
  onFinalTextRef.current = onFinalText;
  onErrorRef.current = onError;

  // 同步更新状态和 ref
  const updateStatus = useCallback((newStatus: ASRStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // ScriptProcessorNode 已弃用但仍可用，AudioWorklet 需要单独的 worker 文件
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const accumulatedTextRef = useRef('');

  // 清理资源
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  // 取消录音
  const cancelRecording = useCallback(() => {
    cleanup();
    setText('');
    accumulatedTextRef.current = '';
    updateStatus('idle');
  }, [cleanup, updateStatus]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (statusRef.current !== 'recording') return;

    updateStatus('processing');

    // 发送完成信号
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ completed: true }));
    }

    // 停止录音资源
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [updateStatus]);

  // 开始录音
  const startRecording = useCallback(async () => {
    if (statusRef.current === 'recording' || statusRef.current === 'connecting') return;

    // 重置状态
    setText('');
    accumulatedTextRef.current = '';
    updateStatus('connecting');

    try {
      // 获取麦克风权限
      console.log('ASR: 请求麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log('ASR: 麦克风权限获取成功');
      streamRef.current = stream;

      // 创建 AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const audioContext = audioContextRef.current;

      // 创建音频源
      sourceRef.current = audioContext.createMediaStreamSource(stream);

      // 创建处理器节点（用于获取 PCM 数据）
      // bufferSize 不能太大，否则会超过 WebSocket 消息大小限制
      const bufferSize = 1024;
      processorRef.current = audioContext.createScriptProcessor(bufferSize, 1, 1);

      // 建立 WebSocket 连接
      const url = wsUrl || `ws://${window.location.host}/asr`;
      console.log('ASR: 连接 WebSocket:', url);
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('ASR: WebSocket 连接成功，开始录音');
        updateStatus('recording');
        
        // 开始处理音频
        if (processorRef.current && sourceRef.current && audioContextRef.current) {
          // 使用 addEventListener 避免直接使用已弃用的 onaudioprocess 属性
          processorRef.current.addEventListener('audioprocess', (e: AudioProcessingEvent) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              // 转换为 16bit PCM
              const pcmData = float32ToInt16(inputData);
              // 转换为 base64
              const base64Data = arrayBufferToBase64(pcmData.buffer);
              debugger
              wsRef.current.send(JSON.stringify({ dataBase64: base64Data }));
            }
          });
          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const response: ASRResponse = JSON.parse(event.data);
          console.log('ASR: 收到响应:', response);

          if (response.success === false) {
            console.error('ASR 错误:', response.error);
            onErrorRef.current?.(new Error(response.error || 'ASR 服务不可用'));
            updateStatus('error');
            cleanup();
            return;
          }

          if (response.text) {
            accumulatedTextRef.current = response.text;
            setText(response.text);
            onTextRef.current?.(response.text);
          }

          if (response.finished) {
            console.log('ASR: 识别完成');
            onFinalTextRef.current?.(accumulatedTextRef.current);
            cleanup();
            updateStatus('idle');
          }
        } catch (error) {
          console.error('ASR: 解析响应失败:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('ASR: WebSocket 错误:', error);
        onErrorRef.current?.(new Error('WebSocket 连接错误'));
        updateStatus('error');
        cleanup();
      };

      wsRef.current.onclose = (event) => {
        console.log('ASR: WebSocket 连接关闭, code:', event.code, 'reason:', event.reason);
        if (statusRef.current === 'recording' || statusRef.current === 'processing' || statusRef.current === 'connecting') {
          updateStatus('idle');
        }
      };
    } catch (error) {
      console.error('ASR: 获取麦克风权限失败:', error);
      onErrorRef.current?.(error as Error);
      updateStatus('error');
      cleanup();
    }
  }, [wsUrl, cleanup, updateStatus]);

  return {
    status,
    text,
    isRecording: status === 'recording' || status === 'connecting',
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

// 将 Float32Array 转换为 Int16Array (16bit PCM)
function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

// 将 ArrayBuffer 转换为 base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
