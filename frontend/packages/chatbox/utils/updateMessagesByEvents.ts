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
  EventItem,
  SessionNameChangedEvent,
  ContentType,
  ChatState,
  UserSessionMessage,
  AgentSessionMessage,
  SessionEventType,
  TaskContent,
  ActionContent,
  NewUserInputEvent,
  NewAgentMessageEvent,
  AgentMessageAppendContentEvent,
  AgentMessageStatusChangedEvent,
  TextContent,
  TaskAppendContentEvent,
  TaskStatusChangeEvent,
  ActionAppendContentEvent,
  ActionStatusChangeEvent,
  SessionMessageType,
} from "../types";
// 辅助函数：查找并更新消息
function findAndUpdateMessage(
  messages: Array<UserSessionMessage | AgentSessionMessage>,
  messageId: number,
  updater: (message: AgentSessionMessage) => void
): Array<AgentSessionMessage | UserSessionMessage> {
  const index = messages.findIndex((msg) => msg.id === messageId);
  if (index === -1) return messages;

  const newMessages = [...messages];
  newMessages[index] = { ...messages[index] };
  updater(newMessages[index] as AgentSessionMessage);
  return newMessages;
}

// 辅助函数：查找并更新任务
function findAndUpdateTask(
  message: AgentSessionMessage,
  taskId: number,
  updater: (task: TaskContent) => void
): void {
  const index = message.contents.findIndex(
    (content) => content.type === ContentType.TASK && content.id === taskId
  );
  if (index === -1) return;

  message.contents = [...message.contents];
  message.contents[index] = { ...message.contents[index] };
  updater(message.contents[index] as TaskContent);
}

// 辅助函数：查找并更新动作
function findAndUpdateAction(
  message: AgentSessionMessage,
  actionId: number,
  updater: (action: ActionContent) => void
): void {
  const index = message.contents.findIndex(
    (content) => content.type === ContentType.ACTION && content.id === actionId
  );
  if (index !== -1) {
    message.contents = [...message.contents];
    message.contents[index] = { ...message.contents[index] };
    updater(message.contents[index] as ActionContent);
  } else {
    const taskActionIndex: number[] = [];
    message.contents.forEach((content, msgContentIndex) => {
      if (content.type === ContentType.TASK) {
        const taskContentIndex = (content as TaskContent).contents.findIndex(
          (taskContent) =>
            taskContent.type === ContentType.ACTION &&
            taskContent.id === actionId
        );
        if (taskContentIndex !== -1) {
          taskActionIndex.push(msgContentIndex);
          taskActionIndex.push(taskContentIndex);
        }
      }
    });
    if (taskActionIndex.length > 0) {
      const task = message.contents[taskActionIndex[0]] as TaskContent;
      task.contents = [...task.contents];
      task.contents[taskActionIndex[1]] = {
        ...task.contents[taskActionIndex[1]],
      };
      updater(task.contents[taskActionIndex[1]] as ActionContent);
    }
  }
}

// 事件处理器
const eventHandlers: Record<
  SessionEventType,
  (state: ChatState, event: EventItem) => ChatState
> = {
  [SessionEventType.SESSION_NAME_CHANGED]: (state, event) => {
    const e = event as SessionNameChangedEvent;
    return { ...state, sessionName: e.newName };
  },

  [SessionEventType.NEW_USER_INPUT]: (state, event) => {
    const e = event as NewUserInputEvent;
    if (
      state.messages[state.messages.length - 1]?.type ===
      SessionMessageType.USER
    ) {
      const messages = [...state.messages];
      messages[state.messages.length - 1] = e.msg;
      return {
        ...state,
        messages,
      };
    }
    return {
      ...state,
      messages: [...state.messages, e.msg],
    };
  },

  [SessionEventType.NEW_AGENT_MESSAGE]: (state, event) => {
    const e = event as NewAgentMessageEvent;
    return {
      ...state,
      messages: [...state.messages, e.msg],
    };
  },

  [SessionEventType.AGENT_MESSAGE_APPEND_CONTENT]: (state, event) => {
    const e = event as AgentMessageAppendContentEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        const contents = [...message.contents];
        e.newContents.forEach((content) => {
          if (
            content.type === ContentType.TEXT ||
            content.type === ContentType.THINKING
          ) {
            const lastIndex = contents.length - 1;
            if (
              lastIndex >= 0 &&
              contents[lastIndex].type === ContentType.TEXT
            ) {
              contents[lastIndex] = {
                ...contents[lastIndex],
                text:
                  (contents[lastIndex] as TextContent).text +
                  (content as TextContent).text,
              };
            } else {
              contents.push({
                type: ContentType.TEXT,
                text: (content as TextContent).text || "",
              });
            }
          } else if (content.type === ContentType.TASK) {
            console.log("task content:", content);
            contents.push({
              ...content,
            });
          } else if (content.type === ContentType.ACTION) {
            console.log("action content:", content);
            contents.push({
              ...content,
            });
          }
        });
        message.contents = contents;
      }
    );
    return { ...state, messages };
  },

  [SessionEventType.AGENT_MESSAGE_STATUS_CHANGED]: (state, event) => {
    const e = event as AgentMessageStatusChangedEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        message.status = e.newStatus;
        message.gmtModified = e.gmtFinished;
      }
    );

    return { ...state, messages };
  },

  [SessionEventType.TASK_APPEND_CONTENT]: (state, event) => {
    const e = event as TaskAppendContentEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        findAndUpdateTask(message as AgentSessionMessage, e.taskId, (task) => {
          if (!task.contents) task.contents = [];

          const contents = [...task.contents];

          e.newContents.forEach((newContent) => {
            if (newContent.type === ContentType.TEXT) {
              const lastIndex = contents.length - 1;
              if (
                lastIndex >= 0 &&
                contents[lastIndex].type === ContentType.TEXT
              ) {
                contents[lastIndex] = {
                  ...contents[lastIndex],
                  text:
                    (contents[lastIndex] as TextContent).text +
                    (newContent as TextContent).text,
                };
              } else {
                contents.push({
                  ...newContent,
                });
              }
            } else if (newContent.type === ContentType.ACTION) {
              contents.push({ ...newContent });
            }
          });

          task.contents = contents;
        });
      }
    );

    return { ...state, messages };
  },

  [SessionEventType.TASK_STATUS_CHANGED]: (state, event) => {
    const e = event as TaskStatusChangeEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        findAndUpdateTask(message, e.taskId, (task) => {
          task.status = e.newStatus;
          task.gmtFinished = e.gmtFinished || task.gmtFinished;
        });
      }
    );

    return { ...state, messages };
  },

  [SessionEventType.ACTION_APPEND_CONTENT]: (state, event) => {
    const e = event as ActionAppendContentEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        findAndUpdateAction(message, e.actionId, (action) => {
          action.contents = [...action.contents, ...e.newContents];
        });
      }
    );

    return { ...state, messages };
  },

  [SessionEventType.ACTION_STATUS_CHANGED]: (state, event) => {
    const e = event as ActionStatusChangeEvent;
    const messages = findAndUpdateMessage(
      state.messages,
      e.messageId,
      (message) => {
        findAndUpdateAction(message, e.actionId, (action) => {
          action.status = e.newStatus;
          action.gmtFinished = e.gmtFinished;
        });
      }
    );

    return { ...state, messages };
  },
};
export const updateMessageListByEvents = (
  state: ChatState,
  events: EventItem[]
): ChatState => {
  let newState = state;

  events.forEach((event) => {
    const handler = eventHandlers[event.type];
    if (handler) {
      newState = handler(newState, event);
    }
  });

  if (events.length > 0) {
    newState = {
      ...newState,
      lastEventId: events[events.length - 1].id,
    };
  }

  return newState;
};
