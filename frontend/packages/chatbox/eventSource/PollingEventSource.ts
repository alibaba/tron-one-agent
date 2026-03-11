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


// core/PollingEventSource.ts
import { EventSourceService, EventSourceOptions } from "./EventSource";
import { EventItem } from "../types";

export interface PollingEventSourceOptions extends EventSourceOptions {
  request: (params: {
    sessionId: string;
    lastEventId: number;
  }) => Promise<EventItem[]>;
  interval?: number; // 轮询间隔，默认1000ms
}

export class PollingEventSource extends EventSourceService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(protected readonly options: PollingEventSourceOptions) {
    super(options);
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.emitConnectionChange(true);

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const events = await this.options.request({
          sessionId: this.sessionId,
          lastEventId: this.lastEventId,
        });
        // 外部突然终止，则舍弃后续事件
        if (!this.isRunning) {
          return;
        }
        if (Array.isArray(events)) {
          events.forEach((event) => {
            this.lastEventId = event.id;
            this.emitMessage(event);
          });
        }
      } catch (error) {
        this.emitError(error);
      }
    };

    // 立即执行一次
    poll();

    // 设置定时轮询
    const interval = this.options.interval ?? 1000;
    this.intervalId = setInterval(poll, interval);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emitConnectionChange(false);
  }
}
