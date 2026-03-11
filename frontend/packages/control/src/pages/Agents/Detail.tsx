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
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Tabs,
  List,
  Typography,
  Button,
  Tag,
  Space,
  Modal,
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
import StatusToggleButton from "./components/StatusToggleButton";
import ToolsButton from "./components/ToolsButton";
import McpButton from "./components/McpButton";
import KbButton from "./components/KbButton";
import SystemPromptButton from "./components/SystemPromptButton";
import SubAgentButton from "./components/SubAgentButton";
import ChatConfigButton from "./components/ChatConfigButton";
import SkillButton from "./components/SkillButton";
import RenameButton from "./components/RenameButton";

const { Text } = Typography;

const AgentDetail: React.FC = () => {
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
      setAgent(agentData.data || {});
    } catch (error) {
      console.error("加载Agent详情失败:", error);
      message.error("加载Agent详情失败，请重试");
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
          <Text type="secondary">加载中...</Text>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <Text type="secondary">Agent不存在</Text>
          <br />
          <Button
            type="primary"
            onClick={() => navigate("/agents")}
            style={{ marginTop: 16 }}
          >
            返回列表
          </Button>
        </div>
      </Card>
    );
  }

  const getTypeConfig = (type: LocalAgentType) => {
    const typeMap = {
      [LocalAgentType.REACT]: { text: "ReAct Agent", color: "green" },
      [LocalAgentType.ONE]: { text: "OneAgent", color: "purple" },
    };
    return typeMap[type] || { text: "Unknown", color: "default" };
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
              返回
            </Button>
            <span>{agent.name} - 详情</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 基本信息区域 */}
          <Card title="基本信息" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="ID">{agent.id}</Descriptions.Item>
              <Descriptions.Item label="名称">{agent.name}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={getTypeConfig(agent.type).color}>
                  {getTypeConfig(agent.type).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={agent.enabled ? "green" : "red"}>
                  {agent.enabled ? "启用" : "禁用"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最大迭代次数">
                {agent.type === LocalAgentType.ONE ? "不支持" : agent.maxIters}
              </Descriptions.Item>
              <Descriptions.Item label="操作">
                <Space>
                  <RenameButton agent={agent} onSuccess={handleSuccess}>
                    编辑名称
                  </RenameButton>
                  <StatusToggleButton agent={agent} onSuccess={handleSuccess}>
                    {agent.enabled ? "下线" : "上线"}
                  </StatusToggleButton>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Chat配置区域 */}
          <Card
            title="Chat配置"
            size="small"
            extra={
              <ChatConfigButton agent={agent} onSuccess={handleSuccess}>
                编辑Chat配置
              </ChatConfigButton>
            }
          >
            {agent.chatModel ? (
              <div
                style={{
                  maxHeight: "300px",
                  overflow: "auto",
                  padding: "16px",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: "12px",
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(agent.chatModel, null, 2)}
                </pre>
              </div>
            ) : (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
              >
                <Text type="secondary">未配置Chat模型</Text>
              </div>
            )}
          </Card>

          {/* 提示词区域 */}
          <Card
            title="提示词"
            size="small"
            extra={
              <SystemPromptButton agent={agent} onSuccess={handleSuccess}>
                编辑提示词
              </SystemPromptButton>
            }
          >
            {agent.systemPrompt ? (
              <div
                style={{
                  maxHeight: "500px",
                  overflow: "auto",
                  padding: "20px",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {agent.systemPrompt}
                </ReactMarkdown>
              </div>
            ) : (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                }}
              >
                <Text type="secondary">未设置提示词</Text>
              </div>
            )}
          </Card>

          {/* 工具配置区域 */}
          {agent.type !== LocalAgentType.ONE && (
            <Card
              title={`工具 (${agent.tools?.length || 0})`}
              size="small"
              extra={
                agent.type !== LocalAgentType.MULTI ? (
                  <ToolsButton agent={agent} onSuccess={handleSuccess}>
                    管理工具
                  </ToolsButton>
                ) : (
                  <span style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    Multi类型Agent不支持工具配置
                  </span>
                )
              }
            >
              {agent.type !== LocalAgentType.MULTI ? (
                <List
                  dataSource={agent.tools || []}
                  renderItem={(tool) => {
                    const toolInfo = availableTools.find(
                      (availableTool) => availableTool.name === tool.name
                    );
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<ToolOutlined style={{ color: "#1890ff" }} />}
                          title={
                            <Space>
                              <span>{tool.name}</span>
                              <Tag
                                size="small"
                                color={tool.enabled !== false ? "green" : "red"}
                              >
                                {tool.enabled !== false ? "启用" : "禁用"}
                              </Tag>
                            </Space>
                          }
                          description={
                            toolInfo?.description && (
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "#595959",
                                  lineHeight: "1.4",
                                  marginTop: "4px",
                                }}
                              >
                                {toolInfo.description}
                              </div>
                            )
                          }
                        />
                      </List.Item>
                    );
                  }}
                  locale={{ emptyText: "暂无配置工具" }}
                />
              ) : (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                    borderRadius: "8px",
                  }}
                >
                  <Text type="secondary">Multi类型Agent不支持工具配置</Text>
                </div>
              )}
            </Card>
          )}

          {/* MCP客户端区域 */}
          {agent.type !== LocalAgentType.ONE && (
            <Card
              title={`MCP (${agent.mcpClients?.length || 0})`}
              size="small"
              extra={
                <McpButton agent={agent} onSuccess={handleSuccess}>
                  管理MCP
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
                        avatar={<ApiOutlined style={{ color: "#1890ff" }} />}
                        title={
                          <Space>
                            <span>{mcpInfo?.name || mcp.clientId}</span>
                            {mcpInfo?.transport && (
                              <Tag size="small" color="blue">
                                {mcpInfo.transport.toUpperCase()}
                              </Tag>
                            )}
                            {mcpInfo?.enabled !== undefined && (
                              <Tag
                                size="small"
                                color={mcpInfo.enabled ? "green" : "red"}
                              >
                                {mcpInfo.enabled ? "在线" : "离线"}
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
                                  color: "#595959",
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
                                  color: "#8c8c8c",
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
                                {mcp.enabled ? "启用" : "禁用"}
                              </Tag>
                              {mcp.enable_funcs &&
                                Array.isArray(mcp.enable_funcs) &&
                                mcp.enable_funcs.length > 0 && (
                                  <Tag color="blue">
                                    启用函数: {mcp.enable_funcs.join(", ")}
                                  </Tag>
                                )}
                              {mcp.disable_funcs &&
                                Array.isArray(mcp.disable_funcs) &&
                                mcp.disable_funcs.length > 0 && (
                                  <Tag color="orange">
                                    禁用函数: {mcp.disable_funcs.join(", ")}
                                  </Tag>
                                )}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: "暂无配置MCP客户端" }}
              />
            </Card>
          )}
          {/* 知识库区域 */}
          {agent.type !== LocalAgentType.ONE && (
            <Card
              title={`知识库 (${agent.knowledgeBases?.length || 0})`}
              size="small"
              extra={
                agent.type !== LocalAgentType.MULTI ? (
                  <KbButton agent={agent} onSuccess={handleSuccess}>
                    管理知识库
                  </KbButton>
                ) : (
                  <span style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    Multi类型Agent不支持知识库配置
                  </span>
                )
              }
            >
              {agent.type !== LocalAgentType.MULTI ? (
                <List
                  dataSource={agent.knowledgeBases || []}
                  renderItem={(kb: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <DatabaseOutlined style={{ color: "#722ed1" }} />
                        }
                        title={kb.name}
                        description={
                          <Space>
                            <Text type="secondary">
                              工作空间: {kb.workspaceId}
                            </Text>
                            <Text type="secondary">索引: {kb.indexId}</Text>
                            <Tag color={kb.enabled ? "green" : "red"}>
                              {kb.enabled ? "启用" : "禁用"}
                            </Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: "暂无配置知识库" }}
                />
              ) : (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                    borderRadius: "8px",
                  }}
                >
                  <Text type="secondary">Multi类型Agent不支持知识库配置</Text>
                </div>
              )}
            </Card>
          )}

          {/* Skills区域 */}
          {agent.type !== LocalAgentType.ONE && (
            <Card
              title={`Skills (${agent.skills?.length || 0})`}
              size="small"
              extra={
                <SkillButton agent={agent} onSuccess={handleSuccess}>
                  管理Skills
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
                            style={{ color: "#faad14" }}
                          />
                        }
                        title={
                          <Space>
                            <span>{skill.name}</span>
                            <Tag color={skill.enabled ? "green" : "red"}>
                              {skill.enabled ? "启用" : "禁用"}
                            </Tag>
                          </Space>
                        }
                        description={
                          skillInfo?.description && (
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#595959",
                                lineHeight: "1.4",
                                marginTop: "4px",
                              }}
                            >
                              {skillInfo.description}
                            </div>
                          )
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: "暂无配置Skills" }}
              />
            </Card>
          )}

          {/* 子Agent区域 - 仅在Multi类型时显示 */}
          {agent.type === LocalAgentType.ONE && (
            <Card
              title={`子Agent (${agent.subAgents?.length || 0})`}
              size="small"
              extra={
                <SubAgentButton agent={agent} onSuccess={handleSuccess}>
                  管理子Agent
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
                            ? "1px solid #f0f0f0"
                            : "none",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          isRemoteAgent ? (
                            <ApiOutlined
                              style={{ color: "#fa8c16", fontSize: 16 }}
                            />
                          ) : (
                            <TeamOutlined
                              style={{ color: "#1890ff", fontSize: 16 }}
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
                                color: "#262626",
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
                                size="small"
                                color={isRemoteAgent ? "orange" : "blue"}
                              >
                                {isRemoteAgent ? "远程" : "本地"}
                              </Tag>
                              <Tag
                                size="small"
                                color={subAgent.enabled ? "green" : "red"}
                              >
                                {subAgent.enabled ? "启用" : "禁用"}
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
                                color: "#595959",
                                lineHeight: "1.4",
                                wordBreak: "break-word",
                              }}
                            >
                              <strong>能力描述：</strong>
                              {subAgent.capacities}
                            </div>
                            {isRemoteAgent && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#8c8c8c",
                                  padding: "6px 8px",
                                  background: "#f5f5f5",
                                  borderRadius: "4px",
                                  wordBreak: "break-all",
                                }}
                              >
                                <div>
                                  <strong>端点：</strong>
                                  {(subAgent as any).endpoint}
                                </div>
                                <div style={{ marginTop: "2px" }}>
                                  <strong>传输：</strong>
                                  {(subAgent as any).transport?.toUpperCase()} |
                                  <strong>超时：</strong>
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
                locale={{ emptyText: "暂无配置子Agent" }}
              />
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default AgentDetail;
