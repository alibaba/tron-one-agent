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


// core/SseEventSource.ts
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { EventSourceService, EventSourceOptions } from "./EventSource";
import { EventItem } from "../types";

export interface SseEventSourceOptions extends EventSourceOptions {
  urlBuilder: (params: { sessionId: string; lastEventId: number }) => string;
  headers?: Record<string, string>;
}

export class SseEventSource extends EventSourceService {
  private abortController: AbortController | null = null;
  private isConnected: boolean = false;

  constructor(protected readonly options: SseEventSourceOptions) {
    super(options);
  }

  async start(): Promise<void> {
    console.log("Starting SseEventSource...");
    // 如果已经连接或已被销毁，则不执行操作
    if (this.isConnected || this.destroyed) {
      return;
    }

    // 断开现有连接（如果有）
    this.stop();

    const url = this.options.urlBuilder({
      sessionId: this.sessionId,
      lastEventId: this.lastEventId,
    });

    this.abortController = new AbortController();

    try {
      await fetchEventSource(url, {
        signal: this.abortController.signal,
        headers: this.options.headers || {},

        onopen: async (response) => {
          if (
            response.ok &&
            response.headers.get("content-type") === "text/event-stream"
            // "text/event-stream; charset=utf-8
          ) {
            this.isConnected = true;
            this.emitConnectionChange(true);
            return;
          }
          throw new Error(
            `连接失败: ${response.status} ${response.statusText}`
          );
        },

        onmessage: (event) => {
          try {
            // 外部突然终止，则舍弃后续事件
            if (!this.abortController === null) return;
            const eventData: EventItem = JSON.parse(event.data);
            this.lastEventId = eventData.id;
            this.emitMessage(eventData);
          } catch (error) {
            this.emitError(new Error("消息解析失败: " + event.data));
          }
        },

        onerror: (error) => {
          if (error instanceof Error && error.name !== "AbortError") {
            this.emitError(error);
          }
          this.handleDisconnect();
        },

        onclose: () => {
          this.handleDisconnect();
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        this.emitError(error);
      }
      this.handleDisconnect();
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.emitConnectionChange(false);
    }
  }
}
