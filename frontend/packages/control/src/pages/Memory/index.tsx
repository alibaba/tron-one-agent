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
import { Table, Button, Space, Tag, Switch, Modal, Card, message, Tooltip, Form, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { LongTermMemoryConfig } from '../../types/memory.interface';
import { AgentConfig } from '../../types/agent.interface';
import { getAllMemories, createMemory, updateMemory, deleteMemory } from '../../services/memory';
import { getAllAgents } from '../../services/agent';
import { commonStyles } from '../../styles/tokens';
import memoryStyles from './index.module.less';

const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<LongTermMemoryConfig[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMemory, setEditingMemory] = useState<LongTermMemoryConfig | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const columns: ColumnsType<LongTermMemoryConfig> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '记忆库ID',
      dataIndex: 'memoryLibraryId',
      key: 'memoryLibraryId',
      render: (val: string) => val || '-',
    },
    {
      title: '项目ID',
      dataIndex: 'projectId',
      key: 'projectId',
      render: (val: string) => val || '-',
    },
    {
      title: '用户画像Schema',
      dataIndex: 'profileSchema',
      key: 'profileSchema',
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '已关联Agents',
      key: 'relatedAgents',
      render: (_, record: LongTermMemoryConfig) => {
        const relatedAgents = getRelatedAgents(record.id);
        return (
          <Tooltip
            title={relatedAgents.length > 0 ?
              `关联的Agents: ${relatedAgents.map(a => a.name).join(', ')}` :
              '暂无关联的Agents'
            }
          >
            <Tag icon={<TeamOutlined />} color={relatedAgents.length > 0 ? 'blue' : 'default'}>
              {relatedAgents.length}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: LongTermMemoryConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: LongTermMemoryConfig) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Tooltip
            title={getRelatedAgents(record.id).length > 0 ?
              `该记忆配置已被 ${getRelatedAgents(record.id).length} 个Agent关联，无法删除` :
              '删除记忆配置'
            }
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              disabled={getRelatedAgents(record.id).length > 0}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const loadMemories = async () => {
    try {
      setLoading(true);
      const response = await getAllMemories();
      setMemories(response.data || []);
    } catch (error) {
      console.error('加载长期记忆配置列表失败:', error);
      message.error('加载长期记忆配置列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsData = await getAllAgents() as any;
      setAgents(agentsData.data || []);
    } catch (error) {
      console.error('加载Agents列表失败:', error);
    }
  };

  const getRelatedAgents = (memoryId: string): AgentConfig[] => {
    return agents.filter(agent => agent.longTermMemoryId === memoryId);
  };

  useEffect(() => {
    loadMemories();
    loadAgents();
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMemory(id, { enabled });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
      message.success(`记忆配置已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败，请重试');
    }
  };

  const handleEdit = (memory: LongTermMemoryConfig) => {
    setEditingMemory(memory);
    form.setFieldsValue(memory);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditingMemory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingMemory) {
        await updateMemory(editingMemory.id, { ...values, type: editingMemory.type ?? 1 });
        message.success('记忆配置更新成功');
      } else {
        await createMemory({ ...values, type: 1 });
        message.success('记忆配置创建成功');
      }

      setModalVisible(false);
      loadMemories();
    } catch (error) {
      console.error('保存失败:', error);
      if (error instanceof Error) {
        message.error(error.message || '保存失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const memory = memories.find(m => m.id === id);
    Modal.confirm({
      title: '确认删除长期记忆配置',
      content: (
        <div>
          <p>您即将删除以下长期记忆配置：</p>
          <div style={{ ...commonStyles.confirmBox }}>
            <p><strong>名称：</strong>{memory?.name}</p>
            <p><strong>标识：</strong>{memory?.id}</p>
          </div>
          <p style={commonStyles.confirmWarning}>
            ⚠️ 此操作不可撤销，请确认是否继续？
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          await deleteMemory(id);
          setMemories(prev => prev.filter(m => m.id !== id));
          message.success('记忆配置删除成功');
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请重试');
        }
      },
    });
  };

  return (
    <div className={memoryStyles.container}>
      <Card title="长期记忆管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadMemories} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增配置
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={memories}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingMemory ? '编辑长期记忆配置' : '新增长期记忆配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingMemory(null);
          form.resetFields();
        }}
        confirmLoading={submitting}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入记忆配置名称" />
          </Form.Item>

          <Form.Item
            name="memoryLibraryId"
            label="记忆库ID"
          >
            <Input placeholder="请输入记忆库ID" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="项目ID"
          >
            <Input placeholder="请输入项目ID" />
          </Form.Item>

          <Form.Item
            name="profileSchema"
            label="用户画像Schema"
          >
            <Input placeholder="请输入用户画像Schema" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
          >
            <Input.Password placeholder="请输入API Key（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemoryPage;
