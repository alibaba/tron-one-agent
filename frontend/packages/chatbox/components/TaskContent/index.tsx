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
import ActionContent from "../ActionContent";
import TextContent from "../TextContent";
import { ContentType, TaskContent, TaskStatus } from "../../types";
import styles from "./index.module.less";

export interface TaskContentProps {
  task: TaskContent;
  onToggleExpand?: (taskId: number, isExpanded: boolean) => void;
}

const TaskContentRender: React.FC<TaskContentProps> = ({ task, onToggleExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    // 触发展开/收起回调
    if (onToggleExpand) {
      onToggleExpand(task.id!, newExpandedState);
    }
  };

  useEffect(() => {
    if (task.status === TaskStatus.EXECUTING) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [task.status]);

  const getStatusIcon = (status?: TaskStatus) => {
    switch (status) {
      case TaskStatus.WAITING:
        return "fa-clock";
      case TaskStatus.EXECUTING:
        return "fa-spinner fa-spin";
      case TaskStatus.SUCCEED:
        return "fa-check-circle";
      case TaskStatus.FAILED:
        return "fa-times-circle";
      default:
        return "fa-question-circle";
    }
  };

  const getStatusColor = (status?: TaskStatus) => {
    switch (status) {
      case TaskStatus.WAITING:
        return "#ffa500";
      case TaskStatus.EXECUTING:
        return "#1890ff";
      case TaskStatus.SUCCEED:
        return "#52c41a";
      case TaskStatus.FAILED:
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

  const renderContent = (content: any) => {
    switch (content.type) {
      case ContentType.ACTION:
        return <ActionContent key={content.actionId} action={content} onToggleExpand={onToggleExpand} />;
      case ContentType.TEXT:
        return (
          <div className={styles.taskTextContent}>
            <TextContent text={content.text} status={content.status} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.taskContent}>
      <div className={styles.taskHeader} onClick={toggleExpanded}>
        <div className={styles.taskInfo}>
          <i
            className={`fas ${getStatusIcon(task.status)} ${
              styles.taskStatusIcon
            }`}
            style={{ color: getStatusColor(task.status) }}
          />
          <span className={styles.taskTitle}>{task.title}</span>
          {task.gmtFinished && (
            <span className={styles.taskTime}>
              完成于 {formatTime(task.gmtFinished)}
            </span>
          )}
        </div>
        <i
          className={`fas ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"} ${
            styles.expandIcon
          }`}
        />
      </div>

      {task.description && (
        <div className={styles.taskDescription}>{task.description}</div>
      )}

      {task.contents && task.contents.length > 0 && (
        <div
          className={styles.taskContents}
          style={{ display: isExpanded ? "block" : "none" }}
        >
          {task.contents.map((content, index) => (
            <div key={index} className={styles.taskContentItem}>
              {renderContent(content)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskContentRender;