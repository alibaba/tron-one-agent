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


// core/useChatModel.ts
import { useCallback, useReducer, useState, useEffect, useRef } from "react";
import {
  ChatAction,
  ChatState,
  ChatActionType,
  UseChatConfig,
  UseChatReturn,
  EventItem,
  SessionEventType,
  SessionMessageStatus,
  Default_Chat_State,
  UserSessionMessage,
  SessionMessageType,
} from "../types";
import { updateMessageListByEvents } from "../utils/updateMessagesByEvents";
import { EventBuff } from "../eventBuffer/eventbuffer";

function useLazyRef<T>(createFn: () => T) {
  const ref = useRef<T>();
  if (ref.current === undefined) {
    ref.current = createFn();
  }
  return ref;
}

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case ChatActionType.REST_STATE:
      return { ...Default_Chat_State };
    case ChatActionType.PATCH_STATE:
      return { ...state, ...action.payload };
    case ChatActionType.UPDATE_CHAT_MESAGE_LIST_BY_EVENTS:
      return {
        ...state,
        ...updateMessageListByEvents(state, action.payload),
      };
    case ChatActionType.ADD_USER_MESSAGE_SHAWDE: {
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            ...action.payload,
            type: SessionMessageType.USER,
            gmtCreate: new Date().toISOString(),
            gmtModified: new Date().toISOString(),
            status: SessionMessageStatus.EXECUTING,
          },
        ],
      };
    }
    case ChatActionType.UPDATE_USER_MESSAGE_SHAWDE_STATUS: {
      const messages = [...state.messages];
      const userMessage = messages.find(
        (item) =>
          item.id === action.payload.messageId &&
          item.type === SessionMessageType.USER
      );
      if (userMessage) {
        userMessage.status = action.payload.status;
      } else {
        return state;
      }
    }

    default:
      return state;
  }
};

export const useChatModel = (config: UseChatConfig): UseChatReturn => {
  const { initialData, eventSource } = config;
  const [running, setRunning] = useState<boolean>(false);
  const [state, dispatch] = useReducer(chatReducer, {
    ...Default_Chat_State,
    ...initialData,
  });
  const [initialized, setInitialized] = useState<boolean>(false);

  const eventBufferRef = useLazyRef<EventBuff>(
    () =>
      new EventBuff(
        10,
        async (events: EventItem[]) => {
          dispatch({
            type: ChatActionType.UPDATE_CHAT_MESAGE_LIST_BY_EVENTS,
            payload: events,
          });
        },
        100
      )
  );

  const run = useCallback(() => {
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
  }, []);

  // 设置 eventSource 的事件监听器
  useEffect(() => {
    if (!eventSource) return;
    const unsubscribeMessage = eventSource.onMessage((event: EventItem) => {
      if (
        event.type === SessionEventType.AGENT_MESSAGE_STATUS_CHANGED &&
        event.newStatus !== SessionMessageStatus.EXECUTING
      ) {
        stop();
      }
      eventBufferRef.current?.push([event]);
      eventSource.lastEventId = event.id;
    });

    const unsubscribeConnection = eventSource.onConnectionChange(
      (connected: boolean) => {
        console.log("EventSource 连接状态改变:", connected);
      }
    );

    const unsubscribeError = eventSource.onError((error: any) => {
      console.error("EventSource 连接错误:", error);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      unsubscribeError();
    };
  }, [eventSource, stop]);

  // 初始化完成后检查消息并决定是否运行
  useEffect(() => {
    if (!initialized && state.messages && eventSource) {
      eventSource.sessionId = state?.sessionId || "";
      eventSource.lastEventId = state?.lastEventId || 0;
      setInitialized(true);
      const lastMessage = state.messages[state.messages.length - 1];
      if (
        lastMessage &&
        lastMessage.type === SessionMessageType.AGENT &&
        lastMessage.status === SessionMessageStatus.EXECUTING
      ) {
        setRunning(true);
      }
    }
  }, [state, initialized, eventSource]);

  useEffect(() => {
    if (running) {
      eventSource?.start();
    } else {
      eventSource?.stop();
    }

    return () => {
      eventSource?.stop();
    };
  }, [running, eventSource]);

  const update = useCallback(
    (options: Partial<ChatState>) => {
      if (options.hasOwnProperty("lastEventId")) {
        eventSource.lastEventId = options.lastEventId!;
      }
      if (options.hasOwnProperty("sessionId")) {
        eventSource.sessionId = options.sessionId!;
      }
      dispatch({
        type: ChatActionType.PATCH_STATE,
        payload: options,
      });
    },
    [eventSource]
  );

  const reset = useCallback(() => {
    stop();
    dispatch({ type: ChatActionType.REST_STATE });
    eventBufferRef.current?.destroy();
    eventSource.sessionId = "";
    eventSource.lastEventId = 0;
  }, [eventSource, stop]);

  const sendUserMessageShawde: UseChatReturn["sendUserMessageShawde"] =
    useCallback((content) => {
      dispatch({
        type: ChatActionType.ADD_USER_MESSAGE_SHAWDE,
        payload: content,
      });
    }, []);

  const updateUserMessageShawdeStatus: UseChatReturn["updateUserMessageShawdeStatus"] =
    useCallback((messageId, status) => {
      dispatch({
        type: ChatActionType.UPDATE_USER_MESSAGE_SHAWDE_STATUS,
        payload: { messageId, status },
      });
    }, []);

  return {
    run,
    stop,
    running,
    data: state,
    update,
    reset,
    sendUserMessageShawde,
    updateUserMessageShawdeStatus,
  };
};
