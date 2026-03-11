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


import { UserSessionMessage, AgentSessionMessage } from "./base";
import { EventItem } from "./event";
import { EventSourceService } from "./EventSource";
import { SessionMessageStatus } from "./enums";

export interface PageResult<T> {
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  records: T[];
}
export interface Session {
  id: string;
  userId: string;
  agentId: string;
  name?: string;
  lastAppliedEventId: number;
  gmtCreated?: string | null;
  gmtModified?: string | null;

  messages?: PageResult<UserSessionMessage | AgentSessionMessage> | null;
}

export type PoolingRequestProcessor = (
  options: {
    sessionId: string;
    lastEventId: number;
    maxStep?: number;
  },
  stop: () => void
) => Promise<EventItem[]>;

export interface UseChatConfig {
  initialData?: Omit<ChatState, "running">;
  eventSource: EventSourceService;
}

export interface UseChatReturn {
  data: {
    sessionId?: string;
    lastEventId?: number;
    messages?: Array<UserSessionMessage | AgentSessionMessage>;
    sessionName?: string;
  };
  running: boolean;
  run: () => void;
  stop: () => void;
  update: (options: Partial<ChatState>) => void;
  reset: () => void;
  sendUserMessageShawde: (userMessage: {
    id: UserSessionMessage["id"];
    contents: UserSessionMessage["contents"];
    status: UserSessionMessage["status"];
  }) => void;

  updateUserMessageShawdeStatus: (
    messageId: UserSessionMessage["id"],
    status: SessionMessageStatus
  ) => void;
}

export interface ChatState {
  sessionName: string;
  messages: Array<UserSessionMessage | AgentSessionMessage>;
  sessionId: string;
  lastEventId: number;
}
export type ChatReducerFn = (state: ChatState, action: ChatAction) => ChatState;

export const Default_Chat_State: ChatState = {
  sessionName: "新会话",
  messages: [],
  sessionId: "",
  lastEventId: 0,
};

export enum ChatActionType {
  INIT = "INIT",
  REST_STATE = "REST_STATE",
  PATCH_STATE = "PATCH_STATE",
  UPDATE_CHAT_MESAGE_LIST_BY_EVENTS = "UPDATE_CHAT_MESAGE_LIST_BY_EVENTS",
  ADD_USER_MESSAGE_SHAWDE = "ADD_USER_MESSAGE_SHAWDE",
  UPDATE_USER_MESSAGE_SHAWDE_STATUS = "UPDATE_USER_MESSAGE_SHAWDE_STATUS",
}
export type RestChatAction = {
  type: ChatActionType.REST_STATE;
};
export type PatchChatAction = {
  type: ChatActionType.PATCH_STATE;
  payload: Partial<ChatState>;
};
export type UpdateChatMesageListByEventsAction = {
  type: ChatActionType.UPDATE_CHAT_MESAGE_LIST_BY_EVENTS;
  payload: EventItem[];
};
export type AddUserMessageShawdeAction = {
  type: ChatActionType.ADD_USER_MESSAGE_SHAWDE;
  payload: {
    id: UserSessionMessage["id"];
    status: UserSessionMessage["status"];
    contents: UserSessionMessage["contents"];
  };
};
export type UpdateUserMessageShawdeStatusAction = {
  type: ChatActionType.UPDATE_USER_MESSAGE_SHAWDE_STATUS;
  payload: {
    messageId: UserSessionMessage["id"];
    status: UserSessionMessage["status"];
  };
};
export type ChatAction =
  | RestChatAction
  | PatchChatAction
  | UpdateChatMesageListByEventsAction
  | AddUserMessageShawdeAction
  | UpdateUserMessageShawdeStatusAction;

export type EventProcessor<T> = (events: T[]) => Promise<void>;
