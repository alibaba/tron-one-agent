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


// pages/Debug/index.tsx (支持动态切换版本)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./index.module.less";
import {
  useChatModel,
  useEventSource,
  SseEventSource,
  PollingEventSource,
  ContentType,
  SessionMessageStatus,
} from "chatbox";
import { ChatBox } from "chatbox/extends/ChatBox";
import {
  createChat,
  createSession,
  getSessionEvents,
  setServiceConfig,
} from "chatbox/extends/service";
import { getAllAgents } from "@/services/agent";
import { Card, Form, message, Select, Spin } from "antd";
import { getUserId, getUserName } from "@/utils/userInfo";

export interface ChatBoxDemoProps {}

setServiceConfig({
  apiPrefix: "/api",
  authorizationHeader: {
    "X-User-Id": encodeURIComponent(getUserId()),
    "X-User-Name": encodeURIComponent(getUserName()),
  },
});

const userName = getUserName();
const ChatBoxDemo: React.FC<ChatBoxDemoProps> = ({}) => {
  const [form] = Form.useForm();
  const [agentsOptions, setAgentsOptions] = useState([]);

  const agentIdChanged = Form.useWatch("agentId", form);
  const fetchEventMethodChanged = Form.useWatch("fetchEventMethod", form);

  const poolingRequest = useCallback(
    async (options: { sessionId: string; lastEventId: number }) => {
      try {
        const { sessionId, lastEventId } = options;
        const events = await getSessionEvents(agentIdChanged, sessionId, {
          params: {
            offset: lastEventId,
            size: 10,
          },
        });
        return events;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [agentIdChanged]
  );

  const sseEventSource = useEventSource<SseEventSource>(
    () =>
      new SseEventSource({
        urlBuilder: (params) => {
          const baseUrl = `/chatApi/api/agents/${agentIdChanged}/sessions/${params.sessionId}/events`;
          // const baseUrl = `http://0.0.0.0:8080/api/agents/${agentIdChanged}/sessions/${params.sessionId}/events`;
          return `${baseUrl}?offset=${params.lastEventId}&size=100`;
        },
        headers: {
          "X-User-Id": encodeURIComponent(getUserId()),
          "X-User-Name": encodeURIComponent(getUserName()),
        },
        autoReconnect: true,
        reconnectInterval: 3000,
      }),
    [agentIdChanged]
  );

  const pollingEventSource = useEventSource<PollingEventSource>(
    () =>
      new PollingEventSource({
        request: poolingRequest,
        interval: 1000,
      }),
    [poolingRequest]
  );

  const eventSource = useMemo(() => {
    if (fetchEventMethodChanged === "polling") return pollingEventSource;
    if (fetchEventMethodChanged === "sse") return sseEventSource;
  }, [sseEventSource, pollingEventSource, fetchEventMethodChanged]);

  const {
    data: chatState,
    running,
    run,
    update,
    stop,
    reset,
    sendUserMessageShawde,
    updateUserMessageShawdeStatus,
  } = useChatModel({
    initialData: {
      sessionId: "",
      messages: [],
      lastEventId: 0,
      sessionName: "新会话",
    },
    eventSource,
  });
  const getAgentsOptions = async () => {
    try {
      const result = await getAllAgents();
      if (result.success === true) {
        setAgentsOptions(result.data || []);
        update({
          sessionName: "新会话",
          messages: [],
        });
        form.setFieldValue("agentId", result.data[0].id);
        form.setFieldValue("fetchEventMethod", "sse");
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = useCallback(
    async (inputStr: string) => {
      const newMessageId = new Date().getTime();
      sendUserMessageShawde({
        id: newMessageId,
        contents: [{ type: ContentType.TEXT, text: inputStr }],
        status: SessionMessageStatus.EXECUTING,
      });
      if (chatState.sessionId) {
        // session中继续对话
        try {
          const chatResult = await createChat(
            agentIdChanged,
            chatState.sessionId,
            { data: { input: [{ type: ContentType.TEXT, text: inputStr }] } }
          );
          if (chatResult === "success") {
            run();
            // message.success("对话创建成功");
          } else {
            updateUserMessageShawdeStatus(
              newMessageId,
              SessionMessageStatus.FAILED
            );
            message.error(chatResult.message || "对话创建失败");
          }
        } catch (error) {
          console.error(error);
          updateUserMessageShawdeStatus(
            newMessageId,
            SessionMessageStatus.FAILED
          );
          message.error("对话创建失败");
        }
      } else {
        // 先创建会话，然后再创建对话
        try {
          const sessionResult = await createSession(agentIdChanged, {
            data: {
              name: "新会话",
            },
          });
          if (sessionResult.length > 0) {
            try {
              const chatResult = await createChat(
                agentIdChanged,
                sessionResult,
                {
                  data: { input: [{ type: ContentType.TEXT, text: inputStr }] },
                }
              );
              if (chatResult === "success") {
                update({
                  sessionId: sessionResult,
                });
                run();
                // message.success("对话创建成功");
              } else {
                updateUserMessageShawdeStatus(
                  newMessageId,
                  SessionMessageStatus.FAILED
                );
                message.error(chatResult.message || "对话创建失败");
              }
            } catch (error) {
              console.error(error);
              updateUserMessageShawdeStatus(
                newMessageId,
                SessionMessageStatus.FAILED
              );
              message.error("对话创建失败");
            }
          } else {
            updateUserMessageShawdeStatus(
              newMessageId,
              SessionMessageStatus.FAILED
            );
            message.error(sessionResult.message || "会话创建失败");
          }
        } catch (error) {
          console.error(error);
          updateUserMessageShawdeStatus(
            newMessageId,
            SessionMessageStatus.FAILED
          );
          message.error("会话创建失败");
        }
      }
      return true;
    },
    [chatState.sessionId, agentIdChanged, eventSource, run, update]
  );
  const onCreateSessionClick = useCallback(() => {
    reset();
    // stop();
    // update({
    //   sessionId: "",
    //   messages: [],
    //   lastEventId: 0,
    //   sessionName: "新会话",
    // });
  }, [reset]);

  const configValuesChanged = (changedValues: any, allValues: any) => {
    console.log("configValuesChanged: ", changedValues, allValues);
    update({
      sessionId: "",
      messages: [],
      lastEventId: 0,
      sessionName: "新会话",
    });
  };
  const agentName = useMemo(() => {
    return agentsOptions.find((item) => item.id === agentIdChanged)?.name;
  }, [agentsOptions, agentIdChanged]);
  useEffect(() => {
    getAgentsOptions();
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title="Agent调试"
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <ChatBox
          messages={chatState.messages}
          sessionName={chatState.sessionName as string}
          userName={userName}
          agentName={agentName}
          handleSendMessage={handleSendMessage}
          running={running}
          className={styles.mainWrap}
          onCreateSessionClick={onCreateSessionClick}
        />
        <Card className={styles.operateWrap} title="agents调试面板">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ fetchEventMethod: "SSE" }}
            onValuesChange={configValuesChanged}
          >
            <Form.Item label="选择Agent" name="agentId">
              <Select placeholder="请选择Agent">
                {agentsOptions?.map((agent) => (
                  <Select.Option key={agent.id} value={agent.id}>
                    {agent.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="事件请求方式" name="fetchEventMethod">
              <Select>
                <Select.Option value="sse">SSE</Select.Option>
                <Select.Option value="polling">轮训（HTTP）</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Card>
      </Card>
    </div>
  );
};

export default ChatBoxDemo;
