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


import React from "react";
import MessageItem from "../MessageItem";
import styles from "./index.module.less";
import type { AgentSessionMessage, UserSessionMessage } from "../../types";
import { SessionMessageType } from "../../types/enums";

export interface MessageListProps {
  messages: Array<AgentSessionMessage | UserSessionMessage>;
  userName?: string;
  agentName?: string;
  onToggleExpand?: (
    id: number,
    isExpanded: boolean,
    type: "task" | "action"
  ) => void;
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

const MessageList: React.FC<MessageListProps> = ({
  messages,
  userName,
  agentName,
  onToggleExpand,
  style,
  className,
  customTagMap,
  supportAgentTTS,
  ttsWsUrl,
  ttsAutoPlay,
  onLike,
  onDislike,
}) => {
  // 记录初始加载的消息 ID 集合，用于区分历史消息和新消息
  const initialMessageIdsRef = React.useRef<Set<number> | null>(null);
  
  // 首次渲染时记录已有消息 ID
  if (initialMessageIdsRef.current === null) {
    initialMessageIdsRef.current = new Set(messages.map(m => m.id));
  }

  // 找到最后一条新增的 agent 消息 ID（不在初始集合中的）
  const lastNewAgentMessageId = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (
        msg.type === SessionMessageType.AGENT &&
        !initialMessageIdsRef.current?.has(msg.id)
      ) {
        return msg.id;
      }
    }
    return null;
  }, [messages]);

  return (
    <div className={`${styles.messageList} ${className || ""}`} style={style}>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          userName={userName}
          agentName={agentName}
          onToggleExpand={onToggleExpand}
          customTagMap={customTagMap}
          supportAgentTTS={supportAgentTTS}
          ttsWsUrl={ttsWsUrl}
          ttsAutoPlay={ttsAutoPlay}
          isLastMessage={message.id === lastNewAgentMessageId}
          onLike={onLike}
          onDislike={onDislike}
        />
      ))}
    </div>
  );
};

export default MessageList;
