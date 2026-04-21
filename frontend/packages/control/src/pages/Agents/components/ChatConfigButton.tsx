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
import { Button, Modal, Typography, message, Space, Tabs } from 'antd';
import { MessageOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';

const { Text } = Typography;
const { TabPane } = Tabs;

interface ChatConfigButtonProps {
  agent: AgentConfig;
  onManageChatConfig?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const ChatConfigButton: React.FC<ChatConfigButtonProps> = ({ 
  agent, 
  onManageChatConfig, 
  onSuccess, 
  onError, 
  children 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatJsonContent, setChatJsonContent] = useState('');
  const [fastChatJsonContent, setFastChatJsonContent] = useState('');
  const [chatJsonError, setChatJsonError] = useState('');
  const [fastChatJsonError, setFastChatJsonError] = useState('');

  const getDefaultModelConfig = () => ({
    type: 1,
    api_key: "",
    model_name: "",
    base_url: "",
    stream: true,
    generate_kwargs: {},
    kwargs: {}
  });

  const handleClick = () => {
    if (onManageChatConfig) {
      onManageChatConfig(agent);
    } else {
      // 初始化JSON内容
      const chatContent = agent.chatModel 
        ? JSON.stringify(agent.chatModel, null, 2)
        : JSON.stringify(getDefaultModelConfig(), null, 2);
      
      const fastChatContent = agent.fastChatModel 
        ? JSON.stringify(agent.fastChatModel, null, 2)
        : JSON.stringify(getDefaultModelConfig(), null, 2);
      
      setChatJsonContent(chatContent);
      setFastChatJsonContent(fastChatContent);
      setChatJsonError('');
      setFastChatJsonError('');
      setActiveTab('chat');
      setIsModalVisible(true);
    }
  };

  const validateJson = (content: string, type: 'chat' | 'fast') => {
    try {
      JSON.parse(content);
      if (type === 'chat') {
        setChatJsonError('');
      } else {
        setFastChatJsonError('');
      }
      return true;
    } catch (error) {
      if (type === 'chat') {
        setChatJsonError(`JSON格式错误: ${(error as Error).message}`);
      } else {
        setFastChatJsonError(`JSON格式错误: ${(error as Error).message}`);
      }
      return false;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>, type: 'chat' | 'fast') => {
    const value = e.target.value;
    if (type === 'chat') {
      setChatJsonContent(value);
      setChatJsonError('');
    } else {
      setFastChatJsonContent(value);
      setFastChatJsonError('');
    }
  };

  const handleSave = async () => {
    // 保存时进行JSON格式校验
    const chatValid = validateJson(chatJsonContent, 'chat');
    const fastChatValid = validateJson(fastChatJsonContent, 'fast');
    
    if (!chatValid || !fastChatValid) {
      return;
    }

    try {
      setLoading(true);
      const chatModelConfig = JSON.parse(chatJsonContent);
      const fastChatModelConfig = JSON.parse(fastChatJsonContent);
      
      if (agent.id) {
        await updateAgent(agent.id, { 
          chatModel: chatModelConfig,
          fastChatModel: fastChatModelConfig
        });
        message.success('模型配置保存成功');
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('模型配置保存失败:', error);
      
      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error('模型配置保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setChatJsonContent('');
    setFastChatJsonContent('');
    setChatJsonError('');
    setFastChatJsonError('');
  };

  // 渲染JSON编辑器组件
  const renderJsonEditor = (content: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, error: string) => {
    return (
      <>
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: 6,
          overflow: 'hidden',
          display: 'flex'
        }}>
          {/* 行号区域 */}
          <div style={{
            backgroundColor: '#37474f',
            color: '#90a4ae',
            padding: '12px 8px',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            textAlign: 'right',
            minWidth: '50px',
            borderRight: '1px solid #455a64',
            userSelect: 'none'
          }}>
            {content.split('\n').map((_: string, index: number) => (
              <div key={index + 1} style={{ height: '21px' }}>
                {index + 1}
              </div>
            ))}
          </div>
          {/* 代码编辑区域 */}
          <textarea
            value={content}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const value = target.value;
                const newValue = value.substring(0, start) + '  ' + value.substring(end);
                target.value = newValue;
                target.selectionStart = target.selectionEnd = start + 2;
                const event = new Event('input', { bubbles: true });
                target.dispatchEvent(event);
              }
            }}
            style={{
              flex: 1,
              height: '300px',
              padding: '12px',
              border: 'none',
              outline: 'none',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'vertical',
              backgroundColor: '#263238',
              color: '#eeffff',
            }}
            placeholder="请输入JSON配置..."
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        {error && (
          <div style={{ 
            padding: 12, 
            background: '#fff2f0', 
            border: '1px solid #ffccc7',
            borderRadius: 6,
            color: '#ff4d4f'
          }}>
            <Text type="danger" style={{ fontSize: 12 }}>
              {error}
            </Text>
          </div>
        )}

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
      </>
    );
  };

  // 检查是否有变更
  const hasChanges = () => {
    try {
      const newChatConfig = JSON.parse(chatJsonContent);
      const newFastChatConfig = JSON.parse(fastChatJsonContent);
      
      const currentChatConfig = agent.chatModel || {};
      const currentFastChatConfig = agent.fastChatModel || {};
      
      return JSON.stringify(currentChatConfig) !== JSON.stringify(newChatConfig) ||
             JSON.stringify(currentFastChatConfig) !== JSON.stringify(newFastChatConfig);
    } catch {
      const initialChatContent = agent.chatModel 
        ? JSON.stringify(agent.chatModel, null, 2)
        : JSON.stringify(getDefaultModelConfig(), null, 2);
      const initialFastChatContent = agent.fastChatModel 
        ? JSON.stringify(agent.fastChatModel, null, 2)
        : JSON.stringify(getDefaultModelConfig(), null, 2);
      return chatJsonContent !== initialChatContent || fastChatJsonContent !== initialFastChatContent;
    }
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<MessageOutlined />}
        onClick={handleClick}
      >
        {children || 'ChatModel配置'}
      </Button>

      <Modal
        title={`${agent.name} - 模型配置`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleModalClose}
        width={900}
        style={{ top: 20 }}
        okText="保存配置"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{ 
          icon: <CheckOutlined />,
          disabled: !hasChanges()
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <Space>
                <MessageOutlined />
                <span>ChatModel</span>
              </Space>
            } 
            key="chat"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  主聊天模型，用于主要的对话生成任务
                </Text>
              </div>
              {renderJsonEditor(chatJsonContent, (e) => handleJsonChange(e, 'chat'), chatJsonError)}
            </Space>
          </TabPane>
          <TabPane 
            tab={
              <Space>
                <ThunderboltOutlined />
                <span>FastChatModel</span>
              </Space>
            } 
            key="fast"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  快速聊天模型，用于生成建议、快速响应等场景（可选）
                </Text>
              </div>
              {renderJsonEditor(fastChatJsonContent, (e) => handleJsonChange(e, 'fast'), fastChatJsonError)}
            </Space>
          </TabPane>
        </Tabs>

        <div style={{ 
          marginTop: 16,
          padding: 12, 
          background: '#f5f5f5', 
          border: '1px solid #d9d9d9',
          borderRadius: 6 
        }}>
          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
            <strong>配置说明：</strong><br />
            • type: 模型类型 (1=DashScope, 2=OpenAI兼容)<br />
            • api_key: API密钥<br />
            • model_name: 模型名称<br />
            • base_url: 基础URL<br />
            • stream: 是否启用流式输出<br />
            • generate_kwargs: 生成参数<br />
            • kwargs: 其他参数
          </Text>
        </div>
      </Modal>
    </>
  );
};

export default ChatConfigButton;
