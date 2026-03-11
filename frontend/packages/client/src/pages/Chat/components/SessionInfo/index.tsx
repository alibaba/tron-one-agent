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
import {
  UserSessionMessage,
  AgentSessionMessage,
  ContentType,
  SessionMessageType,
} from "chatbox";
import { SessionResult } from "@/services/session";
import styles from "./index.module.less";
import { TaskContent } from "chatbox/types";

function SessionInfo({
  session,
  messages,
}: {
  session: SessionResult;
  messages: Array<UserSessionMessage | AgentSessionMessage>;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  const taskTotal = useMemo(() => {
    if (!messages) return 0;
    return messages.reduce((pre, cur) => {
      if (cur && cur.id && cur.contents?.length) {
        return (
          pre +
          cur.contents.filter((content) => content.type === ContentType.TASK)
            .length
        );
      }
      return pre;
    }, 0);
  }, [messages]);

  const actionTotal = useMemo(() => {
    if (!messages) return 0;
    return messages.reduce((pre, cur) => {
      // 计算当前消息中的ACTION数量
      const actions = cur.contents.filter(
        (content) => content.type === ContentType.ACTION
      ).length;

      // 计算当前消息中的TASK中的ACTION数量
      const taskList = cur.contents.filter(
        (content) => content.type === ContentType.TASK
      ) as TaskContent[];

      let taskActions = 0;
      if (taskList.length > 0) {
        taskActions = taskList.reduce((preTaskActions, curTask) => {
          if (curTask && curTask.contents?.length) {
            return (
              preTaskActions +
              curTask.contents.filter(
                (content) => content.type === ContentType.ACTION
              ).length
            );
          }
          return preTaskActions;
        }, 0);
      }

      return pre + actions + taskActions;
    }, 0);
  }, [messages]);

  return (
    <div className={styles.sessionInfo}>
      <div className={styles.sessionHeader}>
        <h3>会话信息</h3>
      </div>

      <div className={styles.sessionDetails}>
        <div className="detail-item">
          <label>会话Id：</label>
          <span>{session?.id}</span>
        </div>

        <div className={styles.detailItem}>
          <label>用户：</label>
          <span>{session?.userId}</span>
        </div>

        {/* <iv className="detail-item">
          <label>工作台ID：</label>
          <span>{session?.UserWorkNo}</span>
        </div> */}

        <div className={styles.detailItem}>
          <label>创建时间：</label>
          <span>{session?.gmtCreated ? formatDate(session?.gmtCreated) : '-'}</span>
        </div>

        <div className={styles.detailItem}>
          <label>最后修改：</label>
          <span>{session?.gmtModified ? formatDate(session?.gmtModified) : '-'}</span>
        </div>

        <div className={styles.detailItem}>
          <label>消息总数：</label>
          <span>{messages?.length || 0}</span>
        </div>
      </div>

      <div className={styles.sessionStats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {messages?.filter((m) => m.type === SessionMessageType.USER)
              .length || 0}
          </div>
          <div className={styles.statLabel}>用户消息</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {messages?.filter((m) => m.type === SessionMessageType.AGENT)
              .length || 0}
          </div>
          <div className={styles.statLabel}>AI回复</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{taskTotal}</div>
          <div className={styles.statLabel}>任务数</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{actionTotal}</div>
          <div className={styles.statLabel}>行为数</div>
        </div>
      </div>
    </div>
  );
}

export default SessionInfo;
