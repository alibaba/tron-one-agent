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
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Typography,
  Divider,
  message,
} from "antd";
import {
  EyeOutlined,
  ToolOutlined,
  ApiOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { AgentConfig } from "../../types/agent.interface";
import { LocalAgentType } from "../../types/common.interface";
import { getAllAgents, updateAgent } from "../../services/agent";
import RenameButton from "./components/RenameButton";
import StatusToggleButton from "./components/StatusToggleButton";
import ToolsButton from "./components/ToolsButton";
import McpButton from "./components/McpButton";
import KbButton from "./components/KbButton";
import SystemPromptButton from "./components/SystemPromptButton";
import SubAgentButton from "./components/SubAgentButton";
import ChatConfigButton from "./components/ChatConfigButton";
import SkillButton from "./components/SkillButton";
import agentsStyles from "./index.module.less";

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const reactAgents = agents.filter((a) => a.type === LocalAgentType.REACT);
  const oneAgents = agents.filter((a) => a.type === LocalAgentType.ONE);

  const reactColumns: ColumnsType<AgentConfig> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "red"}>{enabled ? "在线" : "离线"}</Tag>
      ),
    },
    {
      title: "最大迭代",
      dataIndex: "maxIters",
      key: "maxIters",
    },
    {
      title: "工具",
      key: "toolsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ToolOutlined />} color="blue">
          {record.tools?.length || 0}
        </Tag>
      ),
    },
    {
      title: "MCP",
      key: "mcpCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ApiOutlined />} color="green">
          {record.mcpClients?.length || 0}
        </Tag>
      ),
    },
    {
      title: "知识库",
      key: "kbCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<DatabaseOutlined />} color="purple">
          {record.knowledgeBases?.length || 0}
        </Tag>
      ),
    },
    {
      title: "Skills",
      key: "skillsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ThunderboltOutlined />} color="orange">
          {record.skills?.length || 0}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 400,
      fixed: "right",
      render: (_, record: AgentConfig) => (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Space size="small" wrap>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            >
              详情
            </Button>
            <RenameButton agent={record} onSuccess={handleSuccess} />
            <StatusToggleButton agent={record} onSuccess={handleSuccess} />
            <SystemPromptButton agent={record} onSuccess={handleSuccess} />
          </Space>
          <Space size="small" wrap>
            <ChatConfigButton agent={record} onSuccess={handleSuccess} />
            <KbButton agent={record} onSuccess={handleSuccess} />
            <ToolsButton agent={record} onSuccess={handleSuccess} />
            <McpButton agent={record} onSuccess={handleSuccess} />
            <SkillButton agent={record} onSuccess={handleSuccess} />
          </Space>
        </Space>
      ),
    },
  ];

  const oneColumns: ColumnsType<AgentConfig> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "red"}>{enabled ? "在线" : "离线"}</Tag>
      ),
    },
    {
      title: "子Agent",
      key: "subAgentCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<TeamOutlined />} color="orange">
          {record.subAgents?.length || 0}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 400,
      fixed: "right",
      render: (_, record: AgentConfig) => (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Space size="small" wrap>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            >
              详情
            </Button>
            <RenameButton agent={record} onSuccess={handleSuccess} />
            <StatusToggleButton agent={record} onSuccess={handleSuccess} />
            <SystemPromptButton agent={record} onSuccess={handleSuccess} />
          </Space>
          <Space size="small" wrap>
            <ChatConfigButton agent={record} onSuccess={handleSuccess} />
            <SubAgentButton agent={record} onSuccess={handleSuccess} />
          </Space>
        </Space>
      ),
    },
  ];

  // 加载Agents数据
  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentsData = await getAllAgents();
      console.log("agentsData", agentsData);
      setAgents(agentsData.data);
    } catch (error) {
      console.error("加载Agents失败:", error);
      message.error("加载Agents失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadAgents();
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateAgent(id, { enabled });
      setAgents((prev) =>
        prev.map((agent) => (agent.id === id ? { ...agent, enabled } : agent))
      );
      message.success(`Agent已${enabled ? "启用" : "禁用"}`);
    } catch (error) {
      console.error("状态更新失败:", error);
      message.error("状态更新失败，请重试");
    }
  };

  const handleView = (agent: AgentConfig) => {
    navigate(`/agents/${agent.id}`);
  };

  const handleEdit = (agent: AgentConfig) => {
    // 编辑功能暂未实现，可以跳转到详情页面
    navigate(`/agents/${agent.id}`);
  };

  const handleSuccess = () => {
    // 操作成功后重新加载数据
    loadAgents();
  };

  return (
    <div className={agentsStyles.container}>
      <Card
        title="Agents管理"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAgents}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>OneAgent</Typography.Title>
        <Typography.Text type="secondary">Multi Agents in One</Typography.Text>
        <Table
          columns={oneColumns}
          dataSource={oneAgents}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          style={{ marginTop: 12 }}
        />
        <Divider />
        <Typography.Title level={5} style={{ marginBottom: 0 }}>ReAct Agent</Typography.Title>
        <Typography.Text type="secondary">Reasoning, Acting, Observing Loop Agent(Single)</Typography.Text>
        <Table
          columns={reactColumns}
          dataSource={reactAgents}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          style={{ marginTop: 12 }}
        />
      </Card>
    </div>
  );
};

export default AgentsPage;
