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
import { Button, Modal, List, Tag, Typography, message, Select, Space, Checkbox } from 'antd';
import { ToolOutlined, PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';
import { getAllTools } from '../../../services/tools';
import { AgentToolConfig } from '../../../types/tool.interface';

const { Text } = Typography;

interface ToolsButtonProps {
  agent: AgentConfig;
  onManageTools?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const ToolsButton: React.FC<ToolsButtonProps> = ({ agent, onManageTools, onSuccess, onError, children }) => {
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
      console.error('加载工具列表失败:', error);
      message.error('加载工具列表失败');
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
      message.warning('请选择要添加的工具');
      return;
    }
    
    if (pendingTools.some(tool => tool.name === selectedTool)) {
      message.warning('该工具已存在');
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
        message.success('工具配置保存成功');
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('工具配置保存失败:', error);
      
      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error('工具配置保存失败，请重试');
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
        {children || '工具'}
      </Button>

      <Modal
        title={`${agent.name} - 工具管理`}
        open={isModalVisible}
        onOk={handleSaveChanges}
        onCancel={handleModalClose}
        width={650}
        okText="保存配置"
        cancelText="取消"
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
                placeholder="选择要添加的工具"
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
                          color: '#8c8c8c', 
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
                添加
              </Button>
            </Space>
          </div>

          {/* 工具列表区域 */}
          <div>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              工具 ({pendingTools.length}个)：
            </Text>
            <div style={{ 
              border: '1px solid #f0f0f0', 
              borderRadius: 6, 
              padding: 16,
              minHeight: 200,
              maxHeight: 300,
              overflow: 'auto',
              background: '#fafafa'
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
                          borderBottom: index < pendingTools.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                        actions={[
                          <Checkbox
                            key="toggle"
                            checked={tool.enabled}
                            onChange={(e) => handleToggleTool(tool.name, e.target.checked)}
                          >
                            启用
                          </Checkbox>,
                          <Button
                            key="remove"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveTool(tool.name)}
                          >
                            移除
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <ToolOutlined 
                              style={{ 
                                fontSize: '16px',
                                color: tool.enabled ? '#1890ff' : '#d9d9d9'
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
                                color: '#8c8c8c', 
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
                  color: '#999', 
                  padding: '40px 0' 
                }}>
                  暂无配置工具
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
    </>
  );
};

export default ToolsButton;
