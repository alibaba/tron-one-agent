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


import { EventProcessor } from "../types/chat";
import { EventItem } from "../types/event";
export class EventBuff {
  private events: EventItem[] = [];
  private isProcessing = false;
  private readonly batchSize: number;
  private readonly processor: EventProcessor<EventItem>;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly flushTimeout: number;
  private eventsIdSet: Set<string>;

  constructor(
    batchSize: number,
    processor: EventProcessor<EventItem>,
    flushTimeout = 50 // 默认5秒
  ) {
    if (batchSize <= 0) throw new Error("Batch size must be positive");
    if (flushTimeout < 0) throw new Error("Timeout must be non-negative");

    this.batchSize = batchSize;
    this.processor = processor;
    this.flushTimeout = flushTimeout;
    this.eventsIdSet = new Set<string>();
  }

  push(events: T[]): void {
    // console.log("push events before:", [...this.events]);
    events = events.filter((e) => this.eventsIdSet.has(e.id) === false);
    events.forEach((e) => {
      this.eventsIdSet.add(e.id);
    });
    this.events.push(...events);
    // console.log("push events after:", [...this.events]);
    this.maybeStartProcessing();
  }

  // 👉 核心：只要有事件，就尝试启动处理流程
  private maybeStartProcessing(): void {
    if (this.isProcessing || this.events.length === 0) return;

    // 如果达到 batchSize，立即处理（取消超时）
    if (this.events.length >= this.batchSize) {
      this.cancelTimeout();
      this.processNow();
    }
    // 否则（有事件但不足 batch），启动超时
    else if (this.events.length > 0) {
      this.startTimeout();
    }
  }

  private startTimeout(): void {
    this.cancelTimeout();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.processNow(); // 超时后强制处理所有剩余事件
    }, this.flushTimeout);
  }

  private cancelTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private async processNow(): Promise<void> {
    if (this.isProcessing || this.events.length === 0) return;

    this.isProcessing = true;
    try {
      // 处理逻辑：只要还有事件，就一直处理（避免多次调度）
      while (this.events.length > 0) {
        // 如果够一批，处理一批；否则处理全部（超时场景）
        const takeCount =
          this.events.length >= this.batchSize
            ? this.batchSize
            : this.events.length;

        const batch = this.events.splice(0, takeCount);
        await this.processor(batch);

        // 注意：processor 执行期间可能又有新事件 push 进来
        // 所以我们继续 while 循环，直到清空 or 不足 batch 且无超时触发
      }
    } catch (error) {
      // 错误时不丢弃事件，保留并重新设置超时以便重试
      if (this.events.length > 0) {
        this.startTimeout();
      }
    } finally {
      this.isProcessing = false;
      // 处理完后，再次检查是否有新事件（比如在 processor 执行期间 push 的）
      this.maybeStartProcessing();
    }
  }

  // 可选：提供 destroy 清理资源
  destroy(): void {
    this.cancelTimeout();
    this.events = [];
  }
}
