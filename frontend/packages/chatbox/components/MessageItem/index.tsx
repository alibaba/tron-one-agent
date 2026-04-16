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


import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import TaskContentRender from "../TaskContent";
import ActionContentRender from "../ActionContent";
import TextContentRender from "../TextContent";
import HitlContentRender from "../HitlContent";
import styles from "./index.module.less";
import type { AgentSessionMessage, UserSessionMessage, TextContent } from "../../types";
import {
  SessionMessageType,
  ContentType,
  SessionMessageStatus,
} from "../../types/enums";
import { useTTS } from "../../hooks/useTTS";

/**
 * Extract plain text from markdown, excluding HTML tags and their content
 * Supports streaming: unclosed tags will be truncated
 */
const extractTextForTTS = (markdown: string): string => {
  if (!markdown) return "";

  let result = markdown;

  // 1. Remove closed HTML tags and their content
  result = result.replace(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>[\s\S]*?<\/\1>/g, "");

  // 2. Streaming: remove unclosed tag start parts
  const unclosedTagMatch = result.match(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>(?:(?!<\/\1>)[\s\S])*$/);
  if (unclosedTagMatch) {
    result = result.slice(0, unclosedTagMatch.index);
  }

  // 3. Remove remaining standalone HTML tags
  result = result.replace(/<[^>]+\/>/g, "");

  // 4. Remove markdown code blocks
  result = result.replace(/```[\s\S]*?```/g, "");
  // Streaming: unclosed code blocks
  const unclosedCodeBlock = result.match(/```[\s\S]*$/);
  if (unclosedCodeBlock) {
    result = result.slice(0, unclosedCodeBlock.index);
  }

  // 5. Remove inline code
  result = result.replace(/`[^`]+`/g, "");

  // 6. Remove markdown links, keep text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 7. Remove markdown heading symbols
  result = result.replace(/^#{1,6}\s+/gm, "");

  // 8. Remove bold and italic symbols
  result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
  result = result.replace(/\*([^*]+)\*/g, "$1");
  result = result.replace(/__([^_]+)__/g, "$1");
  result = result.replace(/_([^_]+)_/g, "$1");

  // 9. Remove markdown dividers
  result = result.replace(/^[-*_]{3,}$/gm, "");

  // 10. Remove markdown table divider rows
  result = result.replace(/\|?[\s]*[-:]+[\s]*\|[\s\-:|]+\|?/g, "");
  // Remove table cell dividers
  result = result.replace(/\|/g, " ");

  // 11. Remove list symbols
  result = result.replace(/^[\s]*[-*+]\s+/gm, "");
  result = result.replace(/^[\s]*\d+\.\s+/gm, "");

  // 12. 移除引用符号
  result = result.replace(/^>+\s*/gm, "");

  // 13. 清理特殊字符和多余空白
  result = result.replace(/&nbsp;/gi, " ");   // HTML 空格实体
  result = result.replace(/&amp;/gi, "&");    // HTML & 实体
  result = result.replace(/&lt;/gi, "<");     // HTML < 实体
  result = result.replace(/&gt;/gi, ">");     // HTML > 实体
  result = result.replace(/&quot;/gi, '"');   // HTML " 实体
  result = result.replace(/&#?\w+;/g, "");    // 其他 HTML 实体
  result = result.replace(/[\n\t\r]/g, " ");  // 换行符、制表符转为空格
  result = result.replace(/\s{2,}/g, " ");     // 多个空格合并为一个
  result = result.trim();

  return result;
};

export interface MessageItemProps {
  message: AgentSessionMessage | UserSessionMessage;
  userName?: string;
  agentName?: string;
  onToggleExpand?: (id: number, isExpanded: boolean, type: 'task' | 'action') => void;
  customTagMap?: Record<string, React.FC<any>>;
  /** 是否支持 Agent TTS 功能 */
  supportAgentTTS?: boolean;
  /** TTS WebSocket URL */
  ttsWsUrl?: string;
  /** 是否自动播放 TTS，默认 false */
  ttsAutoPlay?: boolean;
  /** 是否是最后一条消息，用于控制自动播放 */
  isLastMessage?: boolean;
  /** 点赞回调 */
  onLike?: (messageId: number) => void;
  /** 点踩回调 */
  onDislike?: (messageId: number) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userName,
  agentName,
  onToggleExpand,
  customTagMap,
  supportAgentTTS = false,
  ttsWsUrl,
  ttsAutoPlay = false,
  isLastMessage = false,
  onLike,
  onDislike,
}) => {
  const isUser = message.type === SessionMessageType.USER;
  const isAgent = message.type === SessionMessageType.AGENT;

  // 默认 TTS WebSocket URL
  const defaultTtsWsUrl = useMemo(() => {
    if (ttsWsUrl) return ttsWsUrl;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/chatApi/api/tts`;
  }, [ttsWsUrl]);

  // TTS 状态
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  // 提取消息中的所有文本内容，转换为纯文本用于 TTS
  const textContent = useMemo(() => {
    if (!isAgent || !message.contents) return "";
    const rawText = message.contents
      .filter((content): content is TextContent => content.type === ContentType.TEXT)
      .map((content) => (content as TextContent).text)
      .join("\n");
    return extractTextForTTS(rawText);
  }, [message.contents, isAgent]);

  // 记录已发送到 TTS 的文本长度
  const sentTextLengthRef = useRef(0);
  // 记录当前是否处于 TTS 播放模式
  const isTTSActiveRef = useRef(false);

  console.log("MessageItem", { message, textContent });

  // TTS Hook
  const {
    isPlaying,
    speak,
    appendText,
    stop,
    complete,
  } = useTTS({
    wsUrl: defaultTtsWsUrl,
  });

  // 处理 TTS 按钮点击
  const handleTTSClick = useCallback(() => {
    if (isPlaying) {
      // 取消播放
      stop();
      sentTextLengthRef.current = 0;
      isTTSActiveRef.current = false;
    } else {
      // 开始播放（从头开始）
      if (textContent) {
        sentTextLengthRef.current = 0;
        isTTSActiveRef.current = true;
        const isCompleted = message.status === SessionMessageStatus.SUCCEED;
        speak(textContent, isCompleted);
        sentTextLengthRef.current = textContent.length;
        if (isCompleted) {
          isTTSActiveRef.current = false;
        }
      }
    }
  }, [isPlaying, stop, speak, textContent, message.status]);

  // 流式追加文本到 TTS
  useEffect(() => {
    if (!isTTSActiveRef.current || !isPlaying) return;

    const currentLength = textContent.length;
    const sentLength = sentTextLengthRef.current;
    const isCompleted = message.status === SessionMessageStatus.SUCCEED;

    // 有新文本需要发送
    if (currentLength > sentLength) {
      const newText = textContent.slice(sentLength);
      appendText(newText, isCompleted);
      sentTextLengthRef.current = currentLength;
      if (isCompleted) {
        isTTSActiveRef.current = false;
      }
    } else if (isCompleted && currentLength === sentLength && sentLength > 0) {
      complete();
      isTTSActiveRef.current = false;
    }
  }, [textContent, isPlaying, appendText, complete, message.status]);

  // 自动播放 TTS
  const hasTriggeredAutoPlayRef = useRef(false);
  useEffect(() => {
    if (
      !ttsAutoPlay ||
      !supportAgentTTS ||
      !isAgent ||
      !isLastMessage ||
      !textContent ||
      hasTriggeredAutoPlayRef.current ||
      isPlaying
    ) {
      return;
    }

    // 新消息正在生成或快速完成时触发自动播放（isLastMessage 已确保只对新增消息生效）
    if (
      message.status === SessionMessageStatus.EXECUTING ||
      message.status === SessionMessageStatus.SUCCEED
    ) {
      hasTriggeredAutoPlayRef.current = true;
      sentTextLengthRef.current = 0;
      isTTSActiveRef.current = true;
      const isCompleted = message.status === SessionMessageStatus.SUCCEED;
      speak(textContent, isCompleted);
      sentTextLengthRef.current = textContent.length;
      if (isCompleted) {
        isTTSActiveRef.current = false;
      }
    }
  }, [ttsAutoPlay, supportAgentTTS, isAgent, isLastMessage, textContent, message.status, isPlaying, speak]);

  // 处理点赞
  const handleLike = useCallback(() => {
    if (!isLiked) {
      setIsLiked(true);
      setIsDisliked(false);
      onLike?.(message.id);
    }
  }, [isLiked, message.id, onLike]);

  // 处理点踩
  const handleDislike = useCallback(() => {
    if (!isDisliked) {
      setIsDisliked(true);
      setIsLiked(false);
      onDislike?.(message.id);
    }
  }, [isDisliked, message.id, onDislike]);

  // 组件卸载时停止 TTS
  useEffect(() => {
    return () => {
      stop();
      sentTextLengthRef.current = 0;
      isTTSActiveRef.current = false;
    };
  }, [stop]);

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
      case ContentType.THINKING:
        return (
          <details className={styles.thinkingContent}>
            <summary className={styles.thinkingSummary}>
              <span>深度思考</span>
            </summary>
            <div className={styles.thinkingBody}>
              <TextContentRender
                text={content.text}
                isUser={isUser}
                status={content.status}
                customTagMap={customTagMap}
              />
            </div>
          </details>
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
      case ContentType.HITL:
        return <HitlContentRender content={content} />;
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
        case SessionMessageStatus.CANCELLED:
          return (
            <div className={styles.messageStatus} style={{ color: "#faad14" }}>
              <i className="fas fa-ban"></i>
              <span>已取消</span>
            </div>
          );
        default:
          return null;
      }
    }
    return null;
  }, [message.status, isUser, isAgent]);

  // TTS 播放图标
  const ttsButton = useMemo(() => {
    if (!isAgent || !supportAgentTTS || !textContent) return null;
    return (
      <button
        className={`${styles.ttsIconBtn}${isPlaying ? ` ${styles.ttsPlaying}` : ''}`}
        onClick={handleTTSClick}
        title={isPlaying ? '停止播放' : '语音播放'}
      >
        {isPlaying ? (
          <i className="fas fa-stop-circle"></i>
        ) : (
          <i className="fas fa-volume-up"></i>
        )}
      </button>
    );
  }, [isAgent, supportAgentTTS, textContent, isPlaying, handleTTSClick]);

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

        {(statusElement || ttsButton) && (
          <div className={styles.statusRow}>
            {statusElement}
            {ttsButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;