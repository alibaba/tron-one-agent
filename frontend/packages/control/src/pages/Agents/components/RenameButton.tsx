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
import { Button, Modal, Form, Input, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';

interface RenameButtonProps {
  agent: AgentConfig;
  onRename?: (agent: AgentConfig, newName: string) => void;
  onSuccess?: (agent: AgentConfig, newName: string) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const RenameButton: React.FC<RenameButtonProps> = ({ agent, onRename, onSuccess, onError, children }) => {
  const { t } = useTranslation(['agents', 'common']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleClick = () => {
    form.setFieldsValue({ name: agent.name });
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (onRename) {
        // 使用外部提供的重命名逻辑
        onRename(agent, values.name);
      } else {
        // 内置处理逻辑：调用API更新agent名称
        if (agent.id) {
          await updateAgent(agent.id, { name: values.name });
          message.success(t('agents:rename.success'));
        } else {
          throw new Error('Agent ID不存在');
        }
      }
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess(agent, values.name);
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Rename failed:', error);
      
      // 调用错误回调
      if (onError) {
        onError(error);
      } else {
        message.error(t('agents:rename.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        onClick={handleClick}
      >
        {children || t('agents:rename.button')}
      </Button>

        <Modal
          title={t('agents:rename.modalTitle')}
          open={isModalVisible}
          onOk={handleSubmit}
          onCancel={handleModalClose}
          width={400}
          okText={t('agents:rename.confirm')}
          cancelText={t('common:cancel')}
          confirmLoading={loading}
        >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('agents:rename.label')}
            rules={[{ required: true, message: t('agents:rename.required') }]}
          >
            <Input placeholder={t('agents:rename.placeholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RenameButton;
