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


import React, { useCallback, useEffect, useRef, useState } from "react";
import { message, Skeleton } from "antd";
import {
  ContentType,
  SessionMessageStatus,
  SessionMessageType,
  SessionEventType,
} from "chatbox";
import type { EventItem, ChatState, UserSessionMessage, AgentSessionMessage } from "chatbox";
import { ChatBox } from "chatbox/extends/ChatBox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import { createChatStream, setServiceConfig } from "chatbox/extends/service";
import { updateMessageListByEvents } from "chatbox/utils/updateMessagesByEvents";
import { useNavigate, useLocation } from "react-router";
import SessionInfo from "./components/SessionInfo";
import SuggestHotelCard from "../Demo/components/SuggestHotelCard";
import FlightCard from "../Demo/components/FlightCard";
import FlightStatusCard from "../Demo/components/FlightStatusCard";
import CalendarCard from "../Demo/components/CalendarCard";
import styles from "./index.module.less";
import {
  createSession,
  getSessionById,
  getSessionMessagesById,
  SessionResult,
} from "@/services/session";
import { getUserId, getUserName } from "@/utils/userInfo";
import { useAgentContext } from "@/context/AgentContext";

const AgentId = "simple_agent";

setServiceConfig({
  apiPrefix: "/client",
  authorizationHeader: {
    "X-User-Id": encodeURIComponent(getUserId()),
    "X-User-Name": encodeURIComponent(getUserName()),
  },
});

const customTagMap = {
  SuggestHotel: SuggestHotelCard,
  Flight: FlightCard,
  FlightStatus: FlightStatusCard,
  Calendar: CalendarCard,
};

export interface SessionItem extends SessionResult {
  sessionId: string;
  sessionName: string;
  lastEventId: number;
  messages: Array<UserSessionMessage | AgentSessionMessage>;
}

const Chat = ({
  session,
  agentId,
  agentName,
  supportInputTypes,
}: {
  session: SessionItem | null;
  agentId: string;
  agentName: string;
  supportInputTypes?: ContentType[];
}) => {
  const navigate = useNavigate();
  const [ttsAutoPlay, setTtsAutoPlay] = useState<boolean>(true);
  
  // 聊天状态管理（替代 useChatModel）
  const [chatState, setChatState] = useState<ChatState>({
    sessionId: session?.sessionId || "",
    sessionName: session?.sessionName || "新会话",
    messages: session?.messages || [],
    lastEventId: session?.lastEventId || 0,
  });
  const [running, setRunning] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化时检查是否需要恢复运行状态
  useEffect(() => {
    if (chatState.messages.length > 0) {
      const lastMessage = chatState.messages[chatState.messages.length - 1];
      if (
        lastMessage &&
        lastMessage.type === SessionMessageType.AGENT &&
        lastMessage.status === SessionMessageStatus.EXECUTING
      ) {
        // 如果有正在执行的消息，不自动恢复，让用户手动触发
      }
    }
  }, []);

  const handleSendMessage = useCallback(
    async (inputStr: string, attachments?: AttachmentItem[]) => {
      const newMessageId = new Date().getTime();

      // 构建用户消息内容（附件使用本地预览 URL 展示）
      const userContents: any[] = [];
      if (inputStr.trim()) {
        userContents.push({ type: ContentType.TEXT, text: inputStr });
      }
      if (attachments && attachments.length > 0) {
        attachments.forEach((att) => {
          userContents.push({
            type: att.type === 'image' ? ContentType.IMAGE : att.type === 'audio' ? ContentType.AUDIO : ContentType.VIDEO,
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

      // 构建请求 input（附件使用 serverUrl）
      const inputContents: any[] = [];
      if (inputStr.trim()) {
        inputContents.push({ type: ContentType.TEXT, text: inputStr });
      }
      if (attachments && attachments.length > 0) {
        attachments.forEach((att) => {
          const url = att.serverUrl || att.previewUrl;
          const type = att.type === 'image' ? ContentType.IMAGE : att.type === 'audio' ? ContentType.AUDIO : ContentType.VIDEO;
          inputContents.push({ type, url });
        });
      }

      // 确定 sessionId
      let currentSessionId = chatState.sessionId;
      
      // 如果没有 sessionId，先创建会话
      if (!currentSessionId) {
        try {
          const sessionResult = await createSession(agentId);
          if (sessionResult.length > 0) {
            currentSessionId = sessionResult;
            setChatState((prev) => ({ ...prev, sessionId: sessionResult }));
          } else {
            setChatState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === newMessageId
                  ? { ...msg, status: SessionMessageStatus.FAILED }
                  : msg
              ),
            }));
            message.error("会话创建失败");
            return false;
          }
        } catch (error) {
          console.error(error);
          setChatState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === newMessageId
                ? { ...msg, status: SessionMessageStatus.FAILED }
                : msg
            ),
          }));
          message.error("会话创建失败");
          return false;
        }
      }

      // 使用 SSE 流式 chat 接口
      setRunning(true);
      
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = createChatStream(
        agentId,
        currentSessionId,
        { data: { input: inputContents } },
        {
          onEvent: (event: EventItem) => {
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

      return true;
    },
    [chatState.sessionId, agentId]
  );

  const onCreateSessionClick = useCallback(async () => {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    setChatState({
      sessionId: "",
      sessionName: "新会话",
      messages: [],
      lastEventId: 0,
    });
    
    try {
      const result = await createSession(agentId);
      if (result.length > 0) {
        navigate(`/chat?sessionId=${result}`);
      } else {
        message.error("会话创建失败");
      }
    } catch (error) {
      console.error(error);
      message.error("会话创建失败");
    }
  }, [agentId, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.sessionInfoWrap}>
        <SessionInfo
          session={session}
          messages={chatState.messages}
          ttsAutoPlay={ttsAutoPlay}
          onTtsAutoPlayChange={setTtsAutoPlay}
        />
      </div>
      <div className={styles.chatWrap}>
        <ChatBox
          sessionId={chatState.sessionId}
          messages={chatState.messages}
          sessionName={chatState.sessionName as string}
          userName={getUserName()}
          agentName={agentName}
          handleSendMessage={handleSendMessage}
          running={running}
          className={styles.mainWrap}
          onCreateSessionClick={onCreateSessionClick}
          customTagMap={customTagMap}
          supportInputTypes={supportInputTypes}
          supportAgentTTS={true}
          // ttsWsUrl={`${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/chatApi/api/tts`}
          // ttsAutoPlay={ttsAutoPlay}
          // voiceInput={{
          //   enabled: true,
          //   mode: 'text',
          //   wsUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/chatApi/api/asr`,
          // }}
        />
      </div>
    </div>
  );
};

const ChatEntry = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const sessionIdFromUrl = searchParams.get("sessionId");
  const [session, setSession] = useState<SessionItem | null>(null);
  const { agentId, agentName, supportInputTypes } = useAgentContext();
  const prevAgentIdRef = useRef<string>("");

  // agent 切换时清空会话
  useEffect(() => {
    if (prevAgentIdRef.current && prevAgentIdRef.current !== agentId) {
      setSession(null);
      setLoading(false);
      if (sessionIdFromUrl) {
        navigate("/chat");
      }
    }
    if (agentId) {
      prevAgentIdRef.current = agentId;
    }
  }, [agentId]);

  const getSessionData = async (sessionId: string) => {
    try {
      const session = await getSessionById(agentId || AgentId, sessionId);
      const messages = await getSessionMessagesById(agentId || AgentId, sessionId, {
        pageNo: 1,
        pageSize: 99,
      });
      if (session?.id && messages?.records) {
        setSession({
          ...session,
          sessionId: session.id,
          sessionName: session.name,
          lastEventId: session.lastAppliedEventId,
          messages: messages.records?.reverse?.(),
        });
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (!sessionIdFromUrl) {
      setLoading(false);
    } else {
      setLoading(true);
      getSessionData(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  if (loading) return <Skeleton />;

  return <Chat key={agentId} session={session} agentId={agentId || AgentId} agentName={agentName || "个人助理"} supportInputTypes={supportInputTypes} />;
};

export default ChatEntry;
