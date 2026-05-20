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
import {
  Button,
  Modal,
  List,
  Tag,
  Space,
  Typography,
  message,
  Form,
  Input,
  Select,
  Switch,
  Card,
} from "antd";
import {
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
  ApiOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import {
  AgentConfig,
  SubAgent,
  LocalSubAgentConfig,
  A2aSubAgentConfig,
} from "../../../types/agent.interface";
import {
  SubAgentType,
  SubAgentTypeNameMap,
} from "../../../types/common.interface";
import { updateAgent, getAllAgents } from "../../../services/agent";
import { colors, commonStyles } from "../../../styles/tokens";

const { Text } = Typography;

const DefaultA2AAgentCard: A2aSubAgentConfig["agentCard"] = {
  name: "",
  description: "",
  url: "",
  version: "",
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ["text", "text/plain"],
  defaultOutputModes: ["text", "text/plain"],
  supportsAuthenticatedExtendedCard: false,
  additionalInterfaces: [
    {
      transport: "JSONRPC",
      // url 覆盖该部分
      url: "http://localhost:8080/a2a/simple_agent/",
    },
  ],
  preferredTransport: "JSONRPC",
  protocolVersion: "0.3.0",
  skills: [],
};

interface SubAgentButtonProps {
  agent: AgentConfig;
  onManageSubAgent?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const SubAgentButton: React.FC<SubAgentButtonProps> = ({
  agent,
  onManageSubAgent,
  onSuccess,
  onError,
  children,
}) => {
  const { t } = useTranslation(['agents', 'common']);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AgentConfig[]>([]);
  const [pendingSubAgents, setPendingSubAgents] = useState<SubAgent[]>([]);
  const [isAddLocalModalVisible, setIsAddLocalModalVisible] = useState(false);
  const [isAddA2AModalVisible, setIsAddA2AModalVisible] = useState(false);
  const [editingLocalAgent, setEditingLocalAgent] =
    useState<LocalSubAgentConfig | null>(null);
  const [editingA2AAgent, setEditingA2AAgent] =
    useState<A2aSubAgentConfig | null>(null);
  const [localForm] = Form.useForm();
  const [a2aForm] = Form.useForm();

  // 加载可用的Agents列表
  const loadAvailableAgents = async () => {
    try {
      const agentsData = await getAllAgents();
      // 过滤掉当前Agent自身
      const filteredAgents = agentsData.data?.filter(
        (a: AgentConfig) => a.id !== agent.id
      );
      setAvailableAgents(filteredAgents || []);
    } catch (error) {
      console.error("Load agents list failed:", error);
      message.error(t('agents:subAgent.loadFailed'));
    }
  };

  const handleClick = async () => {
    if (onManageSubAgent) {
      onManageSubAgent(agent);
    } else {
      setPendingSubAgents(agent.subAgents ? [...agent.subAgents] : []);
      await loadAvailableAgents();
      setIsDrawerVisible(true);
    }
  };

  const handleToggleSubAgent = (subAgentId: string, enabled: boolean) => {
    setPendingSubAgents((prev) =>
      prev.map((subAgent) =>
        subAgent.agentId === subAgentId ? { ...subAgent, enabled } : subAgent
      )
    );
  };

  const handleRemoveSubAgent = (subAgentId: string) => {
    setPendingSubAgents((prev) =>
      prev.filter((subAgent) => subAgent.agentId !== subAgentId)
    );
  };

  const handleAddOrUpdateLocalAgent = (values: any) => {
    // 编辑模式：检查除自身外是否存在同名Agent
    if (editingLocalAgent) {
      const existingAgent = pendingSubAgents.find(
        (sa) =>
          sa.agentId === values.agentId &&
          sa.agentId !== editingLocalAgent.agentId
      );
      if (existingAgent) {
        message.warning(t('agents:subAgent.duplicate'));
        return;
      }
    } else {
      // 添加模式：检查是否存在
      const existingAgent = pendingSubAgents.find(
        (sa) => sa.agentId === values.agentId
      );
      if (existingAgent) {
        message.warning(t('agents:subAgent.duplicate'));
        return;
      }
    }

    const localSubAgent: LocalSubAgentConfig = {
      agentId: values.agentId,
      capacities: values.capacities,
      enabled: values.enabled ?? true,
      type: SubAgentType.LOCAL,
    };

    if (editingLocalAgent) {
      // 更新现有Agent
      setPendingSubAgents((prev) =>
        prev.map((sa) =>
          sa.agentId === editingLocalAgent.agentId ? localSubAgent : sa
        )
      );
    } else {
      // 添加新Agent
      setPendingSubAgents((prev) => [...prev, localSubAgent]);
    }

    // 重置表单并关闭弹窗
    localForm.resetFields();
    setEditingLocalAgent(null);
    setIsAddLocalModalVisible(false);
  };

  const handleAddOrUpdateA2AAgent = (values: any) => {
    // 编辑模式：检查除自身外是否存在同名Agent
    if (editingA2AAgent) {
      const existingAgent = pendingSubAgents.find(
        (sa) =>
          sa.agentId === values.agentId &&
          sa.agentId !== editingA2AAgent.agentId
      );
      if (existingAgent) {
        message.warning(t('agents:subAgent.duplicateId'));
        return;
      }
    } else {
      // 添加模式：检查是否存在
      const existingAgent = pendingSubAgents.find(
        (sa) => sa.agentId === values.agentId
      );
      if (existingAgent) {
        message.warning(t('agents:subAgent.duplicate'));
        return;
      }
    }

    // 验证至少需要一个技能
    const skills = values.skills || [];
    if (skills.length === 0) {
      message.warning(t('agents:subAgent.atLeastOneSkill'));
      return;
    }

    const a2aSubAgent: A2aSubAgentConfig = {
      agentId: values.agentId,
      enabled: values.enabled ?? true,
      type: SubAgentType.A2A,
      agentCard: {
        name: values.name,
        description: values.description,
        url: values.url,
        version: values.version,
        skills: skills,
        preferredTransport: DefaultA2AAgentCard.preferredTransport,
        protocolVersion: DefaultA2AAgentCard.protocolVersion,
        additionalInterfaces: DefaultA2AAgentCard.additionalInterfaces.map(
          (iface) => ({
            ...iface,
            url: values.url,
          })
        ),
        supportsAuthenticatedExtendedCard:
          DefaultA2AAgentCard.supportsAuthenticatedExtendedCard,
        defaultOutputModes: DefaultA2AAgentCard.defaultOutputModes,
        defaultInputModes: DefaultA2AAgentCard.defaultInputModes,
        capabilities: DefaultA2AAgentCard.capabilities,
      },
    };

    if (editingA2AAgent) {
      // 更新现有Agent
      setPendingSubAgents((prev) =>
        prev.map((sa) =>
          sa.agentId === editingA2AAgent.agentId ? a2aSubAgent : sa
        )
      );
    } else {
      // 添加新Agent
      setPendingSubAgents((prev) => [...prev, a2aSubAgent]);
    }

    // 重置表单并关闭弹窗
    a2aForm.resetFields();
    setEditingA2AAgent(null);
    setIsAddA2AModalVisible(false);
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        await updateAgent(agent.id, { subAgents: pendingSubAgents });
        message.success(t('agents:subAgent.saveSuccess'));

        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }

        setIsDrawerVisible(false);
      } else {
        throw new Error("Agent ID不存在");
      }
    } catch (error) {
      console.error("SubAgent config save failed:", error);

      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error(t('agents:subAgent.saveFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 检查是否有变更
  const hasChanges = () => {
    if (pendingSubAgents.length !== agent.subAgents?.length) return true;

    return (
      pendingSubAgents.some((pending) => {
        const original = agent.subAgents?.find(
          (sa) => sa.agentId === pending.agentId
        );
        if (!original) return true;

        // 检查基本属性
        if (original.enabled !== pending.enabled) return true;
        if ((original as any).capacities !== (pending as any).capacities) return true;

        // 检查A2A Agent特有属性
        const isA2A = pending.type === SubAgentType.A2A;
        const originalIsA2A = original.type === SubAgentType.A2A;

        if (isA2A !== originalIsA2A) return true;

        if (isA2A && originalIsA2A) {
          const a2aOriginal = original as A2aSubAgentConfig;
          const a2aPending = pending as A2aSubAgentConfig;

          if (a2aOriginal.agentCard.name !== a2aPending.agentCard.name)
            return true;
          if (
            a2aOriginal.agentCard.description !==
            a2aPending.agentCard.description
          )
            return true;
          if (a2aOriginal.agentCard.url !== a2aPending.agentCard.url)
            return true;
          if (a2aOriginal.agentCard.version !== a2aPending.agentCard.version)
            return true;
          if (
            JSON.stringify(a2aOriginal.agentCard.skills) !==
            JSON.stringify(a2aPending.agentCard.skills)
          )
            return true;
        }

        return false;
      }) ||
      agent.subAgents.some((original) => {
        return !pendingSubAgents.some(
          (pending) => pending.agentId === original.agentId
        );
      })
    );
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
    // 关闭抽屉时重置表单和状态
    localForm.resetFields();
    a2aForm.resetFields();
    setEditingLocalAgent(null);
    setEditingA2AAgent(null);
    setPendingSubAgents(agent.subAgents ? [...agent.subAgents] : []);
  };

  const handleAddLocalModalClose = () => {
    setIsAddLocalModalVisible(false);
    localForm.resetFields();
    setEditingLocalAgent(null);
  };

  const handleAddA2AModalClose = () => {
    setIsAddA2AModalVisible(false);
    a2aForm.resetFields();
    setEditingA2AAgent(null);
  };

  const handleOpenAddA2AModal = () => {
    // 打开添加A2A Agent弹窗时，默认添加一个空技能
    a2aForm.setFieldsValue({
      skills: [{ id: "", name: "", description: "", tags: [], examples: [] }],
    });
    setIsAddA2AModalVisible(true);
  };

  const handleEditA2AAgent = (subAgent: SubAgent) => {
    if (subAgent.type !== SubAgentType.A2A) return;

    const a2aAgent = subAgent as A2aSubAgentConfig;
    setEditingA2AAgent(a2aAgent);

    // 填充表单
    a2aForm.setFieldsValue({
      agentId: a2aAgent.agentId,
      enabled: a2aAgent.enabled ?? true,
      name: a2aAgent.agentCard.name,
      description: a2aAgent.agentCard.description,
      url: a2aAgent.agentCard.url,
      version: a2aAgent.agentCard.version,
      skills:
        a2aAgent.agentCard.skills && a2aAgent.agentCard.skills.length > 0
          ? a2aAgent.agentCard.skills
          : [{ id: "", name: "", description: "", tags: [], examples: [] }],
    });

    setIsAddA2AModalVisible(true);
  };

  const handleEditLocalAgent = (subAgent: SubAgent) => {
    if (subAgent.type !== SubAgentType.LOCAL) return;

    const localAgent = subAgent as LocalSubAgentConfig;
    setEditingLocalAgent(localAgent);

    // 填充表单
    localForm.setFieldsValue({
      agentId: localAgent.agentId,
      capacities: localAgent.capacities,
      enabled: localAgent.enabled ?? true,
    });

    setIsAddLocalModalVisible(true);
  };

  // 获取可添加的Agent列表
  const getAvailableAgentsForSelect = () => {
    return availableAgents.filter(
      (agent) =>
        !pendingSubAgents.some((pending) => pending.agentId === agent.id)
    );
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<TeamOutlined />}
        onClick={handleClick}
      >
        {children || t('agents:subAgent.button')}
      </Button>

      <Modal
        title={`${agent.name} - ${t('agents:subAgent.modalTitle')}`}
        open={isDrawerVisible}
        onOk={handleSaveChanges}
        onCancel={handleDrawerClose}
        width="80vw"
        style={{ maxWidth: 1200 }}
        destroyOnClose={true}
        okText={t('common:saveConfig')}
        cancelText={t('common:cancel')}
        confirmLoading={loading}
        zIndex={1000}
        okButtonProps={{
          icon: <CheckOutlined />,
          disabled: !hasChanges(),
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 添加子Agent按钮区域 */}
          <div>
            <Space>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => setIsAddLocalModalVisible(true)}
              >
                {t('agents:subAgent.addLocal')}
              </Button>
              <Button
                type="primary"
                icon={<ApiOutlined />}
                onClick={handleOpenAddA2AModal}
              >
                {t('agents:subAgent.addA2A')}
              </Button>
            </Space>
          </div>

          {/* 子Agent列表区域 */}
          <div>
            <Text strong style={{ marginBottom: 12, display: "block" }}>
              {t('agents:subAgent.listTitle', { count: pendingSubAgents.length })}
            </Text>
            <div
              style={{
                border: `1px solid ${colors.dividerSoft}`,
                borderRadius: 6,
                padding: 16,
                minHeight: 200,
                maxHeight: 400,
                overflow: "auto",
                background: colors.surfacePearl,
              }}
            >
              {pendingSubAgents.length > 0 ? (
                <List
                  dataSource={pendingSubAgents}
                  renderItem={(subAgent, index) => (
                    <List.Item
                      style={{
                        padding: "12px 0",
                        borderBottom:
                          index < pendingSubAgents.length - 1
                            ? `1px solid ${colors.dividerSoft}`
                            : "none",
                      }}
                      actions={[
                        subAgent.type === SubAgentType.A2A && (
                          <Button
                            key="edit"
                            type="link"
                            size="small"
                            onClick={() => handleEditA2AAgent(subAgent)}
                          >
                            {t('agents:subAgent.edit')}
                          </Button>
                        ),
                        <Button
                          key="toggle"
                          type="text"
                          size="small"
                          onClick={() =>
                            handleToggleSubAgent(
                              subAgent.agentId,
                              !subAgent.enabled
                            )
                          }
                          style={{
                            color: subAgent.enabled ? colors.statusDanger : colors.statusSuccess,
                          }}
                        >
                          {subAgent.enabled ? t('agents:subAgent.disabled') : t('agents:subAgent.enabled')}
                        </Button>,
                        <Button
                          key="remove"
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveSubAgent(subAgent.agentId)}
                        >
                          {t('agents:subAgent.remove')}
                        </Button>,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={
                          subAgent.type === SubAgentType.A2A ? (
                            <ApiOutlined
                              style={{ color: colors.accentOrange, fontSize: 16 }}
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
                                color={
                                  subAgent.type === SubAgentType.A2A
                                    ? "orange"
                                    : "blue"
                                }
                              >
                                {SubAgentTypeNameMap[subAgent.type]}
                              </Tag>
                              <Tag color={subAgent.enabled ? "green" : "red"}>
                                {subAgent.enabled ? t('agents:subAgent.enabled') : t('agents:subAgent.disabled')}
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
                                color: colors.inkMuted60,
                                lineHeight: "1.4",
                                wordBreak: "break-word",
                              }}
                            >
                              <strong>
                                {subAgent.type === SubAgentType.A2A
                                  ? t('agents:subAgent.descriptionLabel')
                                  : t('agents:subAgent.capacitiesDescLabel')}
                                ：
                              </strong>
                              {subAgent.type === SubAgentType.A2A
                                ? subAgent.agentCard.description
                                : subAgent.capacities}
                            </div>
                            {subAgent.type === SubAgentType.A2A && (
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
                                {(subAgent as A2aSubAgentConfig).agentCard
                                  .name && (
                                  <div style={{ marginTop: "2px" }}>
                                    <strong>{t('agents:subAgent.agentNameInfo')}</strong>
                                    {
                                      (subAgent as A2aSubAgentConfig).agentCard
                                        .name
                                    }
                                  </div>
                                )}
                                <div>
                                  <strong>{t('agents:subAgent.urlInfo')}</strong>
                                  {
                                    (subAgent as A2aSubAgentConfig).agentCard
                                      .url
                                  }
                                </div>
                                <div style={{ marginTop: "2px" }}>
                                  <strong>{t('agents:subAgent.versionInfo')}</strong>
                                  {
                                    (subAgent as A2aSubAgentConfig).agentCard
                                      .version
                                  }
                                </div>
                                {(subAgent as A2aSubAgentConfig).agentCard
                                  .skills &&
                                  (subAgent as A2aSubAgentConfig).agentCard
                                    .skills.length > 0 && (
                                    <div style={{ marginTop: "6px" }}>
                                      <strong>{t('agents:subAgent.skillsListInfo')}</strong>
                                      <div
                                        style={{
                                          marginTop: "6px",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "8px",
                                        }}
                                      >
                                        {
                                          (subAgent as A2aSubAgentConfig)
                                            .agentCard.skills.map(
                                              (skill, idx) => (
                                                <div
                                                  key={idx}
                                                  style={{
                                                    padding: "8px",
                                                    background: colors.canvas,
                                                    borderRadius: "4px",
                                                    border: `1px solid ${colors.hairline}`,
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      fontWeight: 500,
                                                      color: colors.ink,
                                                      marginBottom: "4px",
                                                    }}
                                                  >
                                                    {skill.name}
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: "12px",
                                                      color: colors.inkMuted60,
                                                      marginBottom: "4px",
                                                    }}
                                                  >
                                                    {skill.description}
                                                  </div>
                                                  {skill.examples &&
                                                    skill.examples.length >
                                                      0 && (
                                                      <div
                                                        style={{
                                                          marginTop: "4px",
                                                        }}
                                                      >
                                                        <Text
                                                          type="secondary"
                                                          style={{
                                                            fontSize: "11px",
                                                          }}
                                                        >
                                                          {t('agents:subAgent.examplesInfo')}
                                                        </Text>
                                                        <div
                                                          style={{
                                                            marginTop: "2px",
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: "4px",
                                                          }}
                                                        >
                                                          {skill.examples.map(
                                                            (
                                                              example,
                                                              exIdx
                                                            ) => (
                                                              <Tag
                                                                key={exIdx}
                                                                color="blue"
                                                                style={{
                                                                  margin: 0,
                                                                  fontSize:
                                                                    "11px",
                                                                }}
                                                              >
                                                                {example}
                                                              </Tag>
                                                            )
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                </div>
                                              )
                                            )
                                        }
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: colors.bodyMuted,
                    padding: "40px 0",
                  }}
                >
                  {t('agents:subAgent.empty')}
                </div>
              )}
            </div>
          </div>

          {/* 变更提示 */}
          {hasChanges() && (
            <div
              style={commonStyles.infoBox}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ {t('common:changeDetected')}
              </Text>
            </div>
          )}
        </Space>
      </Modal>

      {/* 关联本地Agent弹窗 */}
      <Modal
        title={editingLocalAgent ? t('agents:subAgent.editLocalTitle') : t('agents:subAgent.linkLocalTitle')}
        open={isAddLocalModalVisible}
        onOk={() => localForm.submit()}
        onCancel={handleAddLocalModalClose}
        width={600}
        okText={editingLocalAgent ? t('agents:subAgent.update') : t('common:add')}
        cancelText={t('common:cancel')}
        zIndex={1001}
      >
        <Form
          form={localForm}
          layout="vertical"
          onFinish={handleAddOrUpdateLocalAgent}
          preserve={false}
        >
          <Form.Item
            name="agentId"
            label={t('agents:subAgent.selectAgentLabel')}
            rules={[{ required: true, message: t('agents:subAgent.selectAgentRequired') }]}
          >
            <Select
              placeholder={t('agents:subAgent.selectAgentPlaceholder')}
              showSearch
              optionFilterProp="children"
              disabled={!!editingLocalAgent}
            >
              {getAvailableAgentsForSelect().map((availableAgent) => (
                <Select.Option
                  key={availableAgent.id}
                  value={availableAgent.id}
                >
                  <Space>
                    <span>{availableAgent.name}</span>
                    <Tag color={availableAgent.enabled ? "green" : "red"}>
                      {availableAgent.enabled ? t('common:online') : t('common:offline')}
                    </Tag>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="capacities"
            label={t('agents:subAgent.capacities')}
            rules={[{ required: true, message: t('agents:subAgent.capacitiesRequired') }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={t('agents:subAgent.capacitiesPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="enabled"
            label={t('agents:subAgent.enabledStatus')}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加A2A Agent弹窗 */}
      <Modal
        title={editingA2AAgent ? t('agents:subAgent.editA2ATitle') : t('agents:subAgent.addA2ATitle')}
        open={isAddA2AModalVisible}
        onOk={() => a2aForm.submit()}
        onCancel={handleAddA2AModalClose}
        width={800}
        okText={editingA2AAgent ? t('agents:subAgent.update') : t('common:add')}
        cancelText={t('common:cancel')}
        zIndex={1001}
      >
        <Form
          form={a2aForm}
          layout="vertical"
          onFinish={handleAddOrUpdateA2AAgent}
          preserve={false}
        >
          <Form.Item
            name="agentId"
            label={t('agents:subAgent.agentIdLabel')}
            rules={[{ required: true, message: t('agents:subAgent.agentIdRequired') }]}
          >
            <Input
              placeholder={t('agents:subAgent.agentIdPlaceholder')}
              disabled={!!editingA2AAgent}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label={t('agents:subAgent.agentNameLabel')}
            rules={[{ required: true, message: t('agents:subAgent.agentNameRequired') }]}
          >
            <Input placeholder={t('agents:subAgent.agentNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('agents:subAgent.agentDescLabel')}
            rules={[{ required: true, message: t('agents:subAgent.agentDescRequired') }]}
          >
            <Input.TextArea rows={2} placeholder={t('agents:subAgent.agentDescPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="url"
            label={t('agents:subAgent.urlLabel')}
            rules={[{ required: true, message: t('agents:subAgent.urlRequired') }]}
          >
            <Input placeholder="http://localhost:8080/a2a/simple_agent/" />
          </Form.Item>

          <Form.Item
            name="version"
            label={t('agents:subAgent.versionLabel')}
            rules={[{ required: true, message: t('agents:subAgent.versionRequired') }]}
            initialValue="1.0.0"
          >
            <Input placeholder="1.0.0" />
          </Form.Item>

          <Form.List name="skills">
            {(fields, { add, remove }) => (
              <>
                <Form.Item label={t('agents:subAgent.skillsListLabel')}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    {t('agents:subAgent.addSkillBtn')}
                  </Button>
                </Form.Item>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={t('agents:subAgent.skillN', { n: index + 1 })}
                    extra={
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        {t('agents:subAgent.deleteSkill')}
                      </Button>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, "id"]}
                      label={t('agents:subAgent.skillId')}
                      rules={[{ required: true, message: t('agents:subAgent.skillIdRequired') }]}
                    >
                      <Input placeholder="skill_id" />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "name"]}
                      label={t('agents:subAgent.skillName')}
                      rules={[{ required: true, message: t('agents:subAgent.skillNameRequired') }]}
                    >
                      <Input placeholder={t('agents:subAgent.skillNamePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "description"]}
                      label={t('agents:subAgent.skillDesc')}
                      rules={[{ required: true, message: t('agents:subAgent.skillDescRequired') }]}
                    >
                      <Input.TextArea rows={2} placeholder={t('agents:subAgent.skillDescPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "tags"]}
                      label={t('agents:subAgent.tagsLabel')}
                    >
                      <Select
                        mode="tags"
                        placeholder={t('agents:subAgent.tagsPlaceholder')}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      name={[field.name, "examples"]}
                      label={t('agents:subAgent.examplesLabel')}
                    >
                      <Select
                        mode="tags"
                        placeholder={t('agents:subAgent.examplesPlaceholder')}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Card>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item
            name="enabled"
            label={t('agents:subAgent.enabledStatus')}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SubAgentButton;
