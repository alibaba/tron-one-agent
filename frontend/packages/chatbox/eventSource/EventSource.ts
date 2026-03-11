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


import { EventItem } from "../types/event";

export interface EventSourceOptions {
  // 可根据需要添加通用选项
}

export abstract class EventSourceService {
  protected messageListeners: Array<(event: EventItem) => void> = [];
  protected errorListeners: Array<(error: any) => void> = [];
  protected connectionChangeListeners: Array<(connected: boolean) => void> = [];

  // 添加 sessionId 和 lastEventId 属性
  protected _sessionId: string = "";
  protected _lastEventId: number = 0;
  protected destroyed: boolean = false;

  constructor(protected options?: EventSourceOptions) {}

  // 提供 getter 方法供外部访问
  get sessionId(): string {
    return this._sessionId;
  }

  get lastEventId(): number {
    return this._lastEventId;
  }

  // 提供 setter 方法供外部更新
  set sessionId(id: string) {
    this._sessionId = id;
  }

  set lastEventId(id: number) {
    this._lastEventId = id;
  }

  // 抽象方法，子类必须实现
  abstract start(): void;
  abstract stop(): void;

  // 事件监听方法
  onMessage(callback: (event: EventItem) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  onError(callback: (error: any) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter((cb) => cb !== callback);
    };
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeListeners.push(callback);
    return () => {
      this.connectionChangeListeners = this.connectionChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // 保护方法，供子类调用触发事件
  protected emitMessage(event: EventItem): void {
    this.messageListeners.forEach((callback) => callback(event));
  }

  protected emitError(error: any): void {
    this.errorListeners.forEach((callback) => callback(error));
  }

  protected emitConnectionChange(connected: boolean): void {
    this.connectionChangeListeners.forEach((callback) => callback(connected));
  }
}
