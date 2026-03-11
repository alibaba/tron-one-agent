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


import React, { useMemo } from "react";
import TaskContentRender from "../TaskContent";
import ActionContentRender from "../ActionContent";
import TextContentRender from "../TextContent";
import styles from "./index.module.less";
import type { AgentSessionMessage, UserSessionMessage } from "../../types";
import {
  SessionMessageType,
  ContentType,
  SessionMessageStatus,
} from "../../types/enums";

export interface MessageItemProps {
  message: AgentSessionMessage | UserSessionMessage;
  userName?: string;
  agentName?: string;
  onToggleExpand?: (id: number, isExpanded: boolean, type: 'task' | 'action') => void;
  customTagMap?: Record<string, React.FC<any>>;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userName,
  agentName,
  onToggleExpand,
  customTagMap,
}) => {
  const isUser = message.type === SessionMessageType.USER;
  const isAgent = message.type === SessionMessageType.AGENT;

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleExpand = (id: number, isExpanded: boolean, type: 'task' | 'action') => {
    if (onToggleExpand) {
      onToggleExpand(id, isExpanded, type);
    }
  };

  const renderContent = (content: any) => {
    switch (content.type) {
      case ContentType.TEXT:
        return (
          <TextContentRender
            text={content.text}
            isUser={isUser}
            status={content.status}
            customTagMap={customTagMap}
          />
        );
      case ContentType.IMAGE:
        return (
          <div className={styles.mediaContent}>
            <img
              src={content.url || (content.base64_data ? `data:${content.media_type || 'image/png'};base64,${content.base64_data}` : '')}
              alt="image"
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, cursor: 'pointer' }}
              onClick={() => content.url && window.open(content.url, '_blank')}
            />
          </div>
        );
      case ContentType.VIDEO:
        return (
          <div className={styles.mediaContent}>
            <video
              src={content.url}
              controls
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
            />
          </div>
        );
      case ContentType.TASK:
        return <TaskContentRender task={content} onToggleExpand={(taskId, isExpanded) => handleToggleExpand(taskId, isExpanded, 'task')} />;
      case ContentType.ACTION:
        return <ActionContentRender action={content} onToggleExpand={(actionId, isExpanded) => handleToggleExpand(actionId, isExpanded, 'action')} />;
      default:
        return null;
    }
  };

  const statusElement = useMemo(() => {
    if (!message.status) return null;
    if (isUser) {
      switch (message.status) {
        case SessionMessageStatus.EXECUTING:
          return (
            <div className={styles.messageStatus}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>发送中</span>
            </div>
          );
        case SessionMessageStatus.SUCCEED:
          return (
            <div className={styles.messageStatus}>
              <i className="fas fa-check-circle"></i>
              <span>已完成</span>
            </div>
          );
        case SessionMessageStatus.FAILED:
          return (
            <div className={styles.messageStatus} style={{ color: "#ff4d4f" }}>
              <i className="fas fa-exclamation-triangle"></i>
              <span>{"消息发送失败，请稍后重试"}</span>
            </div>
          );
        default:
          return null;
      }
    } else if (isAgent) {
      switch (message.status) {
        case SessionMessageStatus.EXECUTING:
          return (
            <div className={styles.messageStatus}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>处理中</span>
            </div>
          );
        case SessionMessageStatus.SUCCEED:
          return (
            <div className={styles.messageStatus}>
              <i className="fas fa-check-circle"></i>
              <span>已完成</span>
            </div>
          );
        case SessionMessageStatus.FAILED:
          return (
            <div className={styles.messageStatus} style={{ color: "#ff4d4f" }}>
              <i className="fas fa-exclamation-triangle"></i>
              <span>消息获取失败，请稍后重试或者刷新页面尝试获取消息</span>
            </div>
          );
        default:
          return null;
      }
    }
    return null;
  }, [message.status, isUser, isAgent]);

  return (
    <div
      className={`${styles.messageItem} ${isUser ? styles.user : styles.agent}`}
    >
      <div className={styles.messageAvatar}>
        {isUser ? null : (
          <div className={styles.agentAvatar}>
            <i className="fas fa-robot"></i>
          </div>
        )}
      </div>

      <div className={styles.messageContent}>
        <div className={styles.messageHeader}>
          <span className={styles.messageSender}>
            {isUser ? userName || "用户" : agentName ? agentName : "AI Agent"}
          </span>
          <span className={styles.messageTime}>
            {formatTime(message.gmtCreate)}
          </span>
        </div>
        {message.contents.length ? (
          <div className={styles.messageBody}>
            {message.contents.map((content, index) => (
              <div key={index} className={styles.contentItem}>
                {renderContent(content)}
              </div>
            ))}
          </div>
        ) : null}

        {statusElement}
      </div>
    </div>
  );
};

export default MessageItem;