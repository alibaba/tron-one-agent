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
import { Button, Modal, Form, Input, Switch, Row, Col, Space, message, Alert } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { BailianKnowledgeBaseConfig } from '../../../types/kb.interface';
import { KnowledgeBaseType } from '../../../types/common.interface';
import { createKb, updateKb } from '../../../services/kb';
import { Select } from 'antd';

interface KbManageButtonProps {
  editingKb?: BailianKnowledgeBaseConfig | null;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  loading?: boolean;
  children?: React.ReactNode;
  buttonType?: 'primary' | 'link' | 'default';
  size?: 'small' | 'middle' | 'large';
}

const KbManageButton: React.FC<KbManageButtonProps> = ({
  editingKb = null,
  onSuccess,
  onError,
  loading = false,
  children,
  buttonType = 'primary',
  size = 'middle'
}) => {
  const [visible, setVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (editingKb) {
        // 编辑模式：设置表单值
        form.setFieldsValue(editingKb);
      } else {
        // 新增模式：设置默认值
        form.resetFields();
        form.setFieldsValue({
          type: KnowledgeBaseType.BAILIAN,
          enabled: true,
          enableRewrite: true,
          enableRerank: true,
          apiKey: '$os{Bailian_Knowledge_Api_key}',
        });
      }
    }
  }, [visible, editingKb, form]);

  const handleClick = () => {
    setVisible(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      const values = await form.validateFields();
      
      const kbData = {
        ...values,
        // type: 'BAILIAN',
        type: values.type || KnowledgeBaseType.BAILIAN,
        enabled: values.enabled ?? true,
        enableRewrite: values.enableRewrite ?? true,
        enableRerank: values.enableRerank ?? true,
      };
      
      // 调用API
      if (editingKb) {
        // 编辑模式
        await updateKb(editingKb.id, kbData);
        message.success('知识库更新成功');
      } else {
        // 新增模式
        await createKb(kbData);
        message.success('知识库创建成功');
      }
      
      setVisible(false);
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请重试');
      
      // 调用错误回调
      if (onError) {
        onError(error);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
  };

  const getButtonIcon = () => {
    if (editingKb) {
      return <EditOutlined />;
    }
    return <PlusOutlined />;
  };

  const getButtonText = () => {
    if (children) {
      return children;
    }
    return editingKb ? '编辑知识库' : '新增知识库';
  };

  const getModalTitle = () => {
    return editingKb ? '编辑知识库' : '新增知识库';
  };

  return (
    <>
      <Button 
        type={buttonType} 
        size={size}
        icon={getButtonIcon()} 
        onClick={handleClick}
      >
        {getButtonText()}
      </Button>

      <Modal
        title={getModalTitle()}
        open={visible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
        confirmLoading={submitLoading || loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="id"
            label="知识库ID"
            rules={[{ required: true, message: '请输入知识库ID' }]}
          >
            <Input 
              placeholder="请输入知识库唯一标识" 
              disabled={!!editingKb}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="知识库名称"
            rules={[{ required: true, message: '请输入知识库名称' }]}
          >
            <Input placeholder="请输入知识库名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="知识库类型"
            rules={[{ required: true, message: '请选择知识库类型' }]}
          >
            <Select placeholder="请选择知识库类型" disabled={!!editingKb}>
              <Select.Option value={KnowledgeBaseType.BAILIAN}>
                Bailian 知识库
              </Select.Option>
            </Select>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="workspaceId"
                label="工作空间ID"
                rules={[{ required: true, message: '请输入工作空间ID' }]}
              >
                <Input placeholder="请输入工作空间ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="indexId"
                label="索引ID"
                rules={[{ required: true, message: '请输入索引ID' }]}
              >
                <Input placeholder="请输入索引ID" />
              </Form.Item>
            </Col>
          </Row>

          {/* <Form.Item
            name="apiKey"
            label={
              <Space>
                <span>API Key</span>
                <Alert
                  message="使用 $os{Bailian_Knowledge_Api_Key} 格式可从环境变量获取 API Key"
                  type="info"
                  showIcon
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                />
              </Space>
            }
            rules={[{ required: true, message: '请输入百炼知识库API Key 或 推荐使用：环境变量格式' }]}
          >
            <Input 
              placeholder="请输入百炼知识库API Key 或 推荐使用：环境变量格式" 
            />
          </Form.Item> */}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                  <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enableRewrite" label="启用重写" valuePropName="checked">
                  <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enableRerank" label="启用重排" valuePropName="checked">
                  <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default KbManageButton;
