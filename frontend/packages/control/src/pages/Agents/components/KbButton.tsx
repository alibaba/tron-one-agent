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


import React, { useState, useEffect } from 'react';
import { Button, Modal, List, Tag, Space, Typography, message, Select, Checkbox, Form, Input, Radio } from 'antd';
import { DatabaseOutlined, PlusOutlined, DeleteOutlined, CheckOutlined, SettingOutlined } from '@ant-design/icons';
import { AgentConfig, AgentKnowledgeBaseConfig } from '../../../types/agent.interface';
import { BailianKnowledgeBaseConfig } from '../../../types/kb.interface';
import { updateAgent } from '../../../services/agent';
import { getAllKbs } from '../../../services/kb';

const { Text } = Typography;

interface KbButtonProps {
  agent: AgentConfig;
  onManageKb?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const KbButton: React.FC<KbButtonProps> = ({ agent, onManageKb, onSuccess, onError, children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableKbs, setAvailableKbs] = useState<BailianKnowledgeBaseConfig[]>([]);
  const [kbsLoading, setKbsLoading] = useState(false);
  const [pendingKbs, setPendingKbs] = useState<AgentKnowledgeBaseConfig[]>([]);
  const [selectedKb, setSelectedKb] = useState<string>('');
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editingKb, setEditingKb] = useState<AgentKnowledgeBaseConfig | null>(null);
  const [configForm] = Form.useForm();

  // 加载可用知识库列表
  const loadAvailableKbs = async () => {
    try {
      setKbsLoading(true);
      const kbsData = await getAllKbs();
      setAvailableKbs(kbsData.data || []);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败');
    } finally {
      setKbsLoading(false);
    }
  };

  const handleClick = async () => {
    if (onManageKb) {
      onManageKb(agent);
    } else {
      await loadAvailableKbs();
      setIsModalVisible(true);
    }
  };

  // 初始化待处理知识库列表
  useEffect(() => {
    if (isModalVisible) {
      const initialKbs = (agent.knowledgeBases || []).map(agentKb => ({
        enabled: agentKb.enabled,
        knowledgeId: agentKb.knowledgeId,
        mode: agentKb.mode,
        agentic_tool_description: agentKb.agentic_tool_description,
        defaultLimit: agentKb.defaultLimit,
        defaultScoreThreshold: agentKb.defaultScoreThreshold
      }));
      setPendingKbs(initialKbs);
    }
  }, [isModalVisible, agent.knowledgeBases]);

  const handleAddKb = () => {
    if (!selectedKb) {
      message.warning('请选择要添加的知识库');
      return;
    }
    
    if (pendingKbs.some(kb => kb.knowledgeId === selectedKb)) {
      message.warning('该知识库已存在');
      return;
    }
    
    const newKbConfig: AgentKnowledgeBaseConfig = {
      enabled: true,
      knowledgeId: selectedKb,
      mode: 'generic',
      agentic_tool_description: null,
      defaultLimit: 10,
      defaultScoreThreshold: 0.7
    };
    
    setPendingKbs(prev => [...prev, newKbConfig]);
    setSelectedKb('');
  };

  const handleRemoveKb = (knowledgeId: string) => {
    setPendingKbs(prev => prev.filter(kb => kb.knowledgeId !== knowledgeId));
  };

  const handleToggleKb = (knowledgeId: string, enabled: boolean) => {
    setPendingKbs(prev => prev.map(kb => 
      kb.knowledgeId === knowledgeId ? { ...kb, enabled } : kb
    ));
  };

  const handleConfigKb = (kb: AgentKnowledgeBaseConfig) => {
    setEditingKb(kb);
    configForm.setFieldsValue({
      mode: kb.mode,
      agentic_tool_description: kb.agentic_tool_description || '',
      defaultLimit: kb.defaultLimit || 10,
      defaultScoreThreshold: kb.defaultScoreThreshold || 0.7
    });
    setConfigModalVisible(true);
  };

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      if (editingKb) {
        setPendingKbs(prev => prev.map(kb => 
          kb.knowledgeId === editingKb.knowledgeId 
            ? { 
                ...kb, 
                mode: values.mode,
                agentic_tool_description: values.agentic_tool_description || null,
                defaultLimit: Number(values.defaultLimit),
                defaultScoreThreshold: Number(values.defaultScoreThreshold)
              } 
            : kb
        ));
        message.success('知识库配置更新成功');
        setConfigModalVisible(false);
        setEditingKb(null);
      }
    } catch (error) {
      console.error('配置保存失败:', error);
      message.error('配置保存失败，请重试');
    }
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        await updateAgent(agent.id, { knowledgeBases: pendingKbs });
        message.success('知识库配置保存成功');
        
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('知识库配置保存失败:', error);
      
      if (onError) {
        onError(error);
      } else {
        message.error('知识库配置保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setPendingKbs([]);
    setSelectedKb('');
  };

  // 获取可添加的知识库列表
  const getAvailableKbsForSelect = () => {
    return availableKbs.filter(kb => !pendingKbs.some(pending => pending.knowledgeId === kb.id));
  };

  // 检查是否有变更
  const hasChanges = () => {
    const originalKbs = agent.knowledgeBases || [];
    if (pendingKbs.length !== originalKbs.length) return true;
    
    return pendingKbs.some(pending => {
      const original = originalKbs.find(kb => kb.knowledgeId === pending.knowledgeId);
      if (!original) return true;
      
      return (
        original.enabled !== pending.enabled ||
        original.mode !== pending.mode ||
        original.agentic_tool_description !== pending.agentic_tool_description ||
        original.defaultLimit !== pending.defaultLimit ||
        original.defaultScoreThreshold !== pending.defaultScoreThreshold
      );
    }) || originalKbs.some(original => {
      return !pendingKbs.some(pending => pending.knowledgeId === original.knowledgeId);
    });
  };

  // 根据知识库ID获取知识库信息
  const getKbInfo = (knowledgeId: string) => {
    return availableKbs.find(kb => kb.id === knowledgeId);
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<DatabaseOutlined />}
        onClick={handleClick}
      >
        {children || '知识库'}
      </Button>

      <Modal
        title={`${agent.name} - 知识库管理`}
        open={isModalVisible}
        onOk={handleSaveChanges}
        onCancel={handleModalClose}
        width={800}
        okText="保存配置"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{ 
          icon: <CheckOutlined />,
          disabled: !hasChanges()
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 添加知识库区域 */}
          <div>
            <Space style={{ width: '100%' }}>
              <Select
                style={{ flex: 1, minWidth: 300 }}
                placeholder="选择要添加的知识库"
                value={selectedKb}
                onChange={setSelectedKb}
                allowClear
                loading={kbsLoading}
                optionLabelProp="label"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {getAvailableKbsForSelect().map(kb => (
                  <Select.Option 
                    key={kb.id} 
                    value={kb.id}
                    label={kb.name}
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{kb.name}</div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#8c8c8c', 
                        lineHeight: '1.4'
                      }}>
                        工作空间: {kb.workspaceId} | 索引: {kb.indexId}
                      </div>
                      <Space style={{ marginTop: '4px' }}>
                        <Tag size="small" color="purple">Bailian</Tag>
                        <Tag size="small" color={kb.enabled ? 'green' : 'red'}>
                          {kb.enabled ? '在线' : '离线'}
                        </Tag>
                        {kb.enableRewrite && <Tag size="small" color="blue">重写</Tag>}
                        {kb.enableRerank && <Tag size="small" color="cyan">重排</Tag>}
                      </Space>
                    </div>
                  </Select.Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddKb}
                disabled={!selectedKb}
              >
                添加
              </Button>
            </Space>
          </div>

          {/* 知识库列表区域 */}
          <div>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              已配置知识库 ({pendingKbs.length}个)：
            </Text>
            <div style={{ 
              border: '1px solid #f0f0f0', 
              borderRadius: 8, 
              padding: 16,
              minHeight: 200,
              maxHeight: 400,
              overflow: 'auto',
              background: '#fafafa'
            }}>
              {pendingKbs.length > 0 ? (
                <List
                  dataSource={pendingKbs}
                  renderItem={(kb, index) => {
                    const kbInfo = getKbInfo(kb.knowledgeId);
                    const kbOnlineStatus = kbInfo?.enabled || false;
                    
                    return (
                      <List.Item
                        style={{ 
                          padding: '16px 0',
                          borderBottom: index < pendingKbs.length - 1 ? '1px solid #f0f0f0' : 'none',
                          background: '#fff',
                          borderRadius: 6,
                          marginBottom: index < pendingKbs.length - 1 ? 8 : 0,
                          paddingLeft: 16,
                          paddingRight: 16
                        }}
                        actions={[
                          <Checkbox
                            key="toggle"
                            checked={kb.enabled}
                            onChange={(e) => handleToggleKb(kb.knowledgeId, e.target.checked)}
                          >
                            启用
                          </Checkbox>,
                          <Button
                            key="config"
                            type="text"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => handleConfigKb(kb)}
                          >
                            配置
                          </Button>,
                          <Button
                            key="remove"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveKb(kb.knowledgeId)}
                          >
                            移除
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<DatabaseOutlined style={{ color: '#722ed1', fontSize: 18 }} />}
                          title={
                            <Space wrap>
                              <span style={{ fontWeight: 500, fontSize: 14 }}>
                                {kbInfo?.name || kb.knowledgeId}
                              </span>
                              <Tag size="small" color="purple">Bailian</Tag>
                              <Tag size="small" color={kbOnlineStatus ? 'green' : 'red'}>
                                {kbOnlineStatus ? '在线' : '离线'}
                              </Tag>
                              <Tag size="small" color={kb.mode === 'agentic' ? 'orange' : 'blue'}>
                                {kb.mode === 'agentic' ? '智能模式' : '通用模式'}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              {kbInfo && (
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#8c8c8c', 
                                  lineHeight: '1.4'
                                }}>
                                  <div>工作空间: {kbInfo.workspaceId}</div>
                                  <div style={{ marginTop: '2px' }}>索引ID: {kbInfo.indexId}</div>
                                </div>
                              )}
                              <Space wrap>
                                <Tag size="small" color="geekblue">
                                  限制: {kb.defaultLimit || 10}
                                </Tag>
                                <Tag size="small" color="cyan">
                                  阈值: {kb.defaultScoreThreshold || 0.7}
                                </Tag>
                                {kb.mode === 'agentic' && kb.agentic_tool_description && (
                                  <Tag size="small" color="orange">
                                    已配置工具描述
                                  </Tag>
                                )}
                              </Space>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  padding: '60px 0',
                  fontSize: 14
                }}>
                  <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div>暂无配置知识库</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>请从上方下拉框中选择知识库进行添加</div>
                </div>
              )}
            </div>
          </div>

          {/* 变更提示 */}
          {hasChanges() && (
            <div style={{ 
              padding: 12, 
              background: '#e6f7ff', 
              border: '1px solid #91d5ff',
              borderRadius: 6 
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ 检测到配置变更，点击"保存配置"按钮应用更改
              </Text>
            </div>
          )}
        </Space>
      </Modal>

      {/* 知识库配置弹窗 */}
      <Modal
        title={`配置知识库 - ${editingKb ? getKbInfo(editingKb.knowledgeId)?.name || editingKb.knowledgeId : ''}`}
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => {
          setConfigModalVisible(false);
          setEditingKb(null);
          configForm.resetFields();
        }}
        width={600}
        okText="保存配置"
        cancelText="取消"
      >
        <Form
          form={configForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="mode"
            label="知识库模式"
            rules={[{ required: true, message: '请选择知识库模式' }]}
          >
            <Radio.Group>
              <Radio value="generic">通用模式</Radio>
              <Radio value="agentic">智能模式</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.mode !== currentValues.mode}
          >
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode');
              return mode === 'agentic' ? (
                <Form.Item
                  name="agentic_tool_description"
                  label="智能工具描述"
                  tooltip="在智能模式下，描述该知识库作为工具的功能和用途"
                >
                  <Input.TextArea 
                    rows={3}
                    placeholder="请描述该知识库在智能模式下的功能和用途"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item
            name="defaultLimit"
            label="默认限制数量"
            rules={[
              { required: true, message: '请输入默认限制数量' },
              { type: 'number', min: 1, max: 100, message: '限制数量必须在1-100之间' }
            ]}
            tooltip="每次查询返回的最大结果数量"
          >
            <Input type="number" min={1} max={100} placeholder="10" />
          </Form.Item>

          <Form.Item
            name="defaultScoreThreshold"
            label="默认分数阈值"
            rules={[
              { required: true, message: '请输入默认分数阈值' },
              { type: 'number', min: 0, max: 1, message: '分数阈值必须在0-1之间' }
            ]}
            tooltip="查询结果的最低相似度分数，范围0-1"
          >
            <Input type="number" min={0} max={1} step={0.1} placeholder="0.7" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default KbButton;
