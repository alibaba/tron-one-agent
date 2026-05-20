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
import { useTranslation } from "react-i18next";
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
import { getAllAgents } from "../../services/agent";
import { colors } from "../../styles/tokens";
import RenameButton from "./components/RenameButton";
import StatusToggleButton from "./components/StatusToggleButton";
import ToolsButton from "./components/ToolsButton";
import McpButton from "./components/McpButton";
import KbButton from "./components/KbButton";
import SystemPromptButton from "./components/SystemPromptButton";
import SubAgentButton from "./components/SubAgentButton";
import ChatConfigButton from "./components/ChatConfigButton";
import SkillButton from "./components/SkillButton";
import MemoryButton from "./components/MemoryButton";
import agentsStyles from "./index.module.less";

const AgentsPage: React.FC = () => {
  const { t } = useTranslation(["agents", "common"]);
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const reactAgents = agents.filter((a) => a.type === LocalAgentType.REACT);
  const oneAgents = agents.filter((a) => a.type === LocalAgentType.ONE);

  const reactColumns: ColumnsType<AgentConfig> = [
    {
      title: t("common:id"),
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: t("agents:columns.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("agents:columns.status"),
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "red"}>{enabled ? t("agents:online") : t("agents:offline")}</Tag>
      ),
    },
    {
      title: t("agents:columns.tools"),
      key: "toolsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ToolOutlined />} style={{ background: colors.gradientCardBlue, borderColor: colors.gradientCardBlue, color: colors.ink }}>
          {record.tools?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.mcp"),
      key: "mcpCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ApiOutlined />} style={{ background: colors.gradientCardBlue, borderColor: colors.gradientCardBlue, color: colors.ink }}>
          {record.mcpClients?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.kb"),
      key: "kbCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<DatabaseOutlined />} style={{ background: colors.gradientCardTeal, borderColor: colors.gradientCardTeal, color: colors.ink }}>
          {record.knowledgeBases?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.skills"),
      key: "skillsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ThunderboltOutlined />} style={{ background: colors.gradientCardPurple, borderColor: colors.gradientCardPurple, color: colors.ink }}>
          {record.skills?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.action"),
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
              {t("agents:viewDetail")}
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
            <MemoryButton agent={record} onSuccess={handleSuccess} />
          </Space>
        </Space>
      ),
    },
  ];

  const oneColumns: ColumnsType<AgentConfig> = [
    {
      title: t("common:id"),
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: t("agents:columns.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("agents:columns.status"),
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "red"}>{enabled ? t("agents:online") : t("agents:offline")}</Tag>
      ),
    },
    {
      title: t("agents:columns.subAgent"),
      key: "subAgentCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<TeamOutlined />} style={{ background: colors.gradientCardDark, borderColor: colors.gradientCardDark, color: colors.onDark }}>
          {record.subAgents?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.tools"),
      key: "toolsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ToolOutlined />} style={{ background: colors.gradientCardBlue, borderColor: colors.gradientCardBlue, color: colors.ink }}>
          {record.tools?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.mcp"),
      key: "mcpCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ApiOutlined />} style={{ background: colors.gradientCardBlue, borderColor: colors.gradientCardBlue, color: colors.ink }}>
          {record.mcpClients?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.kb"),
      key: "kbCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<DatabaseOutlined />} style={{ background: colors.gradientCardTeal, borderColor: colors.gradientCardTeal, color: colors.ink }}>
          {record.knowledgeBases?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.skills"),
      key: "skillsCount",
      render: (_, record: AgentConfig) => (
        <Tag icon={<ThunderboltOutlined />} style={{ background: colors.gradientCardPurple, borderColor: colors.gradientCardPurple, color: colors.ink }}>
          {record.skills?.length || 0}
        </Tag>
      ),
    },
    {
      title: t("agents:columns.action"),
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
              {t("agents:viewDetail")}
            </Button>
            <RenameButton agent={record} onSuccess={handleSuccess} />
            <StatusToggleButton agent={record} onSuccess={handleSuccess} />
            <SystemPromptButton agent={record} onSuccess={handleSuccess} />
          </Space>
          <Space size="small" wrap>
            <ChatConfigButton agent={record} onSuccess={handleSuccess} />
            <SubAgentButton agent={record} onSuccess={handleSuccess} />
            <KbButton agent={record} onSuccess={handleSuccess} />
            <ToolsButton agent={record} onSuccess={handleSuccess} />
            <McpButton agent={record} onSuccess={handleSuccess} />
            <SkillButton agent={record} onSuccess={handleSuccess} />
            <MemoryButton agent={record} onSuccess={handleSuccess} />
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
      setAgents(agentsData.data || []);
    } catch (error) {
      console.error("加载Agents失败:", error);
      message.error(t("agents:loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = (agent: AgentConfig) => {
    navigate(`/agents/${agent.id}`);
  };

  const handleSuccess = () => {
    // 操作成功后重新加载数据
    loadAgents();
  };

  return (
    <div className={agentsStyles.container}>
      <Card
        title={t("agents:title")}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAgents}
            loading={loading}
          >
            {t("common:refresh")}
          </Button>
        }
      >
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>OneAgent</Typography.Title>
        <Typography.Text type="secondary">{t("agents:subtitleOne")}</Typography.Text>
        <Table
          columns={oneColumns}
          dataSource={oneAgents}
          rowKey="id"
          loading={loading}
          style={{ marginTop: 12 }}
        />
        <Divider />
        <Typography.Title level={5} style={{ marginBottom: 0 }}>ReAct Agent</Typography.Title>
        <Typography.Text type="secondary">{t("agents:subtitleReact")}</Typography.Text>
        <Table
          columns={reactColumns}
          dataSource={reactAgents}
          rowKey="id"
          loading={loading}
          style={{ marginTop: 12 }}
        />
      </Card>
    </div>
  );
};

export default AgentsPage;
