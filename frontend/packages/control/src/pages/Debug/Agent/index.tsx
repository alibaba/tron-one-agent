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
import type { AttachmentItem, HitlSubmitPayload } from "chatbox/extends/ChatBox";
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

  const initialSessionId = searchParams.get("sessionId") || generateSessionId();
  const initialTts = searchParams.get("tts") !== "false";
  const initialProtocol = (searchParams.get("protocol") === "ws" ? "ws" : "sse") as "sse" | "ws";
  const initialAgentId = searchParams.get("agentId") || "";

  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [ttsAutoPlay, setTtsAutoPlay] = useState<boolean>(initialTts);

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
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // ========== Inline TTS Audio Playback ==========
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingAudioRef = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playNextAudio = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0) {
        isPlayingAudioRef.current = false;
      }
      return;
    }
    isPlayingAudioRef.current = true;
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) return;
    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        currentAudioSourceRef.current = null;
        playNextAudio();
      };
      currentAudioSourceRef.current = source;
      source.start(0);
    } catch (error) {
      console.error("播放音频失败:", error);
    }
  }, []);

  const stopInlineTts = useCallback(() => {
    if (currentAudioSourceRef.current) {
      try { currentAudioSourceRef.current.stop(); } catch (_) {}
      currentAudioSourceRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
  }, []);

  /** PCM Base64 → WAV → AudioBuffer → 播放队列 */
  const handleTtsResponse = useCallback(async (data: any) => {
    if (!ttsAutoPlay) return;
    if (data.success === false) {
      console.error("TTS error:", data.error);
      return;
    }
    if (data.finished === true) {
      console.log("TTS stream finished");
      return;
    }
    const base64Data = data.dataBase64;
    if (!base64Data) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Decode base64 to PCM bytes
    const binaryString = atob(base64Data);
    const pcmBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmBytes[i] = binaryString.charCodeAt(i);
    }
    // PCM → WAV (24000Hz, mono, 16bit)
    const sampleRate = 24000, numChannels = 1, bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBytes.length;
    const wavBuf = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuf);
    const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeStr(8, "WAVE");
    writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data"); view.setUint32(40, dataSize, true);
    new Uint8Array(wavBuf, 44).set(pcmBytes);

    const audioBuffer = await audioContextRef.current.decodeAudioData(wavBuf);
    audioQueueRef.current.push(audioBuffer);
    if (!isPlayingAudioRef.current) {
      playNextAudio();
    }
  }, [ttsAutoPlay, playNextAudio]);

  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => next.set(k, v));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const agentIdChanged = Form.useWatch("agentId", form);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (agentIdChanged) params.agentId = agentIdChanged;
    if (sessionId) params.sessionId = sessionId;
    if (Object.keys(params).length > 0) {
      updateUrlParams(params);
    }
  }, [agentIdChanged, sessionId, updateUrlParams]);

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

        const urlAgentId = initialAgentId;
        const targetAgentId = (urlAgentId && result.data.some((a: AgentConfig) => a.id === urlAgentId))
          ? urlAgentId
          : result.data[0]?.id;

        isInitialLoadRef.current = true;
        form.setFieldValue("agentId", targetAgentId);

        isInitialLoadRef.current = false;
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWebSocket = useCallback((agentId: string, sid: string) => {
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
        if ((event as any).type === SessionEventType.TTS_RESPONSE) {
          handleTtsResponse((event as any).data);
          return;
        }
        if ((event as any).type === SessionEventType.SUGGESTIONS) {
          const data = (event as any).data;
          if (Array.isArray(data)) {
            setSuggestions(data);
          }
          return;
        }
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
  }, [handleTtsResponse]);

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
      console.debug("Failed to load session details (may be a new session):", err);
    }
  }, []);

  useEffect(() => {
    if (chatProtocol === "ws" && agentIdChanged && sessionId) {
      connectWebSocket(agentIdChanged, sessionId);
    } else if (chatProtocol === "sse" && agentIdChanged && sessionId) {
      disconnectWebSocket();
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
      setSuggestions([]);

      if (chatProtocol === "ws" && !wsConnected) {
        message.warning("WebSocket 未连接，请等待连接建立后再发送");
        return false;
      }

      const newMessageId = new Date().getTime();

      let currentSessionId = sessionId;
      if (!currentSessionId) {
        try {
          const newSessionId = generateSessionId();
          currentSessionId = newSessionId;
          setSessionId(newSessionId);
          lastEventIdRef.current = 0;
          setChatState((prev) => ({ ...prev, sessionId: newSessionId }));

          if (chatProtocol === "ws") {
            connectWebSocket(agentIdChanged, newSessionId);
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

      const userMessage = {
        id: newMessageId,
        type: SessionMessageType.USER,
        contents: userContents.length > 0 ? userContents : [{ type: ContentType.TEXT, text: inputStr }],
        status: SessionMessageStatus.EXECUTING,
        gmtCreate: new Date().toISOString(),
        gmtModified: new Date().toISOString(),
      } as UserSessionMessage;
      setChatState((prev) => ({ ...prev, messages: [...prev.messages, userMessage] }));

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
        if (!wsConnectionRef.current || !wsConnected) {
          message.warning("WebSocket 未连接，请等待连接建立后再发送");
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
        stopInlineTts();
        wsConnectionRef.current.sendChat(inputContents, ttsAutoPlay);
      } else {
        // ========== SSE 流式模式 ==========
        try {
          setRunning(true);
          stopInlineTts();
          
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = createChatStream(
            agentIdChanged,
            currentSessionId,
            { data: { input: inputContents, enableTts: ttsAutoPlay } },
            {
              onEvent: (event: EventItem) => {
                if ((event as any).type === SessionEventType.TTS_RESPONSE) {
                  handleTtsResponse((event as any).data);
                  return;
                }
                setEvents((prev) => [...prev, event]);
                lastEventIdRef.current = event.id;

                setChatState((prevState) => updateMessageListByEvents(prevState, [event]));

                if (
                  event.type === SessionEventType.AGENT_MESSAGE_STATUS_CHANGED &&
                  (event as any).newStatus !== SessionMessageStatus.EXECUTING
                ) {
                  setRunning(false);
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
    [sessionId, agentIdChanged, chatProtocol, connectWebSocket, ttsAutoPlay, stopInlineTts, handleTtsResponse, wsConnected]
  );

  const handleHitlSubmit = useCallback(
    (payload: HitlSubmitPayload) => {
      if (!sessionId || !agentIdChanged) return;

      const inputContents = [{
        type: ContentType.HITL,
        id: payload.id,
        agentMessageId: payload.agentMessageId,
        result: payload.result,
      }];

      setRunning(true);
      stopInlineTts();

      if (chatProtocol === "ws") {
        if (!wsConnectionRef.current || !wsConnected) {
          message.warning("WebSocket 未连接，请等待连接建立后再提交");
          setRunning(false);
          return;
        }
        wsConnectionRef.current.sendChat(inputContents, ttsAutoPlay);
      } else {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = createChatStream(
          agentIdChanged,
          sessionId,
          { data: { input: inputContents, enableTts: ttsAutoPlay } },
          {
            onEvent: (event: EventItem) => {
              if ((event as any).type === SessionEventType.TTS_RESPONSE) {
                handleTtsResponse((event as any).data);
                return;
              }
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
              console.error("HITL SSE 错误:", error);
              setRunning(false);
              message.error("提交失败");
            },
            onComplete: () => {
              setRunning(false);
            },
          }
        );
      }
    },
    [sessionId, agentIdChanged, chatProtocol, ttsAutoPlay, stopInlineTts, handleTtsResponse, wsConnected]
  );
  const onCreateSessionClick = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    lastEventIdRef.current = 0;
    setEvents([]);
    setSuggestions([]);
    setChatState({
      sessionId: newId,
      sessionName: "新会话",
      messages: [],
      lastEventId: 0,
    });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (chatProtocol === "ws" && agentIdChanged) {
      connectWebSocket(agentIdChanged, newId);
    }
    setRunning(false);
    updateUrlParams({ sessionId: newId });
  }, [chatProtocol, agentIdChanged, connectWebSocket, updateUrlParams]);

  const configValuesChanged = (changedValues: any, allValues: any) => {
    if (isInitialLoadRef.current) return;
    
    if (!changedValues.agentId) return;

    disconnectWebSocket();
    
    console.log("Agent 切换，重置会话:", changedValues, allValues);
    
    if (running) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setRunning(false);
    }
    
    const newId = generateSessionId();
    setSessionId(newId);
    
    lastEventIdRef.current = 0;
    setEvents([]);
    setSuggestions([]);
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

  const fetchSessions = useCallback(async (page: number = 1) => {
    if (!agentIdChanged) return;
    setSessionsLoading(true);
    try {
      const result: any = await getSessionList(agentIdChanged, page, 10);
      setSessions(result.records || []);
      setSessionsTotal(result.totalRecords || 0);
      setSessionsPage(page);
    } catch (err) {
      console.error("Failed to fetch session list:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [agentIdChanged]);

  const handleSwitchSession = useCallback(async (targetSessionId: string) => {
    if (targetSessionId === sessionId) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    
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
    return () => {
      // 组件卸载时清理 SSE 连接
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
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
          ttsAutoPlay={false}
          onLike={(messageId) => console.log("点赞消息:", messageId)}
          onDislike={(messageId) => console.log("点踩消息:", messageId)}
          voiceInput={{
            enabled: true,
            mode: 'text',
            wsUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/chatApi/api/asr`,
          }}
          headerRender={() => null}
          suggestions={suggestions}
          onSuggestionClick={(text) => {
            setSuggestions([]);
            handleSendMessage(text);
          }}
          onHitlSubmit={handleHitlSubmit}
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
