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
  useChatModel,
  useEventSource,
  SseEventSource,
  ContentType,
  SessionMessageStatus,
  SessionMessageType,
  UserSessionMessage,
  AgentSessionMessage,
} from "chatbox";
import { ChatBox } from "chatbox/extends/ChatBox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import { createChat, setServiceConfig } from "chatbox/extends/service";
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
  const sseEventSource = useEventSource<SseEventSource>(
    () =>
      new SseEventSource({
        urlBuilder: (params) => {
          const baseUrl = `/chatApi/api/agents/${agentId}/sessions/${params.sessionId}/events`;
          return `${baseUrl}?offset=${params.lastEventId}&size=100`;
        },
        headers: {
          "X-User-Id": encodeURIComponent(getUserId()),
          "X-User-Name": encodeURIComponent(getUserName()),
        },
      }),
    [agentId]
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
      sessionId: session?.sessionId || "",
      messages: session?.messages || [],
      lastEventId: session?.lastEventId || 0,
      sessionName: session?.sessionName || "新会话",
    },
    eventSource: sseEventSource,
  });
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
      sendUserMessageShawde({
        id: newMessageId,
        contents: userContents.length > 0 ? userContents : [{ type: ContentType.TEXT, text: inputStr }],
        status: SessionMessageStatus.EXECUTING,
      });

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

      if (chatState.sessionId) {
        // session中继续对话
        try {
          const chatResult = await createChat(agentId, chatState.sessionId, {
            data: { input: inputContents },
          });
          if (chatResult === "success") {
            run();
          } else {
            updateUserMessageShawdeStatus(
              newMessageId,
              SessionMessageStatus.FAILED
            );
            message.error(
              typeof chatResult === "string" ? chatResult : "对话创建失败"
            );
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
          const sessionResult = await createSession(agentId);
          if (sessionResult.length > 0) {
            try {
              const chatResult = await createChat(agentId, sessionResult, {
                data: { input: inputContents },
              });
              if (chatResult === "success") {
                update({
                  sessionId: sessionResult,
                });
                run();
              } else {
                updateUserMessageShawdeStatus(
                  newMessageId,
                  SessionMessageStatus.FAILED
                );
                message.error(
                  typeof chatResult === "string" ? chatResult : "对话创建失败"
                );
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
            message.error(
              typeof sessionResult === "string" ? sessionResult : "会话创建失败"
            );
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
    [chatState.sessionId, agentId, run, update]
  );
  const onCreateSessionClick = useCallback(async () => {
    reset();
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
  }, [agentId, reset]);

  return (
    <div className={styles.container}>
      <div className={styles.sessionInfoWrap}>
        <SessionInfo session={session} messages={chatState.messages} />
      </div>
      <div className={styles.chatWrap}>
        <ChatBox
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
