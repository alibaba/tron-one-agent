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


import {
  SessionMessageType,
  SessionMessageStatus,
  ContentType,
  TaskStatus,
  ActionStatus,
} from "../types/enums";

export interface SessionMessage {
  id: number;
  type: SessionMessageType;
  status: SessionMessageStatus;
  agentId?: string;
  userId?: string;
  sessionId?: string;
  gmtCreate: string;
  gmtModified: string;
}

export interface UserSessionMessage extends SessionMessage {
  type: SessionMessageType;

  status: SessionMessageStatus;

  name?: string;
  contents: Array<TextContent | MediaContent>;
}

export interface AgentSessionMessage extends SessionMessage {
  type: SessionMessageType.AGENT;

  contents: Array<TextContent | MediaContent | TaskContent | ActionContent>;
  gmtFinished?: string | null;
}

export interface Content {
  id?: number | null;
}
export interface TextContent extends Content {
  type: ContentType;
  text: string;
}
export interface MediaContent extends Content {
  id: number | null;
  type: ContentType;
  url?: string | null;
  base64_data?: string | null;
  media_type?: string | null;
}
export interface ActionContent extends Content {
  type: ContentType.ACTION;

  status: ActionStatus;
  title: string;
  contents: Array<TextContent | MediaContent>;

  gmtCreated: string;
  gmtModified: string;
  gmtFinished?: string | null;
}
export interface TaskContent extends Content {
  type: ContentType.TASK;

  agentId: string;
  status: TaskStatus;

  title: string;
  description: string;
  result?: string | null;
  contents: Array<TextContent | MediaContent | ActionContent>;

  gmtCreated: string;
  gmtModified: string;
  gmtFinished?: string;
}
