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
  Button,
  Modal,
  List,
  Tag,
  Space,
  Typography,
  message,
  Select,
  Checkbox,
  Divider,
  Input,
} from "antd";
import {
  ApiOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { AgentConfig } from "../../../types/agent.interface";
import { McpClientConfig } from "../../../types/mcp.interface";
import { updateAgent } from "../../../services/agent";
import { getAllMcps } from "../../../services/mcp";

const { Text } = Typography;

interface McpButtonProps {
  agent: AgentConfig;
  onManageMcp?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const McpButton: React.FC<McpButtonProps> = ({
  agent,
  onManageMcp,
  onSuccess,
  onError,
  children,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableMcps, setAvailableMcps] = useState<McpClientConfig[]>([]);
  const [mcpsLoading, setMcpsLoading] = useState(false);
  const [pendingMcps, setPendingMcps] = useState<McpClientConfig[]>([]);
  const [selectedMcp, setSelectedMcp] = useState<string>("");

  // 加载可用MCP客户端列表
  const loadAvailableMcps = async () => {
    try {
      setMcpsLoading(true);
      const mcpsData = await getAllMcps();
      setAvailableMcps(mcpsData.data || []);
    } catch (error) {
      console.error("加载MCP客户端列表失败:", error);
      message.error("加载MCP客户端列表失败");
    } finally {
      setMcpsLoading(false);
    }
  };

  const handleClick = async () => {
    if (onManageMcp) {
      onManageMcp(agent);
    } else {
      // 先加载可用MCP客户端列表
      await loadAvailableMcps();
      setIsModalVisible(true);
    }
  };

  // 当弹窗打开且可用MCP列表加载完成后，初始化待处理MCP列表
  useEffect(() => {
    if (isModalVisible && availableMcps?.length > 0) {
      const initialMcps = agent.mcpClients
        ?.map((agentMcp) => {
          // 从可用MCP列表中找到对应的MCP信息
          const availableMcp = availableMcps.find(
            (mcp) => mcp.id === agentMcp.clientId
          );
          return {
            ...availableMcp,
            id: agentMcp.clientId,
            enabled: agentMcp.enabled,
            enableFuncs: agentMcp.enableFuncs?.join(",") || "",
            disableFuncs: agentMcp.disableFuncs?.join(",") || "",
          } as any;
        })
        .filter((mcp) => mcp.name); // 过滤掉找不到的MCP

      setPendingMcps(initialMcps || []);
    }
  }, [isModalVisible, availableMcps, agent.mcpClients]);

  const handleAddMcp = () => {
    if (!selectedMcp) {
      message.warning("请选择要添加的MCP客户端");
      return;
    }

    if (pendingMcps?.some((mcp) => mcp.id === selectedMcp)) {
      message.warning("该MCP客户端已存在");
      return;
    }

    const mcpToAdd = availableMcps.find((mcp) => mcp.id === selectedMcp);
    if (mcpToAdd) {
      setPendingMcps((prev) => [
        ...prev,
        {
          ...mcpToAdd,
          enabled: true,
          enable_funcs: "",
          disable_funcs: "",
        } as any,
      ]);
      setSelectedMcp("");
    }
  };

  const handleRemoveMcp = (mcpId: string) => {
    setPendingMcps((prev) => prev.filter((mcp) => mcp.id !== mcpId));
  };

  const handleToggleMcp = (mcpId: string, enabled: boolean) => {
    setPendingMcps((prev) =>
      prev.map((mcp) => (mcp.id === mcpId ? { ...mcp, enabled } : mcp))
    );
  };

  const handleUpdateMcpFuncs = (
    mcpId: string,
    field: "enableFuncs" | "disableFuncs",
    value: string
  ) => {
    setPendingMcps((prev) =>
      prev.map((mcp) => (mcp.id === mcpId ? { ...mcp, [field]: value } : mcp))
    );
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        // 转换为符合AgentMcpConfig接口的格式
        const mcpConfigs = pendingMcps?.map((mcp) => {
          const enableFuncs =
            typeof (mcp as any).enableFuncs === "string"
              ? (mcp as any).enableFuncs
                  .split(",")
                  .map((func: string) => func.trim())
                  .filter((func: string) => func)
              : (mcp as any).enableFuncs || [];

          const disableFuncs =
            typeof (mcp as any).disableFuncs === "string"
              ? (mcp as any).disableFuncs
                  .split(",")
                  .map((func: string) => func.trim())
                  .filter((func: string) => func)
              : (mcp as any).disableFuncs || [];

          return {
            enabled: mcp.enabled,
            clientId: mcp.id,
            enableFuncs: enableFuncs,
            disableFuncs: disableFuncs,
          };
        });

        await updateAgent(agent.id, { mcpClients: mcpConfigs });
        message.success("MCP客户端配置保存成功");

        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }

        setIsModalVisible(false);
      } else {
        throw new Error("Agent ID不存在");
      }
    } catch (error) {
      console.error("MCP客户端配置保存失败:", error);

      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error("MCP客户端配置保存失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setPendingMcps([]);
    setSelectedMcp("");
  };

  // 获取可添加的MCP客户端列表
  const getAvailableMcpsForSelect = () => {
    return availableMcps?.filter(
      (mcp) => !pendingMcps?.some((pending) => pending.id === mcp.id)
    );
  };

  // 检查是否有变更
  const hasChanges = () => {
    if (pendingMcps?.length !== agent.mcpClients?.length) return true;

    return (
      pendingMcps?.some((pending) => {
        const original = agent.mcpClients?.find(
          (mcp) => mcp.clientId === pending.id
        );
        if (!original) return true;

        // 检查启用状态变更
        if (original.enabled !== pending.enabled) return true;

        // 检查启用函数变更
        const originalEnableFuncs = original.enableFuncs?.join(",") || "";
        const pendingEnableFuncs =
          typeof (pending as any).enableFuncs === "string"
            ? (pending as any).enableFuncs
            : (pending as any).enableFuncs?.join(",") || "";
        if (originalEnableFuncs !== pendingEnableFuncs) return true;

        // 检查禁用函数变更
        const originalDisableFuncs = original.disableFuncs?.join(",") || "";
        const pendingDisableFuncs =
          typeof (pending as any).disableFuncs === "string"
            ? (pending as any).disableFuncs
            : (pending as any).disableFuncs?.join(",") || "";
        if (originalDisableFuncs !== pendingDisableFuncs) return true;

        return false;
      }) ||
      agent.mcpClients?.some((original) => {
        return !pendingMcps?.some(
          (pending) => pending.id === original.clientId
        );
      })
    );
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<ApiOutlined />}
        onClick={handleClick}
      >
        {children || "MCP"}
      </Button>

      <Modal
        title={`${agent.name} - MCP管理`}
        open={isModalVisible}
        onOk={handleSaveChanges}
        onCancel={handleModalClose}
        width={700}
        okText="保存配置"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{
          icon: <CheckOutlined />,
          disabled: !hasChanges(),
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 添加MCP客户端区域 */}
          <div>
            <Space style={{ width: "100%" }}>
              <Select
                style={{ flex: 1, minWidth: 250 }}
                placeholder="选择要添加的MCP客户端"
                value={selectedMcp}
                onChange={setSelectedMcp}
                allowClear
                loading={mcpsLoading}
                optionLabelProp="label"
              >
                {getAvailableMcpsForSelect().map((mcp) => (
                  <Select.Option key={mcp.id} value={mcp.id} label={mcp.name}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{mcp.name}</div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#8c8c8c",
                          marginTop: "2px",
                          lineHeight: "1.4",
                        }}
                      >
                        {mcp.description}
                      </div>
                      <Space style={{ marginTop: "4px" }}>
                        <Tag size="small" color="blue">
                          {mcp.transport?.toUpperCase() || "UNKNOWN"}
                        </Tag>
                        <Tag size="small" color={mcp.enabled ? "green" : "red"}>
                          {mcp.enabled ? "在线" : "离线"}
                        </Tag>
                      </Space>
                    </div>
                  </Select.Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddMcp}
                disabled={!selectedMcp}
              >
                添加
              </Button>
            </Space>
          </div>

          {/* MCP客户端列表区域 */}
          <div style={{ marginTop: "20px" }}>
            <Text strong style={{ marginBottom: 8, display: "block" }}>
              MCP ({pendingMcps?.length}个)：
            </Text>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                padding: 16,
                minHeight: 200,
                maxHeight: 350,
                overflow: "auto",
                background: "#fafafa",
              }}
            >
              {pendingMcps?.length > 0 ? (
                <List
                  dataSource={pendingMcps}
                  renderItem={(mcp, index) => {
                    // 获取MCP本身的在线/离线状态
                    const originalMcp = availableMcps?.find(
                      (original) => original.id === mcp.id
                    );
                    const mcpOnlineStatus = originalMcp?.enabled || false;

                    return (
                      <List.Item
                        style={{
                          padding: "12px 0",
                          borderBottom:
                            index < pendingMcps?.length - 1
                              ? "1px solid #f0f0f0"
                              : "none",
                        }}
                        actions={[
                          <Checkbox
                            key="toggle"
                            checked={mcp.enabled}
                            onChange={(e) =>
                              handleToggleMcp(mcp.id, e.target.checked)
                            }
                          >
                            启用
                          </Checkbox>,
                          <Button
                            key="remove"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveMcp(mcp.id)}
                          >
                            移除
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<ApiOutlined style={{ color: "#1890ff" }} />}
                          title={
                            <Space>
                              <span>{mcp.name}</span>
                              <Tag size="small" color="blue">
                                {mcp.transport?.toUpperCase() || "UNKNOWN"}
                              </Tag>
                              <Tag
                                size="small"
                                color={mcpOnlineStatus ? "green" : "red"}
                              >
                                {mcpOnlineStatus ? "在线" : "离线"}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space
                              direction="vertical"
                              size="small"
                              style={{ width: "100%" }}
                            >
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#8c8c8c",
                                  lineHeight: "1.4",
                                }}
                              >
                                {mcp.description}
                              </div>
                              <div style={{ marginTop: "8px" }}>
                                <Space
                                  direction="vertical"
                                  size="small"
                                  style={{ width: "100%" }}
                                >
                                  <div>
                                    <Text
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        marginBottom: "2px",
                                        display: "block",
                                      }}
                                    >
                                      启用函数 <span style={{ fontSize: "12px", color: "#8c8c8c" }}>(不填写默认启用所有函数)</span>
                                    </Text>
                                    <Input
                                      size="small"
                                      placeholder="输入启用的函数名，用英文逗号分隔"
                                      value={
                                        typeof (mcp as any).enableFuncs ===
                                        "string"
                                          ? (mcp as any).enableFuncs
                                          : (mcp as any).enableFuncs?.join(
                                              ","
                                            ) || ""
                                      }
                                      onChange={(e) =>
                                        handleUpdateMcpFuncs(
                                          mcp.id,
                                          "enableFuncs",
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        fontSize: "12px",
                                        height: "28px",
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Text
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        marginBottom: "2px",
                                        display: "block",
                                      }}
                                    >
                                      禁用函数:
                                    </Text>
                                    <Input
                                      size="small"
                                      placeholder="输入禁用的函数名，用英文逗号分隔"
                                      value={
                                        typeof (mcp as any).disable_funcs ===
                                        "string"
                                          ? (mcp as any).disable_funcs
                                          : (mcp as any).disable_funcs?.join(
                                              ","
                                            ) || ""
                                      }
                                      onChange={(e) =>
                                        handleUpdateMcpFuncs(
                                          mcp.id,
                                          "disable_funcs",
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        fontSize: "12px",
                                        height: "28px",
                                      }}
                                    />
                                  </div>
                                </Space>
                              </div>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#999",
                    padding: "40px 0",
                  }}
                >
                  暂无配置MCP客户端
                </div>
              )}
            </div>
          </div>

          {/* 变更提示 */}
          {hasChanges() && (
            <div
              style={{
                padding: 12,
                background: "#e6f7ff",
                border: "1px solid #91d5ff",
                borderRadius: 6,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ 检测到配置变更，点击"保存配置"按钮应用更改
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default McpButton;
