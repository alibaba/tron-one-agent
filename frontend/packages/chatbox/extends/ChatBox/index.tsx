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
}

// 滚动吸附阈值（距离底部px）
const AUTO_SCROLL_THRESHOLD = 50;
// 显示回到底部按钮的阈值
const SHOW_BACK_TO_BOTTOM_THRESHOLD = 80;
const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const {
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
  const autoScrollRef = useRef(true);
  const autoScrollTimerRef = useRef<number>();
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const startAutoScroll = useCallback(() => {
    autoScrollRef.current = true;
    /* @ts-ignore */
    autoScrollTimerRef.current = setInterval(() => {
      if (!autoScrollRef.current) return;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, 500);
  }, []);

  const stopAutoScroll = useCallback(() => {
    autoScrollRef.current = false;
    clearInterval(autoScrollTimerRef.current);
    autoScrollTimerRef.current = undefined;
  }, []);
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const shouldAutoScroll = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    autoScrollRef.current = shouldAutoScroll;
    if (!shouldAutoScroll) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
    const shouldShowBackToBottom =
      distanceFromBottom >= SHOW_BACK_TO_BOTTOM_THRESHOLD;
    setShowBackToBottom(shouldShowBackToBottom);
  }, [stopAutoScroll, startAutoScroll]);

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

  useEffect(() => {
    if (running) {
      scrollToBottom();
    }
  }, [running]);

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
            messages={messages || []}
            userName={userName}
            agentName={agentName}
            onToggleExpand={stopAutoScroll}
            customTagMap={customTagMap}
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
