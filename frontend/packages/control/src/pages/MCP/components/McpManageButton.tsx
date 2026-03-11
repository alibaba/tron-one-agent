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
import { Button, Modal, Form, Input, Select, Row, Col, Divider, Space, Switch, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined, EditOutlined } from '@ant-design/icons';
import { McpClientConfig } from '../../../types/mcp.interface';
import { createMcp, updateMcp } from '../../../services/mcp';

const { TextArea } = Input;

interface McpManageButtonProps {
  editingMcp?: McpClientConfig | null;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  loading?: boolean;
  children?: React.ReactNode;
  buttonType?: 'primary' | 'link' | 'default';
  size?: 'small' | 'middle' | 'large';
}

const McpManageButton: React.FC<McpManageButtonProps> = ({
  editingMcp = null,
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
      if (editingMcp) {
        // 编辑模式：转换headers对象为数组格式
        const headersList = Object.entries(editingMcp.headers || {}).map(([key, value]) => ({
          key,
          value
        }));
        
        form.setFieldsValue({
          ...editingMcp,
          headersList
        });
      } else {
        // 新增模式：设置默认值
        form.resetFields();
        form.setFieldsValue({
          enabled: true,
          transport: 'sse',
          timeout: 30,
          sse_read_timeout: 300,
          headersList: [{ key: 'Content-Type', value: 'application/json' }],
        });
      }
    }
  }, [visible, editingMcp, form]);

  const handleClick = () => {
    setVisible(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      const values = await form.validateFields();
      
      // 转换headersList数组为headers对象
      const headers: Record<string, string> = {};
      if (values.headersList && Array.isArray(values.headersList)) {
        values.headersList.forEach((header: { key: string; value: string }) => {
          if (header.key && header.value) {
            headers[header.key] = header.value;
          }
        });
      }
      
      const mcpData = {
        ...values,
        headers,
        timeout: values.timeout || 30,
        sse_read_timeout: values.sse_read_timeout || 300,
      };
      
      // 移除headersList字段，因为它只是用于表单的临时字段
      delete mcpData.headersList;
      
      // 调用API
      if (editingMcp) {
        // 编辑模式
        await updateMcp(editingMcp.id, mcpData);
        message.success('MCP客户端更新成功');
      } else {
        // 新增模式
        await createMcp(mcpData);
        message.success('MCP客户端创建成功');
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
    if (editingMcp) {
      return <EditOutlined />;
    }
    return <PlusOutlined />;
  };

  const getButtonText = () => {
    if (children) {
      return children;
    }
    return editingMcp ? '编辑MCP客户端' : '新增MCP客户端';
  };

  const getModalTitle = () => {
    return editingMcp ? '编辑MCP客户端' : '新增MCP客户端';
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
        width={800}
        confirmLoading={submitLoading || loading}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="id"
                label="标识"
                rules={[{ required: true, message: '请输入MCP客户端标识' }]}
              >
                <Input 
                  placeholder="请输入MCP客户端唯一标识" 
                  disabled={!!editingMcp}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="名称"
                rules={[{ required: true, message: '请输入MCP客户端名称' }]}
              >
                <Input placeholder="请输入MCP客户端名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="transport"
                label="传输方式"
                rules={[{ required: true, message: '请选择传输方式' }]}
              >
                <Select placeholder="请选择传输方式">
                  <Select.Option value="sse">SSE</Select.Option>
                  <Select.Option value="streamable_http">Streamable HTTP</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="url"
                label="URL地址"
                rules={[{ required: true, message: '请输入URL' }]}
              >
                <Input placeholder="请输入MCP服务地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeout" label="超时时间(秒)">
                <Input type="number" placeholder="默认30秒" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sse_read_timeout" label="SSE读取超时(秒)">
                <Input type="number" placeholder="默认300秒" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={3} placeholder="请输入MCP客户端描述信息" />
          </Form.Item>

          <Row>
            <Col span={24}>
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                <Space>
                  <Switch />
                  <span style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    开启后该MCP客户端将立即生效
                  </span>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">请求头配置</Divider>
          
          <Form.List name="headersList">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: '请输入Header键名' }]}
                      >
                        <Input placeholder="Header键名 (如: Content-Type)" />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入Header值' }]}
                      >
                        <Input placeholder="Header值 (如: application/json)" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加Header
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
};

export default McpManageButton;
