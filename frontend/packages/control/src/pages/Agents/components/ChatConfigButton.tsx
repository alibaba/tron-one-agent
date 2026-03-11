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
import { Button, Modal, Typography, message, Space } from 'antd';
import { MessageOutlined, CheckOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';

const { Text } = Typography;

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
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleClick = () => {
    if (onManageChatConfig) {
      onManageChatConfig(agent);
    } else {
      // 初始化JSON内容
      const initialContent = agent.chatModel 
        ? JSON.stringify(agent.chatModel, null, 2)
        : JSON.stringify({
            type: 1,
            api_key: "",
            model_name: "",
            base_url: "",
            stream: true,
            generate_kwargs: {},
            kwargs: {}
          }, null, 2);
      
      setJsonContent(initialContent);
      setJsonError('');
      setIsModalVisible(true);
    }
  };

  const validateJson = (content: string) => {
    try {
      JSON.parse(content);
      setJsonError('');
      return true;
    } catch (error) {
      setJsonError(`JSON格式错误: ${(error as Error).message}`);
      return false;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonContent(value);
    // 移除实时校验，只在保存时校验
    setJsonError('');
  };

  const handleSave = async () => {
    // 保存时进行JSON格式校验
    if (!validateJson(jsonContent)) {
      return; // 错误信息已在validateJson中设置，直接返回
    }

    try {
      setLoading(true);
      const chatModelConfig = JSON.parse(jsonContent);
      
      if (agent.id) {
        await updateAgent(agent.id, { chatModel: chatModelConfig });
        message.success('ChatModel配置保存成功');
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('ChatModel配置保存失败:', error);
      
      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error('ChatModel配置保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setJsonContent('');
    setJsonError('');
  };

  // 检查是否有变更
  const hasChanges = () => {
    try {
      // 解析新的配置内容
      const newConfig = JSON.parse(jsonContent);
      
      // 获取当前配置，如果为空则使用默认结构
      const currentConfig = agent.chatModel || {};
      
      // 深度比较配置对象
      return JSON.stringify(currentConfig) !== JSON.stringify(newConfig);
    } catch {
      // JSON解析失败时，如果有内容变化也允许尝试保存（让保存时校验处理）
      const initialContent = agent.chatModel 
        ? JSON.stringify(agent.chatModel, null, 2)
        : JSON.stringify({
            type: 1,
            api_key: "",
            model_name: "",
            base_url: "",
            stream: true,
            generate_kwargs: {},
            kwargs: {}
          }, null, 2);
      return jsonContent !== initialContent;
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
        title={`${agent.name} - ChatModel配置`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleModalClose}
        width={800}
        style={{ top: 20 }}
        okText="保存配置"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{ 
          icon: <CheckOutlined />,
          disabled: !hasChanges()
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              Chat模型配置 (JSON格式)：
            </Text>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
              配置聊天模型的相关参数，包括API密钥、模型名称、基础URL等
            </Text>
          </div>

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
              {jsonContent.split('\n').map((_, index) => (
                <div key={index + 1} style={{ height: '21px' }}>
                  {index + 1}
                </div>
              ))}
            </div>
            {/* 代码编辑区域 */}
            <textarea
              value={jsonContent}
              onChange={handleJsonChange}
              onKeyDown={(e) => {
                // 处理Tab键插入缩进
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const target = e.target as HTMLTextAreaElement;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const value = target.value;
                  
                  // 插入两个空格作为缩进
                  const newValue = value.substring(0, start) + '  ' + value.substring(end);
                  
                  // 直接更新值和光标位置
                  target.value = newValue;
                  target.selectionStart = target.selectionEnd = start + 2;
                  
                  // 触发onChange事件以更新状态
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

          {jsonError && (
            <div style={{ 
              padding: 12, 
              background: '#fff2f0', 
              border: '1px solid #ffccc7',
              borderRadius: 6,
              color: '#ff4d4f'
            }}>
              <Text type="danger" style={{ fontSize: 12 }}>
                {jsonError}
              </Text>
            </div>
          )}

          {!jsonError && hasChanges() && (
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

          <div style={{ 
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
        </Space>
      </Modal>
    </>
  );
};

export default ChatConfigButton;
