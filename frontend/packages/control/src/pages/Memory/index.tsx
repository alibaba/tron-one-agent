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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['memory', 'common']);

  const columns: ColumnsType<LongTermMemoryConfig> = [
    {
      title: t('common:id'),
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: t('memory:columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('memory:columns.memoryLibraryId'),
      dataIndex: 'memoryLibraryId',
      key: 'memoryLibraryId',
      render: (val: string) => val || '-',
    },
    {
      title: t('memory:columns.projectId'),
      dataIndex: 'projectId',
      key: 'projectId',
      render: (val: string) => val || '-',
    },
    {
      title: t('memory:columns.profileSchema'),
      dataIndex: 'profileSchema',
      key: 'profileSchema',
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: t('memory:columns.relatedAgents'),
      key: 'relatedAgents',
      render: (_, record: LongTermMemoryConfig) => {
        const relatedAgents = getRelatedAgents(record.id);
        return (
          <Tooltip
            title={relatedAgents.length > 0 ?
              t('memory:relatedTooltip', { names: relatedAgents.map(a => a.name).join(', ') }) :
              t('memory:noRelated')
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
      title: t('memory:columns.status'),
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
      title: t('memory:columns.action'),
      key: 'action',
      render: (_, record: LongTermMemoryConfig) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('memory:edit')}
          </Button>
          <Tooltip
            title={getRelatedAgents(record.id).length > 0 ?
              t('memory:deleteDisabled', { count: getRelatedAgents(record.id).length }) :
              t('memory:deleteEnabled')
            }
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              disabled={getRelatedAgents(record.id).length > 0}
            >
              {t('memory:delete')}
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
      console.error('Failed to load memory configs:', error);
      message.error(t('memory:loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsData = await getAllAgents() as any;
      setAgents(agentsData.data || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const getRelatedAgents = (memoryId: string): AgentConfig[] => {
    return agents.filter(agent => agent.longTermMemoryId === memoryId);
  };

  useEffect(() => {
    loadMemories();
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMemory(id, { enabled });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
      message.success(enabled ? t('memory:enableSuccess') : t('memory:disableSuccess'));
    } catch (error) {
      console.error('Status update failed:', error);
      message.error(t('memory:toggleFailed'));
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
        message.success(t('memory:updateSuccess'));
      } else {
        await createMemory({ ...values, type: 1 });
        message.success(t('memory:createSuccess'));
      }

      setModalVisible(false);
      loadMemories();
    } catch (error) {
      console.error('Save failed:', error);
      if (error instanceof Error) {
        message.error(error.message || t('memory:saveFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const memory = memories.find(m => m.id === id);
    Modal.confirm({
      title: t('memory:confirmDelete.title'),
      content: (
        <div>
          <p>{t('memory:confirmDelete.intro')}</p>
          <div style={{ ...commonStyles.confirmBox }}>
            <p><strong>{t('memory:confirmDelete.name')}</strong>{memory?.name}</p>
            <p><strong>{t('memory:confirmDelete.id')}</strong>{memory?.id}</p>
          </div>
          <p style={commonStyles.confirmWarning}>
            {t('memory:confirmDelete.warning')}
          </p>
        </div>
      ),
      okText: t('memory:confirmDelete.ok'),
      cancelText: t('common:cancel'),
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          await deleteMemory(id);
          setMemories(prev => prev.filter(m => m.id !== id));
          message.success(t('memory:deleteSuccess'));
        } catch (error) {
          console.error('Delete failed:', error);
          message.error(t('memory:deleteFailed'));
        }
      },
    });
  };

  return (
    <div className={memoryStyles.container}>
      <Card title={t('memory:title')} extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadMemories} loading={loading}>
            {t('common:refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('memory:addButton')}
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
        title={editingMemory ? t('memory:modal.editTitle') : t('memory:modal.addTitle')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingMemory(null);
          form.resetFields();
        }}
        confirmLoading={submitting}
        width={600}
        okText={t('common:save')}
        cancelText={t('common:cancel')}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label={t('memory:modal.name')}
            rules={[{ required: true, message: t('memory:modal.nameRequired') }]}
          >
            <Input placeholder={t('memory:modal.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="memoryLibraryId"
            label={t('memory:modal.memoryLibraryId')}
          >
            <Input placeholder={t('memory:modal.memoryLibraryIdPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="projectId"
            label={t('memory:modal.projectId')}
          >
            <Input placeholder={t('memory:modal.projectIdPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="profileSchema"
            label={t('memory:modal.profileSchema')}
          >
            <Input placeholder={t('memory:modal.profileSchemaPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label={t('memory:modal.apiKey')}
          >
            <Input.Password placeholder={t('memory:modal.apiKeyPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemoryPage;
