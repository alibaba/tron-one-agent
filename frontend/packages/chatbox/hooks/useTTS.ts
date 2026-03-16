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

import { useCallback, useRef, useState, useEffect } from "react";

export type TTSStatus = "idle" | "connecting" | "playing" | "paused" | "error";

/**
 * 将 PCM 数据转换为 WAV 格式的 ArrayBuffer
 * @param pcmData PCM 数据的 Uint8Array
 * @param sampleRate 采样率 (如 24000)
 * @param numChannels 声道数 (如 1)
 * @param bitsPerSample 位深度 (如 16)
 */
const pcmToWav = (
  pcmData: Uint8Array,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): ArrayBuffer => {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const bytes = new Uint8Array(buffer, 44);
  bytes.set(pcmData);

  return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export interface UseTTSOptions {
  /** WebSocket URL */
  wsUrl: string;
  /** 文本流完成回调 */
  onComplete?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface UseTTSReturn {
  /** 当前状态 */
  status: TTSStatus;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 是否已暂停 */
  isPaused: boolean;
  /** 开始播放文本 */
  speak: (text: string, completed?: boolean) => void;
  /** 追加文本（流式） */
  appendText: (text: string, completed?: boolean) => void;
  /** 暂停播放 */
  pause: () => void;
  /** 恢复播放 */
  resume: () => void;
  /** 停止播放 */
  stop: () => void;
  /** 标记文本流完成 */
  complete: () => void;
}

/**
 * TTS Hook - 用于实时文本转语音
 * 通过 WebSocket 连接到后端 TTS 服务，接收音频数据并播放
 */
export const useTTS = (options: UseTTSOptions): UseTTSReturn => {
  const { wsUrl, onComplete, onError } = options;

  const [status, setStatus] = useState<TTSStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  // 清理资源
  const cleanup = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
      currentSourceRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    pausedAtRef.current = 0;
    isPausedRef.current = false;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, [cleanup]);

  // 播放音频队列
  const playNext = useCallback(async () => {
    if (
      isPausedRef.current ||
      !audioContextRef.current ||
      audioQueueRef.current.length === 0
    ) {
      if (audioQueueRef.current.length === 0 && isPlayingRef.current) {
        isPlayingRef.current = false;
        setStatus("idle");
      }
      return;
    }

    isPlayingRef.current = true;
    setStatus("playing");
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) return;

    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        currentSourceRef.current = null;
        playNext();
      };

      currentSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      source.start(0, pausedAtRef.current);
      pausedAtRef.current = 0;
    } catch (error) {
      console.error("播放音频失败:", error);
      onError?.(error as Error);
    }
  }, [onError]);

  // 初始化 WebSocket
  const initWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("TTS WebSocket 连接成功");
        if (!isPausedRef.current) {
          setStatus("playing");
        }
      };

      ws.onmessage = async (event) => {
        try {
          // 接收 base64 编码的音频数据
          const base64Data = event.data;
          if (!base64Data || typeof base64Data !== "string") return;

          // 解码 base64
          const binaryString = atob(base64Data);
          const pcmBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            pcmBytes[i] = binaryString.charCodeAt(i);
          }

          // 初始化 AudioContext
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
          }

          // 将 PCM 转换为 WAV 格式 (24000Hz, 单声道, 16位)
          const wavBuffer = pcmToWav(pcmBytes, 24000, 1, 16);

          // 解码音频数据
          const audioBuffer = await audioContextRef.current.decodeAudioData(
            wavBuffer
          );
          audioQueueRef.current.push(audioBuffer);

          // 如果没有正在播放，开始播放
          if (!isPlayingRef.current && !isPausedRef.current) {
            playNext();
          }
        } catch (error) {
          console.error("处理音频数据失败:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("TTS WebSocket 错误:", error);
        setStatus("error");
        onError?.(new Error("WebSocket 连接错误"));
      };

      ws.onclose = () => {
        console.log("TTS WebSocket 连接关闭");
        // 不在 onclose 中改变状态，让 playNext 在队列播完后处理
      };
    } catch (error) {
      console.error("初始化 WebSocket 失败:", error);
      setStatus("error");
      onError?.(error as Error);
    }
  }, [wsUrl, onError, playNext]);

  // 开始播放
  const speak = useCallback(
    (text: string, completed: boolean = false) => {
      // 清理之前的状态
      cleanup();

      // 初始化 WebSocket
      initWebSocket();

      // 发送文本
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              text: text,
              completed: completed,
            })
          );
        }
      }, 100);
    },
    [cleanup, initWebSocket]
  );

  // 追加文本（流式）
  const appendText = useCallback((text: string, completed: boolean = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          text: text,
          completed: completed,
        })
      );
    }
  }, []);

  // 暂停播放
  const pause = useCallback(() => {
    if (audioContextRef.current && currentSourceRef.current) {
      try {
        // 记录暂停位置
        const elapsed =
          audioContextRef.current.currentTime - playbackStartTimeRef.current;
        pausedAtRef.current = elapsed;
        isPausedRef.current = true;

        // 停止当前播放
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
        isPlayingRef.current = false;

        setStatus("paused");
      } catch (e) {
        console.error("暂停失败:", e);
      }
    }
  }, []);

  // 恢复播放
  const resume = useCallback(() => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setStatus("playing");

      // 继续播放队列中的音频
      if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
        playNext();
      }
    }
  }, [playNext]);

  // 停止播放
  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");

    // 发送完成标记关闭连接
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ completed: true }));
    }
  }, [cleanup]);

  // 标记文本流完成
  const complete = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ completed: true }));
    }
    onComplete?.();
  }, [onComplete]);

  return {
    status,
    isPlaying: status === "playing",
    isPaused: status === "paused",
    speak,
    appendText,
    pause,
    resume,
    stop,
    complete,
  };
};

export default useTTS;
