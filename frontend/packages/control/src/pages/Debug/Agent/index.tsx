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
import { useSearchParams } from "react-router-dom";
import styles from "./index.module.less";
import {
  ContentType,
  SessionMessageStatus,
  SessionEventType,
  SessionMessageType,
} from "chatbox";
import type { EventItem, ChatState, UserSessionMessage } from "chatbox";
import { ChatBox } from "chatbox/extends/ChatBox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import {
  createSession,
  getSessionById,
  getSessionMessages,
  setServiceConfig,
  createChatStream,
  createWsChatConnection,
} from "chatbox/extends/service";
import type { WsChatConnection } from "chatbox/extends/service";
import { getAllAgents, getSessionList, type SessionListItem } from "@/services/agent";
import { AgentConfig } from "@/types/agent.interface";
import { Card, Form, message, Select, Tag, Tabs, Table, Typography, Modal, Space, List, Switch } from "antd";
import { LocalAgentType } from "@/types/common.interface";
import { getUserId, getUserName } from "@/utils/userInfo";
import { ReloadOutlined } from "@ant-design/icons";
import { updateMessageListByEvents } from "chatbox/utils/updateMessagesByEvents";

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
  wsPrefix: "/chatApi",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [agentsOptions, setAgentsOptions] = useState<AgentConfig[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const isInitialLoadRef = useRef(true);
  const lastEventIdRef = useRef(0);

  // 从 URL 参数读取初始值
  const initialSessionId = searchParams.get("sessionId") || generateSessionId();
  const initialTts = searchParams.get("tts") !== "false"; // 默认 true
  const initialProtocol = (searchParams.get("protocol") === "ws" ? "ws" : "sse") as "sse" | "ws";
  const initialAgentId = searchParams.get("agentId") || "";

  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [ttsAutoPlay, setTtsAutoPlay] = useState<boolean>(initialTts);

  // 聊天状态管理（替代 useChatModel）
  const [chatState, setChatState] = useState<ChatState>({
    sessionId: initialSessionId,
    sessionName: "新会话",
    messages: [],
    lastEventId: 0,
  });
  const [running, setRunning] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wsConnectionRef = useRef<WsChatConnection | null>(null);
  const [chatProtocol, setChatProtocol] = useState<"sse" | "ws">(initialProtocol);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // 同步状态到 URL 参数
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => next.set(k, v));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const agentIdChanged = Form.useWatch("agentId", form);

  // agentId 变化时同步到 URL
  useEffect(() => {
    if (agentIdChanged) {
      updateUrlParams({ agentId: agentIdChanged });
    }
  }, [agentIdChanged, updateUrlParams]);

  // sessionId 变化时同步到 URL
  useEffect(() => {
    if (sessionId) {
      updateUrlParams({ sessionId });
    }
  }, [sessionId, updateUrlParams]);

  // 首次挂载时确保 URL 参数完整
  useEffect(() => {
    const params: Record<string, string> = {};
    if (!searchParams.get("sessionId")) params.sessionId = initialSessionId;
    if (!searchParams.get("tts")) params.tts = String(initialTts);
    if (!searchParams.get("protocol")) params.protocol = initialProtocol;
    if (Object.keys(params).length > 0) {
      updateUrlParams(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAgentsOptions = async () => {
    try {
      const result: any = await getAllAgents();
      if (result.success === true) {
        setAgentsOptions(result.data || []);

        // 优先使用 URL 参数中的 agentId，否则使用第一个
        const urlAgentId = initialAgentId;
        const targetAgentId = (urlAgentId && result.data.some((a: AgentConfig) => a.id === urlAgentId))
          ? urlAgentId
          : result.data[0]?.id;

        // 初始加载时跳过 configValuesChanged 的重置逻辑
        isInitialLoadRef.current = true;
        form.setFieldValue("agentId", targetAgentId);

        // 初始加载完成
        isInitialLoadRef.current = false;
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 连接 / 断开 WebSocket
  const connectWebSocket = useCallback((agentId: string, sid: string) => {
    // 先关闭旧连接
    if (wsConnectionRef.current) {
      wsConnectionRef.current.close();
      wsConnectionRef.current = null;
    }
    setWsConnected(false);

    const conn = createWsChatConnection(agentId, sid, {
      onOpen: () => {
        setWsConnected(true);
        console.log("[Debug] WS 连接已就绪");
      },
      onSessionInfo: (sessionInfo) => {
        console.log("[Debug] WS 收到 session 信息:", sessionInfo);
        if (sessionInfo) {
          setChatState((prev) => ({
            ...prev,
            sessionId: sessionInfo.id || sid,
            sessionName: sessionInfo.name || prev.sessionName,
          }));
          // 如果带有历史消息，加载它们
          if (sessionInfo.messages?.records?.length > 0) {
            const loadedMessages = [...sessionInfo.messages.records].reverse();
            setChatState((prev) => ({
              ...prev,
              messages: loadedMessages,
            }));
          }
        }
      },
      onEvent: (event: EventItem) => {
        setEvents((prev) => [...prev, event]);
        lastEventIdRef.current = event.id;
        setChatState((prevState) => updateMessageListByEvents(prevState, [event]));

        if (
          event.type === SessionEventType.AGENT_MESSAGE_STATUS_CHANGED &&
          (event as any).newStatus !== SessionMessageStatus.EXECUTING
        ) {
          setRunning(false);
        }
      },
      onError: (error: Error) => {
        console.error("[Debug] WS 错误:", error);
      },
      onClose: () => {
        setWsConnected(false);
        console.log("[Debug] WS 连接关闭");
      },
    });
    wsConnectionRef.current = conn;
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsConnectionRef.current) {
      wsConnectionRef.current.close();
      wsConnectionRef.current = null;
    }
    setWsConnected(false);
  }, []);

  // SSE 模式下通过 API 加载会话元信息和历史消息
  const loadSessionByApi = useCallback(async (agentId: string, sid: string) => {
    try {
      const sessionDetail = await getSessionById(agentId, sid);
      const messagesResult = await getSessionMessages(agentId, sid, {
        params: { pageNo: 1, pageSize: 100 },
      });
      if (sessionDetail && messagesResult?.records) {
        const loadedMessages = messagesResult.records.reverse();
        setChatState({
          sessionId: sid,
          sessionName: sessionDetail.name || "新会话",
          messages: loadedMessages,
          lastEventId: sessionDetail.lastAppliedEventId,
        });
        lastEventIdRef.current = sessionDetail.lastAppliedEventId;
      }
    } catch (err) {
      // 新会话可能还不存在，忽略错误
      console.debug("加载会话详情失败 (可能是新会话):", err);
    }
  }, []);

  // 切换协议时，自动连接/断开 WebSocket，并重新初始化会话数据
  useEffect(() => {
    if (chatProtocol === "ws" && agentIdChanged && sessionId) {
      connectWebSocket(agentIdChanged, sessionId);
      // WS 模式下会话元信息和历史消息由 onSessionInfo 回调自动加载
    } else if (chatProtocol === "sse" && agentIdChanged && sessionId) {
      disconnectWebSocket();
      // SSE 模式下通过 API 加载会话元信息和历史消息
      loadSessionByApi(agentIdChanged, sessionId);
    } else {
      disconnectWebSocket();
    }
    return () => {
      disconnectWebSocket();
    };
  }, [chatProtocol, agentIdChanged, sessionId, connectWebSocket, disconnectWebSocket, loadSessionByApi]);

  const handleSendMessage = useCallback(
    async (inputStr: string, attachments?: AttachmentItem[]) => {
      const newMessageId = new Date().getTime();

      // 如果 sessionId 为空，先创建 session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        try {
          const newSessionId = generateSessionId();
          currentSessionId = newSessionId;
          setSessionId(newSessionId);
          lastEventIdRef.current = 0;
          setChatState((prev) => ({ ...prev, sessionId: newSessionId }));

          // WebSocket 模式下需要等连接建立后才能发消息，先标记 session
          if (chatProtocol === "ws") {
            // 连接会由 useEffect 自动触发，这里等连接就绪
            // 但 useEffect 不是同步的，所以我们手动连接
            connectWebSocket(agentIdChanged, newSessionId);
            // 给一点时间让连接建立
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            // SSE 模式需要通过 API 创建 session
            try {
              await createSession(agentIdChanged, {
                data: { name: "新会话" },
              });
            } catch {
              // session 不存在时后端会自动创建，忽略
            }
          }
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

      // 添加用户消息到列表
      const userMessage = {
        id: newMessageId,
        type: SessionMessageType.USER,
        contents: userContents.length > 0 ? userContents : [{ type: ContentType.TEXT, text: inputStr }],
        status: SessionMessageStatus.EXECUTING,
        gmtCreate: new Date().toISOString(),
        gmtModified: new Date().toISOString(),
      } as UserSessionMessage;
      setChatState((prev) => ({ ...prev, messages: [...prev.messages, userMessage] }));

      // 构建请求 input
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

      if (chatProtocol === "ws") {
        // ========== WebSocket JSON-RPC 模式 ==========
        if (!wsConnectionRef.current) {
          message.error("WebSocket 未连接，请稍后重试");
          setChatState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === newMessageId
                ? { ...msg, status: SessionMessageStatus.FAILED }
                : msg
            ),
          }));
          return false;
        }

        setRunning(true);
        wsConnectionRef.current.sendChat(inputContents);
      } else {
        // ========== SSE 流式模式 ==========
        try {
          setRunning(true);
          
          // 取消之前的请求
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = createChatStream(
            agentIdChanged,
            currentSessionId,
            { data: { input: inputContents } },
            {
              onEvent: (event: EventItem) => {
                // 更新事件列表用于调试面板
                setEvents((prev) => [...prev, event]);
                lastEventIdRef.current = event.id;

                // 更新消息列表
                setChatState((prevState) => updateMessageListByEvents(prevState, [event]));

                // 检查是否需要停止运行
                if (
                  event.type === SessionEventType.AGENT_MESSAGE_STATUS_CHANGED &&
                  (event as any).newStatus !== SessionMessageStatus.EXECUTING
                ) {
                  setRunning(false);
                  // 更新用户消息状态为成功
                  setChatState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((msg) =>
                      msg.id === newMessageId
                        ? { ...msg, status: SessionMessageStatus.SUCCEED }
                        : msg
                    ),
                  }));
                }
              },
              onError: (error: Error) => {
                console.error("SSE 错误:", error);
                setRunning(false);
                // 更新用户消息状态为失败
                setChatState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === newMessageId
                      ? { ...msg, status: SessionMessageStatus.FAILED }
                      : msg
                  ),
                }));
                message.error("对话失败");
              },
              onComplete: () => {
                console.log("SSE 连接完成");
                setRunning(false);
                // 确保用户消息状态更新为成功
                setChatState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === newMessageId && msg.status === SessionMessageStatus.EXECUTING
                      ? { ...msg, status: SessionMessageStatus.SUCCEED }
                      : msg
                  ),
                }));
              },
            }
          );
        } catch (error) {
          console.error(error);
          setRunning(false);
          setChatState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === newMessageId
                ? { ...msg, status: SessionMessageStatus.FAILED }
                : msg
            ),
          }));
          message.error("对话创建失败");
        }
      }
      return true;
    },
    [sessionId, agentIdChanged, chatProtocol, connectWebSocket]
  );
  const onCreateSessionClick = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    lastEventIdRef.current = 0;
    setEvents([]);
    setChatState({
      sessionId: newId,
      sessionName: "新会话",
      messages: [],
      lastEventId: 0,
    });
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // WebSocket 模式下重连新 session
    if (chatProtocol === "ws" && agentIdChanged) {
      connectWebSocket(agentIdChanged, newId);
    }
    setRunning(false);
    updateUrlParams({ sessionId: newId });
  }, [chatProtocol, agentIdChanged, connectWebSocket, updateUrlParams]);

  const configValuesChanged = (changedValues: any, allValues: any) => {
    // 初始加载时跳过重置逻辑
    if (isInitialLoadRef.current) return;
    
    // 仅当 agentId 变化时才重置会话
    if (!changedValues.agentId) return;

    // 断开旧 WebSocket
    disconnectWebSocket();
    
    console.log("Agent 切换，重置会话:", changedValues, allValues);
    
    // 停止当前运行中的对话
    if (running) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setRunning(false);
    }
    
    // 生成新 sessionId
    const newId = generateSessionId();
    setSessionId(newId);
    
    lastEventIdRef.current = 0;
    setEvents([]);
    setChatState({
      sessionId: newId,
      sessionName: "新会话",
      messages: [],
      lastEventId: 0,
    });
  };

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
    
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    
    // 重置状态
    setEvents([]);
    lastEventIdRef.current = 0;
    setSessionId(targetSessionId);
    setChatState({
      sessionId: targetSessionId,
      sessionName: "新会话",
      messages: [],
      lastEventId: 0,
    });
    
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
          const loadedMessages = messagesResult.records.reverse();
          
          // 使用消息列表更新状态
          setChatState({
            sessionId: targetSessionId,
            sessionName: sessionDetail.name || "新会话",
            messages: loadedMessages,
            lastEventId: sessionDetail.lastAppliedEventId,
          });
          lastEventIdRef.current = sessionDetail.lastAppliedEventId;
        }
      } catch (err) {
        console.error("获取会话详情失败:", err);
        message.error("加载会话失败");
      }
    }
  }, [sessionId, agentIdChanged]);

  // 中断当前对话（仅 WS 模式支持）
  const handleStop = useCallback(() => {
    if (chatProtocol === "ws" && wsConnectionRef.current) {
      wsConnectionRef.current.sendCancel().then(() => {
        setChatState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.status === SessionMessageStatus.EXECUTING
              ? { ...msg, status: SessionMessageStatus.CANCELLED }
              : msg
          ),
        }));
      });
      setRunning(false);
    }
  }, [chatProtocol]);

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
          sessionId={sessionId}
          messages={chatState.messages}
          sessionName={chatState.sessionName}
          userName={userName}
          agentName={agentName}
          handleSendMessage={handleSendMessage}
          running={running}
          onStop={chatProtocol === "ws" ? handleStop : undefined}
          className={styles.mainWrap}
          onCreateSessionClick={handleCreateSessionClick}
          supportInputTypes={agentSupportInputTypes}
          supportAgentTTS={true}
          ttsWsUrl={`${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/chatApi/api/tts`}
          ttsAutoPlay={ttsAutoPlay}
          onLike={(messageId) => console.log("点赞消息:", messageId)}
          onDislike={(messageId) => console.log("点踩消息:", messageId)}
          voiceInput={{
            enabled: true,
            mode: 'text',
            wsUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/chatApi/api/asr`,
          }}
          headerRender={() => null}
        />
        <Card
          className={styles.operateWrap}
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>调试面板</span>
              <Space size="small">
                <span style={{ fontSize: 12, color: "#666" }}>协议</span>
                <Switch
                  size="small"
                  checkedChildren="WS"
                  unCheckedChildren="SSE"
                  checked={chatProtocol === "ws"}
                  onChange={(checked) => {
                    const newProtocol = checked ? "ws" : "sse";
                    setChatProtocol(newProtocol);
                    updateUrlParams({ protocol: newProtocol });
                  }}
                />
                {chatProtocol === "ws" && (
                  <>
                    <Tag color={wsConnected ? "green" : "red"} style={{ marginLeft: 4 }}>
                      {wsConnected ? "已连接" : "未连接"}
                    </Tag>
                    <ReloadOutlined
                      style={{ cursor: "pointer", fontSize: 14, color: "#1890ff" }}
                      onClick={() => {
                        if (agentIdChanged && sessionId) {
                          connectWebSocket(agentIdChanged, sessionId);
                        }
                      }}
                    />
                  </>
                )}
                <span style={{ fontSize: 12, color: "#666", marginLeft: 8 }}>自动TTS</span>
                <Switch
                  size="small"
                  checked={ttsAutoPlay}
                  onChange={(checked) => {
                    setTtsAutoPlay(checked);
                    updateUrlParams({ tts: String(checked) });
                  }}
                />
              </Space>
            </div>
          }
        >
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
