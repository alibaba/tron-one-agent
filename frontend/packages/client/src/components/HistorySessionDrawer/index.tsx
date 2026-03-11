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


import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions, type SessionHistoryResult } from "@/services/session";
import { Drawer, List, message, Space, DrawerProps } from "antd";
import moment from "moment";
import { useAgentContext } from "@/context/AgentContext";

export interface HistorySessionDrawerProps {
  open: DrawerProps["open"];
  onClose: DrawerProps["onClose"];
}
function HistorySessionDrawer({ open, onClose }: HistorySessionDrawerProps) {
  const [data, setData] = useState<SessionHistoryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { agentId } = useAgentContext();

  const getData = async (pageNo: number, pageSize: number) => {
    try {
      const result = await getSessions(agentId || "simple_agent", { pageNo, pageSize });
      if (result) {
        setData(result);
      } else {
        message.error("获取会话历史失败");
      }
    } catch (e) {
      message.error("获取会话历史失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      getData(1, 10);
    }
  }, [open, agentId]);

  const onOpenHistory = (item: SessionHistoryResult["records"][number]) => {
    navigate(`/chat?sessionId=${item.id}`);
    onClose?.(new Event("open") as unknown as React.MouseEvent);
  };

  return (
    <>
      <Drawer
        title="历史对话"
        open={open}
        closable
        closeIcon={false}
        onClose={onClose}
        width={600}
        destroyOnClose
        forceRender
        getContainer={false}
      >
        <List
          loading={loading}
          itemLayout="horizontal"
          dataSource={data?.records}
          pagination={{
            pageSize: data?.pageSize,
            total: data?.totalRecords,
            current: data?.pageNo,
            onChange: (page, pageSize) => getData(page, pageSize),
          }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <a onClick={() => onOpenHistory(item)}>
                    {item.name || "新会话"}
                  </a>
                }
                description={
                  <>
                    <Space>
                      <span>
                        创建于:{" "}
                        {moment(item.gmtCreated).format("YYYY-MM-DD HH:mm:SS")}
                      </span>
                      <span>
                        更新于:{" "}
                        {moment(item.gmtModified).format("YYYY-MM-DD HH:mm:SS")}
                      </span>
                    </Space>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}

export default HistorySessionDrawer;
