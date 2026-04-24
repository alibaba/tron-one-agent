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
import { Button, Modal, Form, Switch, Radio, Space, Typography, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';

const { Text } = Typography;

interface MemoryButtonProps {
  agent: AgentConfig;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const MemoryButton: React.FC<MemoryButtonProps> = ({ agent, onSuccess, onError, children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleClick = () => {
    form.setFieldsValue({
      enableLongTermMemory: agent.enableLongTermMemory ?? true,
      longTermMemoryMode: agent.longTermMemoryMode || 'BOTH',
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (agent.id) {
        await updateAgent(agent.id, {
          enableLongTermMemory: values.enableLongTermMemory,
          longTermMemoryMode: values.enableLongTermMemory ? values.longTermMemoryMode : undefined,
        });
        message.success('长期记忆配置保存成功');

        if (onSuccess) {
          onSuccess(agent);
        }

        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      if (onError) {
        onError(error);
      } else {
        message.error('保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<BulbOutlined />}
        onClick={handleClick}
      >
        {children || '长期记忆'}
      </Button>

      <Modal
        title={`${agent.name} - 长期记忆配置`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={500}
        okText="保存配置"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="enableLongTermMemory"
            label="启用长期记忆"
            valuePropName="checked"
            tooltip="开启后Agent将具备长期记忆能力，能跨会话记住用户信息"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.enableLongTermMemory !== curr.enableLongTermMemory}
          >
            {({ getFieldValue }) => {
              const enabled = getFieldValue('enableLongTermMemory');
              return enabled ? (
                <Form.Item
                  name="longTermMemoryMode"
                  label="记忆模式"
                  rules={[{ required: true, message: '请选择记忆模式' }]}
                  tooltip="RECALL: 仅检索记忆 | WRITE: 仅写入记忆 | BOTH: 同时支持读写"
                >
                  <Radio.Group>
                    <Radio value="RECALL">
                      <Space direction="vertical" size={0}>
                        <Text>仅检索 (RECALL)</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Agent只读取长期记忆，不写入新内容</Text>
                      </Space>
                    </Radio>
                    <Radio value="WRITE">
                      <Space direction="vertical" size={0}>
                        <Text>仅写入 (WRITE)</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Agent只写入长期记忆，不读取已有内容</Text>
                      </Space>
                    </Radio>
                    <Radio value="BOTH">
                      <Space direction="vertical" size={0}>
                        <Text>读写 (BOTH)</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Agent同时支持读写长期记忆（推荐）</Text>
                      </Space>
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <div style={{ padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 长期记忆能让Agent记住用户的偏好、历史对话中的关键信息，提供更个性化的服务。
              需要先在"长期记忆管理"中配置记忆库。
            </Text>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default MemoryButton;
