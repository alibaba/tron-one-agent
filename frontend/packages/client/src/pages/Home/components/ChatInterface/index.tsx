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


import React, { useState, useMemo } from "react";
import styles from "./index.less";
import { Button } from "antd";
import HistorySessionDrawer from "@/components/HistorySessionDrawer";
import { NormalMessageInput, MultiModeMessageInput } from "chatbox/extends/ChatBox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import { ContentType } from "chatbox";

interface ChatInterfaceProps {
  selectedQuestion?: string;
  onQuestionClear?: () => void;
  handleSendMessage: (input: string, attachments?: AttachmentItem[]) => void;
  supportInputTypes?: ContentType[];
}

function ChatInterface({
  selectedQuestion,
  onQuestionClear,
  handleSendMessage,
  supportInputTypes,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [openHistorySession, setOpenHistorySession] = useState(false);

  React.useEffect(() => {
    if (selectedQuestion) {
      setMessage(selectedQuestion);
      if (onQuestionClear) {
        onQuestionClear();
      }
    }
  }, [selectedQuestion, onQuestionClear]);

  const isMultiMode = useMemo(() => {
    if (!supportInputTypes) return false;
    return (
      supportInputTypes.includes(ContentType.IMAGE) ||
      supportInputTypes.includes(ContentType.VIDEO) ||
      supportInputTypes.includes(ContentType.AUDIO)
    );
  }, [supportInputTypes]);

  const handleSend = (value: string, attachments?: AttachmentItem[]) => {
    if (value.trim() || (attachments && attachments.length > 0)) {
      handleSendMessage(value, attachments);
      setMessage("");
    }
  };

  return (
    <>
      <section className={styles["chat-interface"]}>
        <div className={styles["chat-container"]}>
          <div className={styles["chat-input-area"]}>
            {isMultiMode ? (
              <MultiModeMessageInput
                value={message}
                onChange={setMessage}
                onSend={handleSend}
                placeholder="请输入您的问题...（Enter发送，Shift+Enter换行）"
                supportInputTypes={supportInputTypes}
              />
            ) : (
              <NormalMessageInput
                value={message}
                onChange={setMessage}
                onSend={handleSend}
                placeholder="请输入您的问题，或从上方选择常见问题...（Enter发送，Shift+Enter换行）"
              />
            )}
            <div className={styles["input-toolbar"]}>
              <Button
                className={styles["history-btn"]}
                type="link"
                onClick={() => setOpenHistorySession(true)}
              >
                <i className="fas fa-history" style={{ marginRight: 6 }}></i>
                历史对话
              </Button>
            </div>
          </div>
        </div>
      </section>
      <HistorySessionDrawer
        open={openHistorySession}
        onClose={() => setOpenHistorySession(false)}
      />
    </>
  );
}

export default ChatInterface;
