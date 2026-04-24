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
import { Button, Modal, Form, Select, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { AgentConfig } from '../../../types/agent.interface';
import { LongTermMemoryConfig } from '../../../types/memory.interface';
import { updateAgent } from '../../../services/agent';
import { getAllMemories } from '../../../services/memory';

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
  const [memories, setMemories] = useState<LongTermMemoryConfig[]>([]);

  const loadMemories = async () => {
    try {
      const response = await getAllMemories();
      setMemories((response.data || []).filter((m: LongTermMemoryConfig) => m.enabled));
    } catch (error) {
      console.error('加载记忆配置列表失败:', error);
    }
  };

  const handleClick = () => {
    loadMemories();
    form.setFieldsValue({
      longTermMemoryId: agent.longTermMemoryId || undefined,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (agent.id) {
        await updateAgent(agent.id, {
          longTermMemoryId: values.longTermMemoryId || '',
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
            name="longTermMemoryId"
            label="关联记忆配置"
            tooltip="选择要关联的长期记忆配置，不选则自动使用第一个可用配置"
          >
            <Select
              allowClear
              placeholder="请选择记忆配置（可选）"
              options={memories.map(m => ({
                label: `${m.name} (${m.id})`,
                value: m.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MemoryButton;
