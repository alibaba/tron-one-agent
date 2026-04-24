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


import React, { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Typography, message, Space, Tabs, Form, Select, Input, Switch, Divider } from 'antd';
import { MessageOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { ChatModelConfig } from '../../../types/chat-model.interface';
import { ChatModelType } from '../../../types/common.interface';
import { updateAgent } from '../../../services/agent';

const { Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const CHAT_MODEL_TYPE_OPTIONS = [
  { value: ChatModelType.DASHSCOPE, label: 'DashScope' },
  { value: ChatModelType.OPENAI_COMPATIBLE, label: 'OpenAI Compatible' },
];

const getDefaultModelConfig = (): ChatModelConfig => ({
  type: ChatModelType.OPENAI_COMPATIBLE,
  apiKey: "",
  modelName: "",
  baseUrl: "",
  stream: true,
  thinking: false,
  generateKwargs: {},
});

interface ChatConfigButtonProps {
  agent: AgentConfig;
  onManageChatConfig?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const ModelConfigForm: React.FC<{
  config: ChatModelConfig;
  onChange: (config: ChatModelConfig) => void;
}> = ({ config, onChange }) => {
  const [kwargsJson, setKwargsJson] = useState(
    config.generateKwargs ? JSON.stringify(config.generateKwargs, null, 2) : '{}'
  );
  const [kwargsError, setKwargsError] = useState('');
  const isInternalEditRef = React.useRef(false);

  useEffect(() => {
    if (isInternalEditRef.current) {
      isInternalEditRef.current = false;
      return;
    }
    const jsonStr = config.generateKwargs ? JSON.stringify(config.generateKwargs, null, 2) : '{}';
    setKwargsJson(jsonStr);
    setKwargsError('');
  }, [config.generateKwargs]);

  const updateField = useCallback(<K extends keyof ChatModelConfig>(key: K, value: ChatModelConfig[K]) => {
    onChange({ ...config, [key]: value });
  }, [config, onChange]);

  const handleKwargsChange = useCallback((value: string) => {
    setKwargsJson(value);
    try {
      const parsed = JSON.parse(value);
      setKwargsError('');
      isInternalEditRef.current = true;
      onChange({ ...config, generateKwargs: parsed });
    } catch {
      setKwargsError('JSON 格式错误');
    }
  }, [config, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Form layout="vertical" size="small">
        <Form.Item label="模型类型" style={{ marginBottom: 12 }}>
          <Select
            value={config.type}
            onChange={(v) => updateField('type', v)}
            options={CHAT_MODEL_TYPE_OPTIONS}
          />
        </Form.Item>

        <Form.Item label="API Key" style={{ marginBottom: 12 }}>
          <Input.Password
            value={config.apiKey || ''}
            onChange={(e) => updateField('apiKey', e.target.value)}
            placeholder="输入 API Key"
          />
        </Form.Item>

        <Form.Item label="模型名称" style={{ marginBottom: 12 }}>
          <Input
            value={config.modelName || ''}
            onChange={(e) => updateField('modelName', e.target.value)}
            placeholder="例如 qwen3-max, gpt-4"
          />
        </Form.Item>

        <Form.Item label="Base URL" style={{ marginBottom: 12 }}>
          <Input
            value={config.baseUrl || ''}
            onChange={(e) => updateField('baseUrl', e.target.value)}
            placeholder="OpenAI Compatible 类型必填"
          />
        </Form.Item>

        <Form.Item label="流式输出" style={{ marginBottom: 12 }}>
          <Switch
            checked={config.stream !== false}
            onChange={(v) => updateField('stream', v)}
          />
        </Form.Item>

        <Form.Item label="深度思考" style={{ marginBottom: 12 }}>
          <Switch
            checked={config.thinking === true}
            onChange={(v) => updateField('thinking', v)}
          />
        </Form.Item>
      </Form>

      <Divider style={{ margin: '4px 0' }} />

      <div>
        <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>
          Generate Kwargs
        </Text>
        <div style={{
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{
            backgroundColor: '#37474f',
            color: '#90a4ae',
            padding: '10px 8px',
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            textAlign: 'right',
            minWidth: '40px',
            borderRight: '1px solid #455a64',
            userSelect: 'none'
          }}>
            {kwargsJson.split('\n').map((_: string, index: number) => (
              <div key={index + 1} style={{ height: '19.5px' }}>
                {index + 1}
              </div>
            ))}
          </div>
          <TextArea
            value={kwargsJson}
            onChange={(e) => handleKwargsChange(e.target.value)}
            style={{
              flex: 1,
              minHeight: '120px',
              padding: '10px',
              border: 'none',
              outline: 'none',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              resize: 'vertical',
              backgroundColor: '#263238',
              color: '#eeffff',
            }}
            placeholder="{}"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        {kwargsError && (
          <div style={{
            marginTop: 4,
            padding: '6px 10px',
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            color: '#ff4d4f',
            fontSize: 12,
          }}>
            {kwargsError}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [chatConfig, setChatConfig] = useState<ChatModelConfig>(getDefaultModelConfig());
  const [fastChatConfig, setFastChatConfig] = useState<ChatModelConfig>(getDefaultModelConfig());

  const handleClick = () => {
    if (onManageChatConfig) {
      onManageChatConfig(agent);
    } else {
      setChatConfig(agent.chatModel || getDefaultModelConfig());
      setFastChatConfig(agent.fastChatModel || getDefaultModelConfig());
      setActiveTab('chat');
      setIsModalVisible(true);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (agent.id) {
        await updateAgent(agent.id, {
          chatModel: chatConfig,
          fastChatModel: fastChatConfig
        });
        message.success('模型配置保存成功');

        if (onSuccess) {
          onSuccess(agent);
        }

        setIsModalVisible(false);
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('模型配置保存失败:', error);

      if (onError) {
        onError(error);
      } else {
        message.error('模型配置保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(agent.chatModel || {}) !== JSON.stringify(chatConfig) ||
           JSON.stringify(agent.fastChatModel || {}) !== JSON.stringify(fastChatConfig);
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
        onCancel={() => setIsModalVisible(false)}
        width={700}
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
            <ModelConfigForm config={chatConfig} onChange={setChatConfig} />
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
            <ModelConfigForm config={fastChatConfig} onChange={setFastChatConfig} />
          </TabPane>
        </Tabs>
      </Modal>
    </>
  );
};

export default ChatConfigButton;
