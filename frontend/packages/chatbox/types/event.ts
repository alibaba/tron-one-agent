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


import { SessionEventType, TaskStatus, ActionStatus, SessionMessageStatus } from "../types/enums";
import {
  UserSessionMessage,
  AgentSessionMessage,
  TaskContent,
  MediaContent,
  TextContent,
  ActionContent,
} from "./base";

export interface SessionEvent {
  id: number;
  agentId: string;
  userId: string;
  sessionId: string;
  type: SessionEventType;
  gmtCreated: string;
}

export interface SessionNameChangedEvent extends SessionEvent {
  type: SessionEventType.SESSION_NAME_CHANGED;
  newName: string;
}

export interface NewUserInputEvent extends SessionEvent {
  type: SessionEventType.NEW_USER_INPUT;
  msg: UserSessionMessage;
}
export interface NewAgentMessageEvent extends SessionEvent {
  type: SessionEventType.NEW_AGENT_MESSAGE;

  msg: AgentSessionMessage;
}

export interface AgentMessageAppendContentEvent extends SessionEvent {
  type: SessionEventType.AGENT_MESSAGE_APPEND_CONTENT;

  messageId: number;
  newContents: Array<TextContent | MediaContent | TaskContent | ActionContent>;
}

export interface AgentMessageStatusChangedEvent extends SessionEvent {
  type: SessionEventType.AGENT_MESSAGE_STATUS_CHANGED;

  messageId: number;
  newStatus: SessionMessageStatus;
  gmtFinished: string;
}

export interface TaskAppendContentEvent extends SessionEvent {
  type: SessionEventType.TASK_APPEND_CONTENT;

  messageId: number;
  taskId: number;
  newContents: Array<TextContent | MediaContent | ActionContent>;
}

export interface TaskStatusChangeEvent extends SessionEvent {
  type: SessionEventType.TASK_STATUS_CHANGED;

  messageId: number;
  taskId: number;
  newStatus: TaskStatus;
  result?: string | null;
  gmtFinished?: string | null;
}

export interface ActionAppendContentEvent extends SessionEvent {
  type: SessionEventType.ACTION_APPEND_CONTENT;

  messageId: number;
  actionId: number;
  newContents: Array<TextContent | MediaContent>;
}

export interface ActionStatusChangeEvent extends SessionEvent {
  type: SessionEventType.ACTION_STATUS_CHANGED;

  messageId: number;
  actionId: number;
  newStatus: ActionStatus;
  gmtFinished?: string | null;
}

export type EventItem =
  | SessionNameChangedEvent
  | NewUserInputEvent
  | NewAgentMessageEvent
  | AgentMessageAppendContentEvent
  | AgentMessageStatusChangedEvent
  | TaskAppendContentEvent
  | TaskStatusChangeEvent
  | ActionAppendContentEvent
  | ActionStatusChangeEvent;
