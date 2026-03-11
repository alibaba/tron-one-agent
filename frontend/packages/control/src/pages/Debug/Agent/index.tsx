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


import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import styles from "./index.module.less";
import {
  useChatModel,
  useEventSource,
  SseEventSource,
  ContentType,
  SessionMessageStatus,
  SessionEventType,
} from "chatbox";
import type { EventItem } from "chatbox";
import { ChatBox } from "chatbox/extends/ChatBox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import {
  createChat,
  createSession,
  getSessionById,
  getSessionMessages,
  setServiceConfig,
} from "chatbox/extends/service";
import { getAllAgents, getSessionList, type SessionListItem } from "@/services/agent";
import { AgentConfig } from "@/types/agent.interface";
import { Card, Form, message, Select, Tag, Tabs, Table, Typography, Modal, Space, List } from "antd";
import { LocalAgentType } from "@/types/common.interface";
import { getUserId, getUserName } from "@/utils/userInfo";

const EventTypeNameMap: Record<number, string> = {
  [SessionEventType.SESSION_NAME_CHANGED]: "会话名变更",
  [SessionEventType.NEW_USER_INPUT]: "用户输入",
  [SessionEventType.NEW_AGENT_MESSAGE]: "Agent消息",
  [SessionEventType.AGENT_MESSAGE_APPEND_CONTENT]: "Agent追加内容",
  [SessionEventType.AGENT_MESSAGE_STATUS_CHANGED]: "Agent消息状态变更",
  [SessionEventType.TASK_APPEND_CONTENT]: "Task追加内容",
  [SessionEventType.TASK_STATUS_CHANGED]: "Task状态变更",
  [SessionEventType.ACTION_APPEND_CONTENT]: "Action追加内容",
  [SessionEventType.ACTION_STATUS_CHANGED]: "Action状态变更",
};

const eventColumns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 160,
  },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    width: 160,
    render: (type: number) => (
      <Tag color="blue">{EventTypeNameMap[type] || `未知(${type})`}</Tag>
    ),
  },
  {
    title: "内容",
    key: "content",
    render: (_: any, record: EventItem) => (
      <Typography.Link
        onClick={() => {
          Modal.info({
            title: `事件详情 (ID: ${record.id})`,
            width: 800,
            content: (
              <pre style={{ maxHeight: 500, overflow: "auto", fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                {JSON.stringify(record, null, 2)}
              </pre>
            ),
          });
        }}
      >
        查看
      </Typography.Link>
    ),
  },
];

export interface ChatBoxDemoProps {}

setServiceConfig({
  apiPrefix: "/api",
  authorizationHeader: {
    "X-User-Id": encodeURIComponent(getUserId()),
    "X-User-Name": encodeURIComponent(getUserName()),
  },
});

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  // Fallback for non-secure contexts (HTTP non-localhost)
  return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
};

const userName = getUserName();
const ChatBoxDemo: React.FC<ChatBoxDemoProps> = ({}) => {
  const [form] = Form.useForm();
  const [agentsOptions, setAgentsOptions] = useState<AgentConfig[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const isInitialLoadRef = useRef(true);
  const lastEventIdRef = useRef(0);

  const [sessionId, setSessionId] = useState<string>("");

  const agentIdChanged = Form.useWatch("agentId", form);

  const sseEventSource = useEventSource<SseEventSource>(
    () =>
      new SseEventSource({
        urlBuilder: (params) => {
          const offset = lastEventIdRef.current || params.lastEventId;
          const baseUrl = `/chatApi/api/agents/${agentIdChanged}/sessions/${sessionId}/events`;
          // const baseUrl = `http://0.0.0.0:8080/api/agents/${agentIdChanged}/sessions/${sessionId}/events`;
          return `${baseUrl}?offset=${offset}&size=100`;
        },
        headers: {
          "X-User-Id": encodeURIComponent(getUserId()),
          "X-User-Name": encodeURIComponent(getUserName()),
        },
        autoReconnect: true,
        reconnectInterval: 3000,
      }),
    [agentIdChanged, sessionId]
  );

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
      sessionId: sessionId,
      messages: [],
      lastEventId: 0,
      sessionName: "新会话",
    },
    eventSource: sseEventSource,
  });
  const getAgentsOptions = async () => {
    try {
      const result: any = await getAllAgents();
      if (result.success === true) {
        setAgentsOptions(result.data || []);
        const firstAgentId = result.data[0]?.id;

        // 初始加载时跳过 configValuesChanged 的重置逻辑
        isInitialLoadRef.current = true;
        form.setFieldValue("agentId", firstAgentId);
        form.setFieldValue("fetchEventMethod", "sse");

        // 初始加载完成
        isInitialLoadRef.current = false;
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = useCallback(
    async (inputStr: string, attachments?: AttachmentItem[]) => {
      const newMessageId = new Date().getTime();

      // 如果 sessionId 为空，先创建 session
      let currentSessionId = chatState.sessionId;
      if (!currentSessionId) {
        try {
          const newSessionId = await createSession(agentIdChanged, {
            data: { name: "新会话" },
          });
          currentSessionId = newSessionId;
          setSessionId(newSessionId);
          lastEventIdRef.current = 0;
          update({ sessionId: newSessionId });
        } catch (error) {
          console.error("创建会话失败:", error);
          message.error("创建会话失败，请重试");
          return false;
        }
      }

      // 构建用户消息内容（包含文本和附件预览）
      const userContents: any[] = [];
      if (inputStr.trim()) {
        userContents.push({ type: ContentType.TEXT, text: inputStr });
      }
      if (attachments && attachments.length > 0) {
        attachments.forEach((att) => {
          userContents.push({
            type: att.type === 'image' ? ContentType.IMAGE : ContentType.VIDEO,
            url: att.previewUrl,
          });
        });
      }

      sendUserMessageShawde({
        id: newMessageId,
        contents: userContents.length > 0 ? userContents : [{ type: ContentType.TEXT, text: inputStr }],
        status: SessionMessageStatus.EXECUTING,
      });

      // 构建请求 input（附件已在选择时上传完毕，直接使用 serverUrl）
      try {
        const inputContents: any[] = [];
        if (inputStr.trim()) {
          inputContents.push({ type: ContentType.TEXT, text: inputStr });
        }

        if (attachments && attachments.length > 0) {
          attachments.forEach((att) => {
            const url = att.serverUrl || att.previewUrl;
            const type =
              att.type === 'image'
                ? ContentType.IMAGE
                : att.type === 'audio'
                ? ContentType.AUDIO
                : ContentType.VIDEO;
            inputContents.push({ type, url });
          });
        }

        const chatResult = await createChat(
          agentIdChanged,
          currentSessionId,
          { data: { input: inputContents } }
        );
        if (chatResult === "success") {
          run();
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
      return true;
    },
    [chatState.sessionId, agentIdChanged, run, update]
  );
  const onCreateSessionClick = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    lastEventIdRef.current = 0;
    setEvents([]);
    reset();
    update({ sessionId: newId });
  }, [reset, update]);

  const configValuesChanged = (changedValues: any, allValues: any) => {
    // 初始加载时跳过重置逻辑
    if (isInitialLoadRef.current) return;
    
    // 仅当 agentId 变化时才重置会话
    if (!changedValues.agentId) return;
    
    console.log("Agent 切换，重置会话:", changedValues, allValues);
    
    // 停止当前运行中的对话
    if (running) {
      stop();
    }
    
    // 生成新 sessionId
    const newId = generateSessionId();
    setSessionId(newId);
    
    lastEventIdRef.current = 0;
    setEvents([]);
    reset();
    update({
      sessionId: newId,
      messages: [],
      lastEventId: 0,
      sessionName: "新会话",
    });
  };
  // 订阅事件用于调试面板展示，并同步 lastEventIdRef
  useEffect(() => {
    if (!sseEventSource) return;
    const unsubscribe = sseEventSource.onMessage((event: EventItem) => {
      // 过滤掉 ping 心跳事件
      if ((event as any) === "ping") return;
      setEvents((prev) => [...prev, event]);
      lastEventIdRef.current = event.id;
    });
    return () => {
      unsubscribe();
    };
  }, [sseEventSource]);

  // sseEventSource 重建时，同步已有的 lastEventId 和 sessionId，避免从头拉取
  useEffect(() => {
    if (sseEventSource && lastEventIdRef.current > 0) {
      sseEventSource.lastEventId = lastEventIdRef.current;
      sseEventSource.sessionId = sessionId;
    }
  }, [sseEventSource]);

  const handleCreateSessionClick = useCallback(() => {
    onCreateSessionClick();
  }, [onCreateSessionClick]);

  const agentName = useMemo(() => {
    return agentsOptions.find((item) => item.id === agentIdChanged)?.name;
  }, [agentsOptions, agentIdChanged]);

  const agentSupportInputTypes = useMemo(() => {
    return agentsOptions.find((item) => item.id === agentIdChanged)?.supportInputTypes;
  }, [agentsOptions, agentIdChanged]);

  // 拉取会话列表
  const fetchSessions = useCallback(async (page: number = 1) => {
    if (!agentIdChanged) return;
    setSessionsLoading(true);
    try {
      const result: any = await getSessionList(agentIdChanged, page, 10);
      setSessions(result.records || []);
      setSessionsTotal(result.totalRecords || 0);
      setSessionsPage(page);
    } catch (err) {
      console.error("拉取会话列表失败:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [agentIdChanged]);

  // 切换会话
  const handleSwitchSession = useCallback(async (targetSessionId: string) => {
    if (targetSessionId === sessionId) return;
    
    // 重置状态
    setEvents([]);
    lastEventIdRef.current = 0;
    setSessionId(targetSessionId);
    reset();
    
    // 获取会话详情和消息列表
    if (agentIdChanged) {
      try {
        // 获取会话基本信息
        const sessionDetail = await getSessionById(agentIdChanged, targetSessionId);
        
        // 获取会话消息列表
        const messagesResult = await getSessionMessages(agentIdChanged, targetSessionId, {
          params: { pageNo: 1, pageSize: 100 },
        });
        
        if (sessionDetail && messagesResult?.records) {
          // 消息列表是时间逆序的，需要 reverse 显示
          const messages = messagesResult.records.reverse();
          
          // 使用消息列表更新状态
          update({
            sessionId: targetSessionId,
            messages: messages,
            lastEventId: sessionDetail.lastAppliedEventId,
            sessionName: sessionDetail.name || "新会话",
          });
          lastEventIdRef.current = sessionDetail.lastAppliedEventId;
        } else {
          // 如果获取失败，至少设置基本信息
          update({
            sessionId: targetSessionId,
            messages: [],
            lastEventId: 0,
            sessionName: "新会话",
          });
        }
      } catch (err) {
        console.error("获取会话详情失败:", err);
        message.error("加载会话失败");
        // 即使失败也要设置 sessionId
        update({
          sessionId: targetSessionId,
          messages: [],
          lastEventId: 0,
          sessionName: "新会话",
        });
      }
    }
  }, [sessionId, agentIdChanged, reset, update]);

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
          onCreateSessionClick={handleCreateSessionClick}
          supportInputTypes={agentSupportInputTypes}
        />
        <Card className={styles.operateWrap} title="调试面板">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ fetchEventMethod: "SSE" }}
            onValuesChange={configValuesChanged}
          >
            <Form.Item label="选择Agent" name="agentId" style={{ marginBottom: 12 }}>
              <Select placeholder="请选择Agent">
                {agentsOptions?.map((agent) => (
                  <Select.Option key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.type === LocalAgentType.ONE ? (
                      <Tag color="purple" style={{ marginLeft: 8 }}>OneAgent</Tag>
                    ) : (
                      <Tag color="green" style={{ marginLeft: 8 }}>ReAct</Tag>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
          <Tabs
            defaultActiveKey="events"
            size="small"
            onChange={(key) => {
              if (key === "sessions") {
                fetchSessions(1);
              }
            }}
            items={[
              {
                key: "events",
                label: `事件 (${events.length})`,
                children: (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <Space size={[4, 4]} wrap style={{ marginBottom: 12, flexShrink: 0 }}>
                      {Object.entries(
                        events.reduce<Record<string, number>>((acc, e) => {
                          const name = EventTypeNameMap[e.type] || `未知(${e.type})`;
                          acc[name] = (acc[name] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([name, count]) => (
                        <Tag key={name} color="blue">{name}: {count}</Tag>
                      ))}
                    </Space>
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                      <Table
                        columns={eventColumns}
                        dataSource={events}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 50, size: "small" }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "sessions",
                label: "会话历史",
                children: (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                      <List
                        size="small"
                        loading={sessionsLoading}
                        dataSource={sessions}
                        renderItem={(item: SessionListItem) => (
                          <List.Item
                            style={{
                              cursor: "pointer",
                              background: item.id === sessionId ? "#e6f4ff" : undefined,
                              padding: "8px 12px",
                            }}
                            onClick={() => handleSwitchSession(item.id)}
                          >
                            <div style={{ width: "100%" }}>
                              <div style={{ fontWeight: item.id === sessionId ? 600 : 400 }}>
                                {item.name || item.id}
                                {item.id === sessionId && (
                                  <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>当前</Tag>
                                )}
                              </div>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {item.gmtModified || item.gmtCreated}
                              </Typography.Text>
                            </div>
                          </List.Item>
                        )}
                        pagination={{
                          size: "small",
                          current: sessionsPage,
                          pageSize: 10,
                          total: sessionsTotal,
                          onChange: (page) => fetchSessions(page),
                        }}
                      />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Card>
    </div>
  );
};

export default ChatBoxDemo;
