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
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  userName,
  agentName,
  onToggleExpand,
  style,
  className,
  customTagMap,
}) => {
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
        />
      ))}
    </div>
  );
};

export default MessageList;
