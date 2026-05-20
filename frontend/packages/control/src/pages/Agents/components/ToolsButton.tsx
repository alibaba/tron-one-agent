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


import React, { useState } from 'react';
import { Button, Modal, List, Typography, message, Select, Space, Checkbox } from 'antd';
import { ToolOutlined, PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';
import { getAllTools } from '../../../services/tools';
import { AgentToolConfig } from '../../../types/tool.interface';
import { colors, commonStyles } from '../../../styles/tokens';

const { Text } = Typography;

interface ToolsButtonProps {
  agent: AgentConfig;
  onManageTools?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const ToolsButton: React.FC<ToolsButtonProps> = ({ agent, onManageTools, onSuccess, onError, children }) => {
  const { t } = useTranslation(['agents', 'common']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingTools, setPendingTools] = useState<{name: string, enabled: boolean}[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [availableTools, setAvailableTools] = useState<AgentToolConfig[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  // 加载可用工具列表
  const loadAvailableTools = async () => {
    try {
      setToolsLoading(true);
      const toolsData = await getAllTools();
      setAvailableTools(toolsData.data || []);
    } catch (error) {
      console.error('Load tools failed:', error);
      message.error(t('agents:tools.loadFailed'));
    } finally {
      setToolsLoading(false);
    }
  };

  const handleClick = () => {
    if (onManageTools) {
      onManageTools(agent);
    } else {
      // 初始化待处理工具列表 - 安全检查，包含启用状态
      setPendingTools((agent.tools || []).map(tool => ({
        name: tool.name,
        enabled: tool.enabled !== false // 默认启用
      })));
      // 加载可用工具列表
      loadAvailableTools();
      setIsModalVisible(true);
    }
  };

  const handleAddTool = () => {
    if (!selectedTool) {
      message.warning(t('agents:tools.selectTool'));
      return;
    }
    
    if (pendingTools.some(tool => tool.name === selectedTool)) {
      message.warning(t('agents:tools.duplicateTool'));
      return;
    }
    
    setPendingTools(prev => [...prev, { name: selectedTool, enabled: true }]);
    setSelectedTool('');
  };

  const handleRemoveTool = (toolName: string) => {
    setPendingTools(prev => prev.filter(tool => tool.name !== toolName));
  };

  const handleToggleTool = (toolName: string, enabled: boolean) => {
    setPendingTools(prev => prev.map(tool => 
      tool.name === toolName ? { ...tool, enabled } : tool
    ));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (agent.id) {
        // 构建新的工具列表，包含启用状态
        const updatedTools = pendingTools.map(tool => ({ 
          name: tool.name, 
          enabled: tool.enabled 
        }));
        
        await updateAgent(agent.id, { tools: updatedTools });
        message.success(t('agents:tools.saveSuccess'));
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('Tools config save failed:', error);
      
      if (onError) {
        onError(error);
      } else {
        message.error(t('agents:tools.saveFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setPendingTools([]);
    setSelectedTool('');
  };

  // 获取可添加的工具列表
  const getAvailableToolsForSelect = () => {
    return availableTools.filter(tool => !pendingTools.some(pending => pending.name === tool.name));
  };

  // 检查是否有变更
  const hasChanges = () => {
    const agentTools = agent.tools || [];
    if (pendingTools.length !== agentTools.length) return true;
    
    return pendingTools.some(pending => {
      const original = agentTools.find(tool => tool.name === pending.name);
      if (!original) return true;
      return original.enabled !== pending.enabled;
    }) || agentTools.some(original => {
      return !pendingTools.some(pending => pending.name === original.name);
    });
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<ToolOutlined />}
        onClick={handleClick}
      >
        {children || t('agents:tools.button')}
      </Button>

      <Modal
        title={`${agent.name} - ${t('agents:tools.modalTitle')}`}
        open={isModalVisible}
        onOk={handleSaveChanges}
        onCancel={handleModalClose}
        width={650}
        okText={t('common:saveConfig')}
        cancelText={t('common:cancel')}
        confirmLoading={loading}
        okButtonProps={{ 
          icon: <CheckOutlined />,
          disabled: !hasChanges()
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 添加工具区域 */}
          <div>
            <Space style={{ width: '100%' }}>
              <Select
                style={{ flex: 1, minWidth: 200 }}
                placeholder={t('agents:tools.selectPlaceholder')}
                value={selectedTool}
                onChange={setSelectedTool}
                allowClear
                loading={toolsLoading}
                optionLabelProp="label"
              >
                {getAvailableToolsForSelect().map(tool => (
                  <Select.Option 
                    key={tool.name} 
                    value={tool.name}
                    label={tool.name}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{tool.name}</div>
                      {tool.description && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: colors.bodyMuted, 
                          marginTop: '2px',
                          lineHeight: '1.4'
                        }}>
                          {tool.description}
                        </div>
                      )}
                    </div>
                  </Select.Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddTool}
                disabled={!selectedTool}
              >
                {t('common:add')}
              </Button>
            </Space>
          </div>

          {/* 工具列表区域 */}
          <div>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              {t('agents:tools.listTitle', { count: pendingTools.length })}
            </Text>
            <div style={{ 
              border: `1px solid ${colors.dividerSoft}`, 
              borderRadius: 6, 
              padding: 16,
              minHeight: 200,
              maxHeight: 300,
              overflow: 'auto',
              background: colors.surfacePearl
            }}>
              {pendingTools.length > 0 ? (
                <List
                  dataSource={pendingTools}
                  renderItem={(tool, index) => {
                    const toolInfo = availableTools.find(availableTool => availableTool.name === tool.name);
                    return (
                      <List.Item
                        style={{ 
                          padding: '12px 0',
                          borderBottom: index < pendingTools.length - 1 ? `1px solid ${colors.dividerSoft}` : 'none'
                        }}
                        actions={[
                          <Checkbox
                            key="toggle"
                            checked={tool.enabled}
                            onChange={(e) => handleToggleTool(tool.name, e.target.checked)}
                          >
                            {t('agents:tools.enabled')}
                          </Checkbox>,
                          <Button
                            key="remove"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveTool(tool.name)}
                          >
                            {t('agents:tools.remove')}
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <ToolOutlined 
                              style={{ 
                                fontSize: '16px',
                                color: tool.enabled ? colors.primary : colors.borderDefault
                              }} 
                            />
                          }
                          title={
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                {tool.name}
                              </span>
                            </div>
                          }
                          description={
                            toolInfo?.description && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: colors.bodyMuted, 
                                lineHeight: '1.4'
                              }}>
                                {toolInfo.description}
                              </div>
                            )
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: colors.bodyMuted, 
                  padding: '40px 0' 
                }}>
                  {t('agents:tools.empty')}
                </div>
              )}
            </div>
          </div>

          {/* 变更提示 */}
          {hasChanges() && (
            <div style={commonStyles.infoBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('common:changeDetected')}
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default ToolsButton;
