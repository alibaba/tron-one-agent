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
import { Button, Modal, Form, Input, Switch, Row, Col, Space, message, InputNumber, Divider } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { AnyKnowledgeBaseConfig, ElasticSearchKnowledgeBaseConfig } from '../../../types/kb.interface';
import { KnowledgeBaseType } from '../../../types/common.interface';
import { createKb, updateKb } from '../../../services/kb';
import { Select } from 'antd';

interface KbManageButtonProps {
  editingKb?: AnyKnowledgeBaseConfig | null;
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
  const [selectedType, setSelectedType] = useState<KnowledgeBaseType>(KnowledgeBaseType.BAILIAN);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (editingKb) {
        setSelectedType(editingKb.type);
        // 展开 embeddingModelConfig 到表单顶层
        const esConfig = editingKb.type === KnowledgeBaseType.ELASTIC_SEARCH
          ? (editingKb as ElasticSearchKnowledgeBaseConfig)
          : null;
        form.setFieldsValue({
          ...editingKb,
          // Embedding 模型字段展开（方便编辑）
          embApiKey: esConfig?.embeddingModelConfig?.apiKey,
          embBaseUrl: esConfig?.embeddingModelConfig?.baseUrl,
          embModelName: esConfig?.embeddingModelConfig?.modelName,
          embDimensions: esConfig?.embeddingModelConfig?.dimensions,
        });
      } else {
        form.resetFields();
        setSelectedType(KnowledgeBaseType.BAILIAN);
        form.setFieldsValue({
          type: KnowledgeBaseType.BAILIAN,
          enabled: true,
          enableRewrite: true,
          enableRerank: true,
        });
      }
    }
  }, [visible, editingKb, form]);

  const handleClick = () => {
    setVisible(true);
  };

  const handleTypeChange = (type: KnowledgeBaseType) => {
    setSelectedType(type);
    form.setFieldsValue({ type });
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      const values = await form.validateFields();

      if (values.type === KnowledgeBaseType.ELASTIC_SEARCH) {
        // 构建 ES 知识库配置
        const kbData: any = {
          id: values.id,
          name: values.name,
          type: values.type,
          enabled: values.enabled ?? true,
          url: values.url,
          username: values.username || undefined,
          password: values.password || undefined,
          indexName: values.indexName,
          dimensions: values.dimensions,
          embeddingModelConfig: {
            apiKey: values.embApiKey || undefined,
            baseUrl: values.embBaseUrl || undefined,
            modelName: values.embModelName || undefined,
            dimensions: values.embDimensions,
          },
        };

        if (editingKb) {
          await updateKb(editingKb.id, kbData);
          message.success('知识库更新成功');
        } else {
          await createKb(kbData);
          message.success('知识库创建成功');
        }
      } else {
        // 构建 Bailian 知识库配置
        const kbData: any = {
          ...values,
          type: values.type || KnowledgeBaseType.BAILIAN,
          enabled: values.enabled ?? true,
          enableRewrite: values.enableRewrite ?? true,
          enableRerank: values.enableRerank ?? true,
        };

        if (editingKb) {
          await updateKb(editingKb.id, kbData);
          message.success('知识库更新成功');
        } else {
          await createKb(kbData);
          message.success('知识库创建成功');
        }
      }

      setVisible(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请重试');

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
        width={700}
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
            <Select
              placeholder="请选择知识库类型"
              disabled={!!editingKb}
              onChange={handleTypeChange}
            >
              <Select.Option value={KnowledgeBaseType.BAILIAN}>
                Bailian 知识库
              </Select.Option>
              <Select.Option value={KnowledgeBaseType.ELASTIC_SEARCH}>
                ElasticSearch 知识库
              </Select.Option>
            </Select>
          </Form.Item>

          {/* ========== Bailian 类型字段 ========== */}
          {selectedType === KnowledgeBaseType.BAILIAN && (
            <>
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
            </>
          )}

          {/* ========== ElasticSearch 类型字段 ========== */}
          {selectedType === KnowledgeBaseType.ELASTIC_SEARCH && (
            <>
              <Form.Item
                name="url"
                label="ElasticSearch 地址"
                rules={[{ required: true, message: '请输入 ElasticSearch 服务地址' }]}
                tooltip="例如: http://localhost:9200"
              >
                <Input placeholder="http://localhost:9200" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    tooltip="可选，如果 ES 不需要认证则留空"
                  >
                    <Input placeholder="ES 用户名（可选）" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="密码"
                    tooltip="支持 $os{ENV_VAR} 环境变量格式"
                  >
                    <Input.Password placeholder="ES 密码" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="indexName"
                label="索引名称"
                rules={[{ required: true, message: '请输入 ES 索引名称' }]}
              >
                <Input placeholder="请输入索引名称" />
              </Form.Item>

              <Form.Item
                name="dimensions"
                label="向量维度"
                tooltip="向量维度，需要和 Embedding 模型匹配"
              >
                <InputNumber
                  placeholder="例如: 1024"
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain style={{ fontSize: 13, marginTop: 8 }}>
                Embedding 模型配置
              </Divider>

              <Form.Item
                name="embApiKey"
                label="Embedding API Key"
                tooltip="DashScope API Key，支持 $os{ENV_VAR} 环境变量格式"
              >
                <Input.Password placeholder="DashScope API Key" />
              </Form.Item>

              <Form.Item
                name="embBaseUrl"
                label="Embedding Base URL"
                tooltip="可选，自定义 Embedding 服务地址"
              >
                <Input placeholder="自定义 Base URL（可选）" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="embModelName"
                    label="Embedding 模型名称"
                  >
                    <Input placeholder="例如: text-embedding-v3" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="embDimensions"
                    label="Embedding 维度"
                    tooltip="可选，如不填写则继承上层维度配置"
                  >
                    <InputNumber
                      placeholder="例如: 1024"
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default KbManageButton;
