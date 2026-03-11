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


// core/WebSocketEventSource.ts
import { EventSourceService, EventSourceOptions } from "./EventSource";
import { EventItem } from "../types";

export interface WebSocketEventSourceOptions extends EventSourceOptions {
  urlBuilder: (params: { sessionId: string; lastEventId: number }) => string;
  protocols?: string | string[];
  reconnectInterval?: number; // 重连间隔，默认3000ms
  maxReconnectAttempts?: number; // 最大重连次数，默认无限
}

export class WebSocketEventSource extends EventSourceService {
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(protected readonly options: WebSocketEventSourceOptions) {
    super(options);
  }

  start(): void {
    if (this.websocket && this.isConnected || this.destroyed) return;

    const url = this.options.urlBuilder({
      sessionId: this.sessionId,
      lastEventId: this.lastEventId
    });

    try {
      this.websocket = this.options.protocols 
        ? new WebSocket(url, this.options.protocols)
        : new WebSocket(url);

      this.setupWebSocketListeners();
    } catch (error) {
      this.emitError(error);
      this.scheduleReconnect();
    }
  }

  stop(): void {
    this.clearReconnectTimer();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.isConnected) {
      this.isConnected = false;
      this.emitConnectionChange(false);
    }
  }

  updateSessionInfo(sessionId: string, lastEventId: number): void {
    this.sessionId = sessionId;
    this.lastEventId = lastEventId;
    
    // 如果正在运行，重新连接以使用新的session信息
    if (this.websocket) {
      this.stop();
      this.start();
    }
  }

  private setupWebSocketListeners(): void {
    if (!this.websocket) return;

    this.websocket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emitConnectionChange(true);
    };

    this.websocket.onmessage = (event) => {
      try {
        const eventData: EventItem = JSON.parse(event.data);
        this.lastEventId = eventData.id;
        this.emitMessage(eventData);
      } catch (error) {
        this.emitError(error);
      }
    };

    this.websocket.onerror = (error) => {
      this.emitError(error);
    };

    this.websocket.onclose = () => {
      this.isConnected = false;
      this.emitConnectionChange(false);
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const { reconnectInterval = 3000, maxReconnectAttempts } = this.options;
    
    // 检查是否达到最大重连次数
    if (maxReconnectAttempts && this.reconnectAttempts >= maxReconnectAttempts) {
      this.emitError(new Error('Max reconnection attempts reached'));
      return;
    }
    
    this.reconnectAttempts++;
    this.clearReconnectTimer();
    
    this.reconnectTimer = setTimeout(() => {
      this.start();
    }, reconnectInterval);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}