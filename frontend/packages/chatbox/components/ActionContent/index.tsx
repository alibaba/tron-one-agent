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


import React, { useState, useEffect } from "react";
import TextContentRender from "../TextContent";
import type { ActionContent, TextContent } from "../../types";
import { ActionStatus } from "../../types/enums";
import styles from "./index.module.less";

export interface ActionContentProps {
  action: ActionContent;
  onToggleExpand?: (actionId: number, isExpanded: boolean) => void;
}

const ActionContentRender: React.FC<ActionContentProps> = ({ action, onToggleExpand }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    // 触发展开/收起回调
    if (onToggleExpand) {
      onToggleExpand(action.id!, newExpandedState);
    }
  };

  useEffect(() => {
    if (action.status === ActionStatus.EXECUTING) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [action.status]);

  const getStatusIcon = (status: ActionStatus) => {
    switch (status) {
      case ActionStatus.EXECUTING:
        return "fa-spinner fa-spin";
      case ActionStatus.SUCCEED:
        return "fa-check-circle";
      case ActionStatus.FAILED:
        return "fa-times-circle";
      default:
        return "fa-question-circle";
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case ActionStatus.EXECUTING:
        return "#1890ff";
      case ActionStatus.SUCCEED:
        return "#52c41a";
      case ActionStatus.FAILED:
        return "#ff4d4f";
      default:
        return "#d9d9d9";
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={styles.actionContent}>
      <div className={styles.actionHeader} onClick={toggleExpanded}>
        <div className={styles.actionInfo}>
          <i
            className={`fas ${getStatusIcon(action.status)} ${
              styles.actionStatusIcon
            }`}
            style={{ color: getStatusColor(action.status) }}
          />
          <span className={styles.actionTitle}>{action.title}</span>
          {action.gmtFinished && (
            <span className={styles.actionTime}>
              完成于 {formatTime(action.gmtFinished)}
            </span>
          )}
        </div>
        <i
          className={`fas ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"} ${
            styles.expandIcon
          }`}
        />
      </div>

      {action.contents && (
        <div
          className={styles.actionContentDetail}
          style={{ display: isExpanded ? "block" : "none" }}
        >
          <div className={styles.actionContentText}>
            <TextContentRender
              text={action.contents
                .map((content) => (content as TextContent).text)
                .join("")}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionContentRender;