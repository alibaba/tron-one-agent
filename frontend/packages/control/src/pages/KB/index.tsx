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
import { Table, Button, Space, Tag, Switch, Modal, Card, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { BailianKnowledgeBaseConfig } from '../../types/kb.interface';
import { KnowledgeBaseType } from '../../types/common.interface';
import { AgentConfig } from '../../types/agent.interface';
import KbManageButton from './components/KbManageButton';
import { getAllKbs, updateKb, deleteKb } from '../../services/kb';
import { getAllAgents } from '../../services/agent';
import kbStyles from './index.module.less';

const KBPage: React.FC = () => {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<BailianKnowledgeBaseConfig[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const columns: ColumnsType<BailianKnowledgeBaseConfig> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: KnowledgeBaseType) => (
        <Tag color="purple">
          {type === KnowledgeBaseType.BAILIAN ? 'Bailian' : 'Unknown'}
        </Tag>
      ),
    },
    {
      title: '工作空间ID',
      dataIndex: 'workspaceId',
      key: 'workspaceId',
    },
    {
      title: '索引ID',
      dataIndex: 'indexId',
      key: 'indexId',
    },
    {
      title: '已关联Agents',
      key: 'relatedAgents',
      render: (_, record: BailianKnowledgeBaseConfig) => {
        const relatedAgents = getRelatedAgents(record.id);
        return (
          <Tooltip 
            title={relatedAgents.length > 0 ? 
              `关联的Agents: ${relatedAgents.map(agent => agent.name).join(', ')}` : 
              '暂无关联的Agents'
            }
            placement="topLeft"
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
      render: (enabled: boolean, record: BailianKnowledgeBaseConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '重写',
      dataIndex: 'enableRewrite',
      key: 'enableRewrite',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '重排',
      dataIndex: 'enableRerank',
      key: 'enableRerank',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: BailianKnowledgeBaseConfig) => (
        <Space size="middle">
          <KbManageButton
            editingKb={record}
            onSuccess={handleSuccess}
            onError={handleError}
            buttonType="link"
            size="small"
          >
            编辑
          </KbManageButton>
          <Tooltip 
            title={getRelatedAgents(record.id).length > 0 ? 
              `该知识库已被 ${getRelatedAgents(record.id).length} 个Agent关联，无法删除` : 
              '删除知识库'
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

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await getAllKbs();
      setKnowledgeBases(response.data || []);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载Agents列表
  const loadAgents = async () => {
    try {
      const agentsData = await getAllAgents();
      setAgents(agentsData.data || []);
    } catch (error) {
      console.error('加载Agents列表失败:', error);
      message.error('加载Agents列表失败，请重试');
    }
  };

  // 获取与指定知识库关联的Agents
  const getRelatedAgents = (kbId: string): AgentConfig[] => {
    return agents.filter(agent => 
      agent.knowledgeBases && agent.knowledgeBases.some(kb => kb.knowledgeId === kbId)
    );
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadKnowledgeBases();
    loadAgents();
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateKb(id, { enabled });
      setKnowledgeBases(prev => prev.map(kb => 
        kb.id === id ? { ...kb, enabled } : kb
      ));
      message.success(`知识库已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败，请重试');
    }
  };

  const handleDelete = (id: string) => {
    const knowledgeBase = knowledgeBases.find(kb => kb.id === id);
    
    Modal.confirm({
      title: '确认删除知识库',
      content: (
        <div>
          <p>您即将删除以下知识库：</p>
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '6px', 
            margin: '12px 0' 
          }}>
            <p><strong>名称：</strong>{knowledgeBase?.name}</p>
            <p><strong>ID：</strong>{knowledgeBase?.id}</p>
            <p><strong>工作空间：</strong>{knowledgeBase?.workspaceId}</p>
          </div>
          <p style={{ color: '#ff4d4f', fontWeight: 500 }}>
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
          await deleteKb(id);
          setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
          message.success('知识库删除成功');
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请重试');
        }
      },
    });
  };

  const handleSuccess = () => {
    // 操作成功后重新加载数据
    loadKnowledgeBases();
    loadAgents();
  };

  const handleError = (error: any) => {
    console.error('操作失败:', error);
  };

  return (
    <div className={kbStyles.container}>
      <Card title="知识库管理" extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadKnowledgeBases}
            loading={loading}
          >
            刷新
          </Button>
          <KbManageButton onSuccess={handleSuccess} onError={handleError} />
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={knowledgeBases}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default KBPage;
