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
    if (this.isConnected || this.destroyed) {
      return;
    }

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
        openWhenHidden: true,

        onopen: async (response) => {
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("text/event-stream")
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
            if (this.abortController === null) return;
            const eventData: EventItem = JSON.parse(event.data);
            this.lastEventId = eventData.id;
            this.emitMessage(eventData);
          } catch (error) {
            // 解析失败时抛出错误，库会传递给 onerror 统一处理
            throw new Error("消息解析失败: " + event.data);
          }
        },

        onerror: (error) => {
          if (error instanceof Error && error.name !== "AbortError") {
            this.emitError(error);
          }
          this.handleDisconnect();
          throw error;
        },

        onclose: () => {
          this.handleDisconnect();
        },
      });
    } catch (error) {
      // onerror 中已 emitError 并 handleDisconnect，此处仅兜底
      // 处理未经 onerror 路径的异常（如 fetchEventSource 调用本身失败）
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
