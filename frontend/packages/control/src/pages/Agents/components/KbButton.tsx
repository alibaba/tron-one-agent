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
import { useTranslation } from 'react-i18next';
import { AgentConfig, AgentKnowledgeBaseConfig } from '../../../types/agent.interface';
import { AnyKnowledgeBaseConfig, ElasticSearchKnowledgeBaseConfig } from '../../../types/kb.interface';
import { KnowledgeBaseType } from '../../../types/common.interface';
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
  const { t } = useTranslation(['agents', 'common']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableKbs, setAvailableKbs] = useState<AnyKnowledgeBaseConfig[]>([]);
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
      console.error('Load KB list failed:', error);
      message.error(t('agents:kb.loadFailed'));
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
        agenticToolDescription: agentKb.agenticToolDescription,
        defaultLimit: agentKb.defaultLimit,
        defaultScoreThreshold: agentKb.defaultScoreThreshold
      }));
      setPendingKbs(initialKbs);
    }
  }, [isModalVisible, agent.knowledgeBases]);

  const handleAddKb = () => {
    if (!selectedKb) {
      message.warning(t('agents:kb.selectPlaceholder'));
      return;
    }
    
    if (pendingKbs.some(kb => kb.knowledgeId === selectedKb)) {
      message.warning(t('agents:kb.duplicate'));
      return;
    }
    
    const newKbConfig: AgentKnowledgeBaseConfig = {
      enabled: true,
      knowledgeId: selectedKb,
      mode: 'GENERIC',
      agenticToolDescription: null,
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
      agenticToolDescription: kb.agenticToolDescription || '',
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
                agenticToolDescription: values.agenticToolDescription || null,
                defaultLimit: Number(values.defaultLimit),
                defaultScoreThreshold: Number(values.defaultScoreThreshold)
              } 
            : kb
        ));
        message.success(t('agents:kb.configUpdated'));
        setConfigModalVisible(false);
        setEditingKb(null);
      }
    } catch (error) {
      console.error('Config save failed:', error);
      message.error(t('agents:kb.configFailed'));
    }
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        await updateAgent(agent.id, { knowledgeBases: pendingKbs });
        message.success(t('agents:kb.saveSuccess'));
        
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('KB config save failed:', error);
      
      if (onError) {
        onError(error);
      } else {
        message.error(t('agents:kb.saveFailed'));
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
        original.agenticToolDescription !== pending.agenticToolDescription ||
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
        {children || t('agents:kb.button')}
      </Button>

      <Modal
        title={`${agent.name} - ${t('agents:kb.modalTitle')}`}
        open={isModalVisible}
        onOk={handleSaveChanges}
        onCancel={handleModalClose}
        width={800}
        okText={t('common:saveConfig')}
        cancelText={t('common:cancel')}
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
                placeholder={t('agents:kb.selectPlaceholder')}
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
                {getAvailableKbsForSelect().map(kb => {
                  const isBailian = kb.type === KnowledgeBaseType.BAILIAN;
                  const bailianKb = isBailian ? (kb as any) : null;
                  return (
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
                        {isBailian
                          ? `${t('agents:kb.workspace')}: ${bailianKb.workspaceId} | ${t('agents:kb.index')}: ${bailianKb.indexId}`
                          : `${t('agents:kb.address')}: ${(kb as ElasticSearchKnowledgeBaseConfig).url} | ${t('agents:kb.index')}: ${(kb as ElasticSearchKnowledgeBaseConfig).indexName}`
                        }
                      </div>
                      <Space style={{ marginTop: '4px' }}>
                        <Tag color={isBailian ? 'purple' : 'orange'}>{isBailian ? 'Bailian' : 'ES'}</Tag>
                        <Tag color={kb.enabled ? 'green' : 'red'}>
                          {kb.enabled ? t('common:online') : t('common:offline')}
                        </Tag>
                        {isBailian && bailianKb.enableRewrite && <Tag color="blue">{t('agents:kb.rewrite')}</Tag>}
                        {isBailian && bailianKb.enableRerank && <Tag color="cyan">{t('agents:kb.rerank')}</Tag>}
                      </Space>
                    </div>
                  </Select.Option>
                  );
                })}
              </Select>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddKb}
                disabled={!selectedKb}
              >
                {t('common:add')}
              </Button>
            </Space>
          </div>

          {/* 知识库列表区域 */}
          <div>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              {t('agents:kb.listTitle', { count: pendingKbs.length })}
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
                            {t('agents:kb.enabled')}
                          </Checkbox>,
                          <Button
                            key="config"
                            type="text"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => handleConfigKb(kb)}
                          >
                            {t('agents:kb.config')}
                          </Button>,
                          <Button
                            key="remove"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveKb(kb.knowledgeId)}
                          >
                            {t('agents:kb.remove')}
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
                              <Tag color={kbInfo?.type === KnowledgeBaseType.BAILIAN ? 'purple' : 'orange'}>
                                {kbInfo?.type === KnowledgeBaseType.BAILIAN ? 'Bailian' : 'ES'}
                              </Tag>
                              <Tag color={kbOnlineStatus ? 'green' : 'red'}>
                                {kbOnlineStatus ? t('common:online') : t('common:offline')}
                              </Tag>
                              <Tag color={kb.mode === 'AGENTIC' ? 'orange' : 'blue'}>
                                {kb.mode === 'AGENTIC' ? t('agents:kb.modeAgentic') : t('agents:kb.modeGeneric')}
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
                                  {kbInfo.type === KnowledgeBaseType.BAILIAN
                                    ? <><div>{t('agents:kb.workspace')}: {(kbInfo as any).workspaceId}</div><div style={{ marginTop: '2px' }}>{t('agents:kb.indexId')}: {(kbInfo as any).indexId}</div></>
                                    : <><div>{t('agents:kb.address')}: {(kbInfo as ElasticSearchKnowledgeBaseConfig).url}</div><div style={{ marginTop: '2px' }}>{t('agents:kb.index')}: {(kbInfo as ElasticSearchKnowledgeBaseConfig).indexName}</div></>
                                  }
                                </div>
                              )}
                              <Space wrap>
                                <Tag color="geekblue">
                                  {t('agents:kb.limitTag', { value: kb.defaultLimit || 10 })}
                                </Tag>
                                <Tag color="cyan">
                                  {t('agents:kb.thresholdTag', { value: kb.defaultScoreThreshold || 0.7 })}
                                </Tag>
                                {kb.mode === 'AGENTIC' && kb.agenticToolDescription && (
                                  <Tag color="orange">
                                    {t('agents:kb.toolDescConfigured')}
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
                  <div>{t('agents:kb.empty')}</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>{t('agents:kb.emptyHint')}</div>
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
                {t('common:changeDetected')}
              </Text>
            </div>
          )}
        </Space>
      </Modal>

      {/* 知识库配置弹窗 */}
      <Modal
        title={`${t('agents:kb.configTitle')} - ${editingKb ? getKbInfo(editingKb.knowledgeId)?.name || editingKb.knowledgeId : ''}`}
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => {
          setConfigModalVisible(false);
          setEditingKb(null);
          configForm.resetFields();
        }}
        width={600}
        okText={t('common:saveConfig')}
        cancelText={t('common:cancel')}
      >
        <Form
          form={configForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="mode"
            label={t('agents:kb.mode')}
            rules={[{ required: true, message: t('agents:kb.modeRequired') }]}
          >
            <Radio.Group>
              <Radio value="GENERIC">{t('agents:kb.modeGeneric')}</Radio>
              <Radio value="AGENTIC">{t('agents:kb.modeAgentic')}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.mode !== currentValues.mode}
          >
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode');
              return mode === 'AGENTIC' ? (
                <Form.Item
                  name="agenticToolDescription"
                  label={t('agents:kb.agenticDesc')}
                  tooltip={t('agents:kb.agenticDescTooltip')}
                >
                  <Input.TextArea 
                    rows={3}
                    placeholder={t('agents:kb.agenticDescPlaceholder')}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item
            name="defaultLimit"
            label={t('agents:kb.defaultLimit')}
            rules={[
              { required: true, message: t('agents:kb.limitRequired') },
              { type: 'number', min: 1, max: 100, message: t('agents:kb.limitRange') }
            ]}
            tooltip={t('agents:kb.limitTooltip')}
          >
            <Input type="number" min={1} max={100} placeholder="10" />
          </Form.Item>

          <Form.Item
            name="defaultScoreThreshold"
            label={t('agents:kb.defaultThreshold')}
            rules={[
              { required: true, message: t('agents:kb.thresholdRequired') },
              { type: 'number', min: 0, max: 1, message: t('agents:kb.thresholdRange') }
            ]}
            tooltip={t('agents:kb.thresholdTooltip')}
          >
            <Input type="number" min={0} max={1} step={0.1} placeholder="0.7" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default KbButton;
