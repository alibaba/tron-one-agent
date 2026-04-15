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
}

export abstract class EventSourceService {
  protected messageListeners: Array<(event: EventItem) => void> = [];
  protected errorListeners: Array<(error: any) => void> = [];
  protected connectionChangeListeners: Array<(connected: boolean) => void> = [];

  protected _sessionId: string = "";
  protected _lastEventId: number = 0;
  protected destroyed: boolean = false;

  constructor(protected options?: EventSourceOptions) {}

  get sessionId(): string {
    return this._sessionId;
  }

  get lastEventId(): number {
    return this._lastEventId;
  }

  set sessionId(id: string) {
    this._sessionId = id;
  }

  set lastEventId(id: number) {
    this._lastEventId = id;
  }

  abstract start(): void;
  abstract stop(): void;

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
