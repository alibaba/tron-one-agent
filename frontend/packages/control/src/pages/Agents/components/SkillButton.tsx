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
} from "antd";
import {
  ThunderboltOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { AgentConfig, AgentSkillConfig } from "../../../types/agent.interface";
import { SkillConfig } from "../../../types/skill.interface";
import { updateAgent } from "../../../services/agent";
import { getAllSkills } from "../../../services/skill";

const { Text } = Typography;

interface SkillButtonProps {
  agent: AgentConfig;
  onManageSkill?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

interface PendingSkill {
  name: string;
  enabled: boolean;
  description?: string;
}

const SkillButton: React.FC<SkillButtonProps> = ({
  agent,
  onManageSkill,
  onSuccess,
  onError,
  children,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<SkillConfig[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [pendingSkills, setPendingSkills] = useState<PendingSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");

  // 加载可用Skill列表
  const loadAvailableSkills = async () => {
    try {
      setSkillsLoading(true);
      const response = await getAllSkills();
      setAvailableSkills(response.data || []);
    } catch (error) {
      console.error("加载Skill列表失败:", error);
      message.error("加载Skill列表失败");
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleClick = async () => {
    if (onManageSkill) {
      onManageSkill(agent);
    } else {
      await loadAvailableSkills();
      setIsModalVisible(true);
    }
  };

  // 当弹窗打开且可用Skill列表加载完成后，初始化待处理Skill列表
  useEffect(() => {
    if (isModalVisible && availableSkills?.length > 0) {
      const initialSkills: PendingSkill[] = (agent.skills || [])
        .map((agentSkill) => {
          const availableSkill = availableSkills.find(
            (s) => s.name === agentSkill.name
          );
          return {
            name: agentSkill.name,
            enabled: agentSkill.enabled,
            description: availableSkill?.description,
          };
        })
        .filter((s) => {
          // 保留所有已关联的（即使在可用列表中找不到也保留）
          return true;
        });

      setPendingSkills(initialSkills);
    }
  }, [isModalVisible, availableSkills, agent.skills]);

  const handleAddSkill = () => {
    if (!selectedSkill) {
      message.warning("请选择要添加的Skill");
      return;
    }

    if (pendingSkills?.some((s) => s.name === selectedSkill)) {
      message.warning("该Skill已存在");
      return;
    }

    const skillToAdd = availableSkills.find((s) => s.name === selectedSkill);
    if (skillToAdd) {
      setPendingSkills((prev) => [
        ...prev,
        {
          name: skillToAdd.name,
          enabled: true,
          description: skillToAdd.description,
        },
      ]);
      setSelectedSkill("");
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setPendingSkills((prev) => prev.filter((s) => s.name !== skillName));
  };

  const handleToggleSkill = (skillName: string, enabled: boolean) => {
    setPendingSkills((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, enabled } : s))
    );
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        const skillConfigs: AgentSkillConfig[] = pendingSkills.map((s) => ({
          name: s.name,
          enabled: s.enabled,
        }));

        await updateAgent(agent.id, { skills: skillConfigs });
        message.success("Skills配置保存成功");

        if (onSuccess) {
          onSuccess(agent);
        }

        setIsModalVisible(false);
      } else {
        throw new Error("Agent ID不存在");
      }
    } catch (error) {
      console.error("Skills配置保存失败:", error);

      if (onError) {
        onError(error);
      } else {
        message.error("Skills配置保存失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setPendingSkills([]);
    setSelectedSkill("");
  };

  // 获取可添加的Skill列表（排除已添加的）
  const getAvailableSkillsForSelect = () => {
    return availableSkills.filter(
      (s) => !pendingSkills?.some((pending) => pending.name === s.name)
    );
  };

  // 检查是否有变更
  const hasChanges = () => {
    const agentSkills = agent.skills || [];
    if (pendingSkills.length !== agentSkills.length) return true;

    return (
      pendingSkills.some((pending) => {
        const original = agentSkills.find((s) => s.name === pending.name);
        if (!original) return true;
        if (original.enabled !== pending.enabled) return true;
        return false;
      }) ||
      agentSkills.some((original) => {
        return !pendingSkills.some((pending) => pending.name === original.name);
      })
    );
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<ThunderboltOutlined />}
        onClick={handleClick}
      >
        {children || "Skills"}
      </Button>

      <Modal
        title={`${agent.name} - Skills管理`}
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
          {/* 添加Skill区域 */}
          <div>
            <Space style={{ width: "100%" }}>
              <Select
                style={{ flex: 1, minWidth: 250 }}
                placeholder="选择要添加的Skill"
                value={selectedSkill}
                onChange={setSelectedSkill}
                allowClear
                loading={skillsLoading}
                optionLabelProp="label"
              >
                {getAvailableSkillsForSelect().map((skill) => (
                  <Select.Option
                    key={skill.name}
                    value={skill.name}
                    label={skill.name}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{skill.name}</div>
                      {skill.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#8c8c8c",
                            marginTop: "2px",
                            lineHeight: "1.4",
                          }}
                        >
                          {skill.description}
                        </div>
                      )}
                      <Space style={{ marginTop: "4px" }}>
                        <Tag
                          color={skill.enabled ? "green" : "red"}
                        >
                          {skill.enabled ? "启用" : "禁用"}
                        </Tag>
                      </Space>
                    </div>
                  </Select.Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddSkill}
                disabled={!selectedSkill}
              >
                添加
              </Button>
            </Space>
          </div>

          {/* Skill列表区域 */}
          <div style={{ marginTop: "20px" }}>
            <Text strong style={{ marginBottom: 8, display: "block" }}>
              Skills ({pendingSkills.length}个)：
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
              {pendingSkills.length > 0 ? (
                <List
                  dataSource={pendingSkills}
                  renderItem={(skill, index) => {
                    const originalSkill = availableSkills.find(
                      (s) => s.name === skill.name
                    );
                    const skillEnabled = originalSkill?.enabled ?? true;

                    return (
                      <List.Item
                        style={{
                          padding: "12px 0",
                          borderBottom:
                            index < pendingSkills.length - 1
                              ? "1px solid #f0f0f0"
                              : "none",
                        }}
                        actions={[
                          <Checkbox
                            key="toggle"
                            checked={skill.enabled}
                            onChange={(e) =>
                              handleToggleSkill(skill.name, e.target.checked)
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
                            onClick={() => handleRemoveSkill(skill.name)}
                          >
                            移除
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <ThunderboltOutlined
                              style={{ color: "#faad14" }}
                            />
                          }
                          title={
                            <Space>
                              <span>{skill.name}</span>
                              <Tag
                                color={skillEnabled ? "green" : "red"}
                              >
                                {skillEnabled ? "可用" : "不可用"}
                              </Tag>
                            </Space>
                          }
                          description={
                            skill.description && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#8c8c8c",
                                  lineHeight: "1.4",
                                }}
                              >
                                {skill.description}
                              </div>
                            )
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
                  暂无配置Skills
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
                检测到配置变更，点击"保存配置"按钮应用更改
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default SkillButton;
