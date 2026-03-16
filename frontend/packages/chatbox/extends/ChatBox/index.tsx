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


import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import MessageList from "../../components/MessageList";
import Header from "./Header";
import { NormalMessageInput, MultiModeMessageInput } from "./MessageInput";
import type { AttachmentItem } from "./MessageInput";
import styles from "./index.module.less";
import {
  UserSessionMessage,
  AgentSessionMessage,
  SessionMessageType,
} from "../../types";
import { ContentType } from "../../types/enums";
import { throttle } from "lodash";
import cls from "classnames";

export interface ChatBoxProps {
  sessionId?: string | number;
  sessionName: string;
  userName?: string;
  agentName?: string;

  messages?: Array<AgentSessionMessage | UserSessionMessage>;
  running: boolean;
  handleSendMessage?: (message: string, attachments?: AttachmentItem[]) => Promise<boolean>;
  mardkownComponents?: Record<string, React.ComponentType<any>>;
  supportInputTypes?: ContentType[];

  userInputRender?: () => React.ReactNode;
  headerRender?: () => React.ReactNode;
  onCreateSessionClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  customTagMap?: Record<string, React.FC<any>>;
  /** 是否支持 Agent TTS 功能 */
  supportAgentTTS?: boolean;
  /** TTS WebSocket URL */
  ttsWsUrl?: string;
  /** 是否自动播放 TTS */
  ttsAutoPlay?: boolean;
  /** 点赞回调 */
  onLike?: (messageId: number) => void;
  /** 点踩回调 */
  onDislike?: (messageId: number) => void;
}

// 显示回到底部按钮的阈值
const SHOW_BACK_TO_BOTTOM_THRESHOLD = 200;
// 自动吸底阈值
const AUTO_SCROLL_THRESHOLD = 100;
const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const {
    sessionId,
    sessionName,
    userName,
    agentName,
    messages,
    handleSendMessage,
    running,
    userInputRender,
    headerRender,
    onCreateSessionClick,
    style,
    className,
    customTagMap,
    supportInputTypes,
    supportAgentTTS,
    ttsWsUrl,
    ttsAutoPlay,
    onLike,
    onDislike,
  } = props;

  // 只有 TEXT 时使用文本模式，包含 IMAGE/VIDEO/AUDIO 时使用多模式
  const isMultiMode = useMemo(() => {
    if (!supportInputTypes) return false;
    return (
      supportInputTypes.includes(ContentType.IMAGE) ||
      supportInputTypes.includes(ContentType.VIDEO) ||
      supportInputTypes.includes(ContentType.AUDIO)
    );
  }, [supportInputTypes]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showBackToBottom, setShowBackToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const messageListRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const autoScrollTimerRef = useRef<number>();

  const handleMessageSend = useCallback(async () => {
    if (!inputValue.trim() || !handleSendMessage) return;

    try {
      setSending(true);
      await handleSendMessage(inputValue);
      setInputValue("");
    } catch (error) {
      console.error("发送消息失败:", error);
    } finally {
      setSending(false);
    }
  }, [inputValue, handleSendMessage]);

  const handleMessageSendWithAttachments = useCallback(
    async (text: string, attachments?: AttachmentItem[]) => {
      if ((!text.trim() && (!attachments || attachments.length === 0)) || !handleSendMessage) return;

      try {
        setSending(true);
        await handleSendMessage(text, attachments);
        setInputValue("");
      } catch (error) {
        console.error("发送消息失败:", error);
      } finally {
        setSending(false);
      }
    },
    [handleSendMessage]
  );

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  // 检测滚动位置和方向
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // 检测是否向上滚动
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;
    
    // 用户向上滚动，退出自动吸底
    if (isScrollingUp) {
      autoScrollRef.current = false;
    }
    
    // 用户滚动到底部附近，重新启用自动吸底
    if (distanceFromBottom <= AUTO_SCROLL_THRESHOLD) {
      autoScrollRef.current = true;
    }
    
    const shouldShowBackToBottom = distanceFromBottom >= SHOW_BACK_TO_BOTTOM_THRESHOLD;
    setShowBackToBottom(shouldShowBackToBottom);
  }, []);

  const handleScroll = useCallback(
    throttle(
      (e) => {
        checkScrollPosition();
      },
      100,
      { leading: false }
    ),
    [checkScrollPosition]
  );

  const handleBackToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [scrollContainerRef.current, handleScroll]);

  useEffect(() => scrollToBottom(), [messages?.length]);

  // running 时启动自动吸底定时器
  useEffect(() => {
    if (running) {
      autoScrollRef.current = true;
      autoScrollTimerRef.current = window.setInterval(() => {
        if (autoScrollRef.current) {
          scrollToBottom();
        }
      }, 100);
    } else {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = undefined;
      }
    }
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = undefined;
      }
    };
  }, [running, scrollToBottom]);

  return (
    <div className={cls(styles.chatMain, className)} style={style}>
      {headerRender?.() ?? (
        <Header
          sessionName={sessionName}
          onCreateSessionClick={onCreateSessionClick}
        />
      )}
      <div ref={messageListRef} className={styles.chatMessagesWrap}>
        <div
          ref={scrollContainerRef}
          style={{ overflowY: "auto", height: "100%" }}
        >
          <MessageList
            key={sessionId}
            messages={messages || []}
            userName={userName}
            agentName={agentName}
            customTagMap={customTagMap}
            supportAgentTTS={supportAgentTTS}
            ttsWsUrl={ttsWsUrl}
            ttsAutoPlay={ttsAutoPlay}
            onLike={onLike}
            onDislike={onDislike}
          />
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
        {showBackToBottom && (
          <div
            className={styles.backToBottom}
            onClick={handleBackToBottom}
            style={{ bottom: "10px" }}
          >
            <i className="fas fa-arrow-down"></i>
          </div>
        )}
      </div>
      {userInputRender?.() ?? (
        <div className={styles.chatInputContainer}>
          {isMultiMode ? (
            <MultiModeMessageInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleMessageSendWithAttachments}
              disabled={sending || running}
              placeholder={
                sending ? "发送中..." : "输入消息... (Enter发送，Shift+Enter换行)"
              }
              supportInputTypes={supportInputTypes}
            />
          ) : (
            <NormalMessageInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleMessageSendWithAttachments}
              disabled={sending || running}
              placeholder={
                sending ? "发送中..." : "输入消息... (Enter发送，Shift+Enter换行)"
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBox;

export { Header, NormalMessageInput, MultiModeMessageInput, ChatBox };
export type { AttachmentItem } from "./MessageInput";
