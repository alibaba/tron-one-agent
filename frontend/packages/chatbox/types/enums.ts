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


export enum TaskStatus {
  WAITING = 1,
  EXECUTING = 2,
  SUCCEED = 3,
  FAILED = 4,
}
export enum ActionStatus {
  EXECUTING = 2,
  SUCCEED = 3,
  FAILED = 4,
}
export enum SessionMessageStatus {
  EXECUTING = 2,
  SUCCEED = 3,
  FAILED = 4,
}

export enum SessionEventType {
  SESSION_NAME_CHANGED = 1,

  NEW_USER_INPUT = 10,

  NEW_AGENT_MESSAGE = 20,
  AGENT_MESSAGE_APPEND_CONTENT = 21,
  AGENT_MESSAGE_STATUS_CHANGED = 22,

  TASK_APPEND_CONTENT = 30,
  TASK_STATUS_CHANGED = 31,

  ACTION_APPEND_CONTENT = 40,
  ACTION_STATUS_CHANGED = 41,
}

export enum SessionMessageType {
  USER = 1,
  AGENT = 2,
}

export enum ContentType {
  TEXT = 1,
  THINKING = 2,
  IMAGE = 3,
  VIDEO = 4,
  AUDIO = 5,
  TASK = 100,
  ACTION = 200,
}
