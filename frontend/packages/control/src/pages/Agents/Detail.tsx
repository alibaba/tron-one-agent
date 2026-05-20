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
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  List,
  Typography,
  Button,
  Tag,
  Space,
  message,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  ToolOutlined,
  ApiOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentConfig } from "../../types/agent.interface";
import { LocalAgentType } from "../../types/common.interface";
import { getAgentById } from "../../services/agent";
import { getAllTools } from "../../services/tools";
import { getAllMcps } from "../../services/mcp";
import { getAllSkills } from "../../services/skill";
import { SkillConfig } from "../../types/skill.interface";
import { AgentToolConfig } from "../../types/tool.interface";
import { colors, commonStyles } from "../../styles/tokens";
import StatusToggleButton from "./components/StatusToggleButton";
import ToolsButton from "./components/ToolsButton";
import McpButton from "./components/McpButton";
import KbButton from "./components/KbButton";
import SystemPromptButton from "./components/SystemPromptButton";
import SubAgentButton from "./components/SubAgentButton";
import ChatConfigButton from "./components/ChatConfigButton";
import SkillButton from "./components/SkillButton";
import RenameButton from "./components/RenameButton";
import MemoryButton from "./components/MemoryButton";

const { Text } = Typography;

const AgentDetail: React.FC = () => {
  const { t } = useTranslation(["agents", "common"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableTools, setAvailableTools] = useState<AgentToolConfig[]>([]);
  const [availableMcps, setAvailableMcps] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillConfig[]>([]);

  // 加载可用工具列表
  const loadAvailableTools = async () => {
    try {
      const toolsData = await getAllTools();
      setAvailableTools(toolsData.data || []);
    } catch (error) {
      console.error("加载工具列表失败:", error);
    }
  };

  // 加载可用MCP列表
  const loadAvailableMcps = async () => {
    try {
      const mcpsData = await getAllMcps();
      setAvailableMcps(mcpsData.data || []);
    } catch (error) {
      console.error("加载MCP列表失败:", error);
    }
  };

  // 加载可用Skill列表
  const loadAvailableSkills = async () => {
    try {
      const response = await getAllSkills();
      setAvailableSkills(response.data || []);
    } catch (error) {
      console.error("加载Skill列表失败:", error);
    }
  };

  // 加载Agent详情数据
  const loadAgentDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const agentData = await getAgentById(id);
      setAgent(agentData.data || null);
    } catch (error) {
      console.error("加载Agent详情失败:", error);
      message.error(t("agents:detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadAgentDetail();
    loadAvailableTools();
    loadAvailableMcps();
    loadAvailableSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSuccess = () => {
    // 操作成功后重新加载数据
    loadAgentDetail();
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">{t("common:loading")}</Text>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <Text type="secondary">{t("agents:detail.notFound")}</Text>
          <br />
          <Button
            type="primary"
            onClick={() => navigate("/agents")}
            style={{ marginTop: 16 }}
          >
            {t("agents:detail.backToList")}
          </Button>
        </div>
      </Card>
    );
  }

  const getTypeConfig = (type: LocalAgentType) => {
    const typeMap = {
      [LocalAgentType.REACT]: { text: "ReAct Agent", style: { background: colors.gradientCardTeal, borderColor: colors.gradientCardTeal, color: colors.ink } },
      [LocalAgentType.ONE]: { text: "OneAgent", style: { background: colors.gradientCardPurple, borderColor: colors.gradientCardPurple, color: colors.ink } },
    };
    return typeMap[type] || { text: "Unknown", style: {} };
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/agents")}
            >
              {t("agents:detail.back")}
            </Button>
            <span>{agent.name} - {t("agents:detail.titleSuffix")}</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 基本信息区域 */}
          <Card title={t("agents:detail.basic")} size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label={t("agents:detail.id")}>{agent.id}</Descriptions.Item>
              <Descriptions.Item label={t("agents:detail.name")}>{agent.name}</Descriptions.Item>
              <Descriptions.Item label={t("agents:detail.type")}>
                <Tag style={getTypeConfig(agent.type).style}>
                  {getTypeConfig(agent.type).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("agents:detail.status")}>
                <Tag color={agent.enabled ? "green" : "red"}>
                  {agent.enabled ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("agents:detail.maxIters")}>
                {agent.type === LocalAgentType.ONE ? t("agents:detail.notSupported") : agent.maxIters}
              </Descriptions.Item>
              <Descriptions.Item label={t("agents:detail.action")}>
                <Space>
                  <RenameButton agent={agent} onSuccess={handleSuccess}>
                    {t("agents:detail.editName")}
                  </RenameButton>
                  <StatusToggleButton agent={agent} onSuccess={handleSuccess}>
                    {agent.enabled ? t("agents:detail.offline") : t("agents:detail.online")}
                  </StatusToggleButton>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Chat配置区域 */}
          <Card
            title={t("agents:detail.chatConfig")}
            size="small"
            extra={
              <ChatConfigButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.editChatConfig")}
              </ChatConfigButton>
            }
          >
            {agent.chatModel ? (
              <div
                style={commonStyles.codePreview}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(agent.chatModel, null, 2)}
                </pre>
              </div>
            ) : (
              <div
                style={commonStyles.emptyState}
              >
                <Text type="secondary">{t("agents:detail.noChatModel")}</Text>
              </div>
            )}
          </Card>

          {/* 提示词区域 */}
          <Card
            title={t("agents:detail.systemPrompt")}
            size="small"
            extra={
              <SystemPromptButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.editSystemPrompt")}
              </SystemPromptButton>
            }
          >
            {agent.systemPrompt ? (
              <div
                style={{
                  maxHeight: "500px",
                  overflow: "auto",
                  padding: "20px",
                  background: colors.surfacePearl,
                  border: `1px solid ${colors.dividerSoft}`,
                  borderRadius: "8px",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {agent.systemPrompt}
                </ReactMarkdown>
              </div>
            ) : (
              <div
                style={commonStyles.emptyState}
              >
                <Text type="secondary">{t("agents:detail.noSystemPrompt")}</Text>
              </div>
            )}
          </Card>

          {/* 工具配置区域 */}
          <Card
            title={t("agents:detail.toolsTitle", { count: agent.tools?.length || 0 })}
            size="small"
            extra={
              <ToolsButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.manageTools")}
              </ToolsButton>
            }
          >
            <List
              dataSource={agent.tools || []}
              renderItem={(tool) => {
                const toolInfo = availableTools.find(
                  (availableTool) => availableTool.name === tool.name
                );
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<ToolOutlined style={{ color: colors.primary }} />}
                      title={
                        <Space>
                          <span>{tool.name}</span>
                          <Tag
                            color={tool.enabled !== false ? "green" : "red"}
                          >
                            {tool.enabled !== false ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                          </Tag>
                        </Space>
                      }
                      description={
                        toolInfo?.description && (
                          <div
                            style={commonStyles.descriptionText}
                          >
                            {toolInfo.description}
                          </div>
                        )
                      }
                    />
                  </List.Item>
                );
              }}
              locale={{ emptyText: t("agents:detail.noTools") }}
            />
          </Card>

          {/* MCP客户端区域 */}
          <Card
            title={t("agents:detail.mcpTitle", { count: agent.mcpClients?.length || 0 })}
            size="small"
            extra={
              <McpButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.manageMcp")}
              </McpButton>
            }
          >
              <List
                dataSource={agent.mcpClients || []}
                renderItem={(mcp) => {
                  // 从可用MCP列表中获取描述信息
                  const mcpInfo = availableMcps.find(
                    (available) => available.id === mcp.clientId
                  );

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<ApiOutlined style={{ color: colors.primary }} />}
                        title={
                          <Space>
                            <span>{mcpInfo?.name || mcp.clientId}</span>
                            {mcpInfo?.transport && (
                              <Tag color="blue">
                                {mcpInfo.transport.toUpperCase()}
                              </Tag>
                            )}
                            {mcpInfo?.enabled !== undefined && (
                              <Tag
                                color={mcpInfo.enabled ? "green" : "red"}
                              >
                                {mcpInfo.enabled ? t("agents:online") : t("agents:offline")}
                              </Tag>
                            )}
                          </Space>
                        }
                        description={
                          <Space
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            {mcpInfo?.description && (
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: colors.inkMuted80,
                                  lineHeight: "1.4",
                                  marginBottom: "8px",
                                }}
                              >
                                {mcpInfo.description}
                              </div>
                            )}
                            {mcpInfo?.url && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: colors.bodyMuted,
                                  fontFamily:
                                    'Monaco, Menlo, "Ubuntu Mono", monospace',
                                  marginBottom: "8px",
                                }}
                              >
                                URL: {mcpInfo.url}
                              </div>
                            )}
                            <Space wrap>
                              <Tag color={mcp.enabled ? "green" : "red"}>
                                {mcp.enabled ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                              </Tag>
                              {mcp.enableFuncs &&
                                Array.isArray(mcp.enableFuncs) &&
                                mcp.enableFuncs.length > 0 && (
                                  <Tag color="blue">
                                    {t("agents:detail.enabledFuncs")}: {mcp.enableFuncs.join(", ")}
                                  </Tag>
                                )}
                              {mcp.disableFuncs &&
                                Array.isArray(mcp.disableFuncs) &&
                                mcp.disableFuncs.length > 0 && (
                                  <Tag color="orange">
                                    {t("agents:detail.disabledFuncs")}: {mcp.disableFuncs.join(", ")}
                                  </Tag>
                                )}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: t("agents:detail.noMcp") }}
              />
          </Card>
          {/* 知识库区域 */}
          <Card
            title={t("agents:detail.kbTitle", { count: agent.knowledgeBases?.length || 0 })}
            size="small"
            extra={
              <KbButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.manageKb")}
              </KbButton>
            }
          >
            <List
              dataSource={agent.knowledgeBases || []}
              renderItem={(kb: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <DatabaseOutlined style={{ color: colors.accentPurple }} />
                    }
                    title={kb.name}
                    description={
                      <Space>
                        <Text type="secondary">
                          {t("agents:detail.workspace")}: {kb.workspaceId}
                        </Text>
                        <Text type="secondary">{t("agents:detail.index")}: {kb.indexId}</Text>
                        <Tag color={kb.enabled ? "green" : "red"}>
                          {kb.enabled ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: t("agents:detail.noKb") }}
            />
          </Card>

          {/* Skills区域 */}
          <Card
            title={t("agents:detail.skillsTitle", { count: agent.skills?.length || 0 })}
            size="small"
            extra={
              <SkillButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.manageSkills")}
              </SkillButton>
            }
          >
              <List
                dataSource={agent.skills || []}
                renderItem={(skill) => {
                  const skillInfo = availableSkills.find(
                    (s) => s.name === skill.name
                  );
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <ThunderboltOutlined
                            style={{ color: colors.accentPurpleLight }}
                          />
                        }
                        title={
                          <Space>
                            <span>{skill.name}</span>
                            <Tag color={skill.enabled ? "green" : "red"}>
                              {skill.enabled ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                            </Tag>
                          </Space>
                        }
                        description={
                          skillInfo?.description && (
                            <div
                            style={commonStyles.descriptionText}
                          >
                              {skillInfo.description}
                            </div>
                          )
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: t("agents:detail.noSkills") }}
              />
          </Card>

          {/* 长期记忆区域 */}
          <Card
            title={t("agents:detail.memory")}
            size="small"
            extra={
              <MemoryButton agent={agent} onSuccess={handleSuccess}>
                {t("agents:detail.configMemory")}
              </MemoryButton>
            }
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t("agents:detail.memoryRelated")}>
                {agent.longTermMemoryId ? (
                  <Tag color="purple">{agent.longTermMemoryId}</Tag>
                ) : (
                  <Text type="secondary">{t("agents:detail.memoryAuto")}</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 子Agent区域 - 仅在Multi类型时显示 */}
          {agent.type === LocalAgentType.ONE && (
            <Card
              title={t("agents:detail.subAgentTitle", { count: agent.subAgents?.length || 0 })}
              size="small"
              extra={
                <SubAgentButton agent={agent} onSuccess={handleSuccess}>
                  {t("agents:detail.manageSubAgent")}
                </SubAgentButton>
              }
            >
              <List
                dataSource={agent.subAgents || []}
                renderItem={(subAgent, index) => {
                  // 判断是否为远程Agent
                  const isRemoteAgent = "endpoint" in subAgent;

                  return (
                    <List.Item
                      style={{
                        padding: "16px 0",
                        borderBottom:
                          index < (agent.subAgents?.length || 0) - 1
                            ? `1px solid ${colors.dividerSoft}`
                            : "none",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          isRemoteAgent ? (
                            <ApiOutlined
                              style={{ color: colors.accentPurpleLight, fontSize: 16 }}
                            />
                          ) : (
                            <TeamOutlined
                              style={{ color: colors.primary, fontSize: 16 }}
                            />
                          )
                        }
                        title={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                                fontSize: "14px",
                                color: colors.ink,
                                wordBreak: "break-all",
                                minWidth: 0,
                                flex: "0 1 auto",
                              }}
                            >
                              {subAgent.agentId}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                flexShrink: 0,
                              }}
                            >
                              <Tag
                                color={isRemoteAgent ? "orange" : "blue"}
                              >
                                {isRemoteAgent ? t("agents:detail.remote") : t("agents:detail.local")}
                              </Tag>
                              <Tag
                                color={subAgent.enabled ? "green" : "red"}
                              >
                                {subAgent.enabled ? t("agents:detail.enabled") : t("agents:detail.disabled")}
                              </Tag>
                            </div>
                          </div>
                        }
                        description={
                          <Space
                            direction="vertical"
                            size="small"
                            style={{ width: "100%" }}
                          >
                            <div
                              style={{
                                fontSize: "13px",
                                color: colors.inkMuted80,
                                lineHeight: "1.4",
                                wordBreak: "break-word",
                              }}
                            >
                              <strong>{t("agents:detail.capacities")}</strong>
                              {(subAgent as any).capacities}
                            </div>
                            {isRemoteAgent && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: colors.bodyMuted,
                                  padding: "6px 8px",
                                  background: colors.canvasParchment,
                                  borderRadius: "4px",
                                  wordBreak: "break-all",
                                }}
                              >
                                <div>
                                  <strong>{t("agents:detail.endpoint")}</strong>
                                  {(subAgent as any).endpoint}
                                </div>
                                <div style={{ marginTop: "2px" }}>
                                  <strong>{t("agents:detail.transport")}</strong>
                                  {(subAgent as any).transport?.toUpperCase()} |
                                  <strong>{t("agents:detail.timeout")}</strong>
                                  {(subAgent as any).timeout || 30}s
                                </div>
                              </div>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: t("agents:detail.noSubAgent") }}
              />
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default AgentDetail;
