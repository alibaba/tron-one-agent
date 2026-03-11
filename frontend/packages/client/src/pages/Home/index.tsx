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


import React, { useState } from "react";
import { message } from "antd";
import Hero from "./components/Hero";
import ChatInterface from "./components/ChatInterface";
import { useNavigate } from "react-router";
import "./index.module.less";
import { ContentType } from "chatbox";
import type { AttachmentItem } from "chatbox/extends/ChatBox";
import { createSession, createChat } from "@/services/session";
import { useAgentContext } from "@/context/AgentContext";

const FALLBACK_AGENT_ID = "simple_agent";

const Chat = (): React.ReactElement => {
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const navigate = useNavigate();
  const { agentId, supportInputTypes } = useAgentContext();

  const handleQuestionSelect = (question: string) => {
    setSelectedQuestion(question);
  };

  const handleQuestionClear = () => {
    setSelectedQuestion("");
  };

  const handleSendMessage = async (input: string, attachments?: AttachmentItem[]) => {
    try {
      const currentAgentId = agentId || FALLBACK_AGENT_ID;
      const hasContent = input?.trim() || (attachments && attachments.length > 0);
      if (hasContent) {
        const result = await createSession(currentAgentId);
        if (result) {
          // 构建请求 input
          const inputContents: any[] = [];
          if (input?.trim()) {
            inputContents.push({ type: ContentType.TEXT, text: input });
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
          const chatResult = await createChat(currentAgentId, result, {
            input: inputContents,
          });
          if (chatResult === "success") {
            message.success("发送成功");
            navigate(`/chat?sessionId=${result}`);
          }
        } else {
          message.error("创建会话失败，请稍后重试");
        }
      }
    } catch (error) {
      console.log(error);
      message.error("创建会话失败，请稍后重试");
    }
  };

  return (
    <div id="scrollPageContainer" style={{ height: "100%", overflow: "auto" }}>
      <Hero onQuestionSelect={handleQuestionSelect} />
      <ChatInterface
        selectedQuestion={selectedQuestion}
        onQuestionClear={handleQuestionClear}
        handleSendMessage={handleSendMessage}
        supportInputTypes={supportInputTypes}
      />
    </div>
  );
};

export default Chat;
