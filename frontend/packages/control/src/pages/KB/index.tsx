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
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Tag, Switch, Modal, Card, message, Tooltip } from 'antd';
import { DeleteOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AnyKnowledgeBaseConfig, ElasticSearchKnowledgeBaseConfig } from '../../types/kb.interface';
import { KnowledgeBaseType } from '../../types/common.interface';
import { AgentConfig } from '../../types/agent.interface';
import KbManageButton from './components/KbManageButton';
import { getAllKbs, updateKb, deleteKb } from '../../services/kb';
import { getAllAgents } from '../../services/agent';
import { commonStyles } from '../../styles/tokens';
import kbStyles from './index.module.less';

const KBPage: React.FC = () => {
  const { t } = useTranslation(['kb', 'common']);
  const [knowledgeBases, setKnowledgeBases] = useState<AnyKnowledgeBaseConfig[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const columns: ColumnsType<AnyKnowledgeBaseConfig> = [
    {
      title: t('common:id'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('kb:columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('kb:columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: KnowledgeBaseType) => (
        <>
          <Tag color={type === KnowledgeBaseType.BAILIAN ? 'purple' : 'orange'}>
            {type === KnowledgeBaseType.BAILIAN ? 'Bailian' : type === KnowledgeBaseType.ELASTIC_SEARCH ? 'ElasticSearch' : 'Unknown'}
          </Tag>
        </>
      ),
    },
    {
      title: t('kb:columns.config'),
      key: 'config',
      render: (_, record: AnyKnowledgeBaseConfig) => {
        if (record.type === KnowledgeBaseType.BAILIAN) {
          const bailian = record as any;
          return (
            <Space size="small" wrap>
              <span>{t('kb:workspace')}: {bailian.workspaceId}</span>
              <span>{t('kb:index')}: {bailian.indexId}</span>
            </Space>
          );
        }
        if (record.type === KnowledgeBaseType.ELASTIC_SEARCH) {
          const es = record as ElasticSearchKnowledgeBaseConfig;
          return (
            <Space size="small" wrap>
              <span>{t('kb:address')}: {es.url}</span>
              <span>{t('kb:index')}: {es.indexName}</span>
            </Space>
          );
        }
        return <span>-</span>;
      },
    },
    {
      title: t('kb:columns.relatedAgents'),
      key: 'relatedAgents',
      render: (_, record: AnyKnowledgeBaseConfig) => {
        const relatedAgents = getRelatedAgents(record.id);
        return (
          <Tooltip 
            title={relatedAgents.length > 0 ? 
              t('kb:relatedTooltip', { names: relatedAgents.map(agent => agent.name).join(', ') }) : 
              t('kb:noRelated')
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
      title: t('kb:columns.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: AnyKnowledgeBaseConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: t('kb:columns.rewrite'),
      key: 'enableRewrite',
      render: (_, record: AnyKnowledgeBaseConfig) => {
        if (record.type !== KnowledgeBaseType.BAILIAN) return <span>-</span>;
        const bailian = record as any;
        return (
          <Tag color={bailian.enableRewrite ? 'green' : 'red'}>
            {bailian.enableRewrite ? t('kb:enabled') : t('kb:disabled')}
          </Tag>
        );
      },
    },
    {
      title: t('kb:columns.rerank'),
      key: 'enableRerank',
      render: (_, record: AnyKnowledgeBaseConfig) => {
        if (record.type !== KnowledgeBaseType.BAILIAN) return <span>-</span>;
        const bailian = record as any;
        return (
          <Tag color={bailian.enableRerank ? 'green' : 'red'}>
            {bailian.enableRerank ? t('kb:enabled') : t('kb:disabled')}
          </Tag>
        );
      },
    },
    {
      title: t('kb:columns.action'),
      key: 'action',
      render: (_, record: AnyKnowledgeBaseConfig) => (
        <Space size="middle">
          <KbManageButton
            editingKb={record}
            onSuccess={handleSuccess}
            onError={handleError}
            buttonType="link"
            size="small"
          >
            {t('kb:edit')}
          </KbManageButton>
          <Tooltip 
            title={getRelatedAgents(record.id).length > 0 ? 
              t('kb:deleteDisabled', { count: getRelatedAgents(record.id).length }) : 
              t('kb:deleteEnabled')
            }
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              disabled={getRelatedAgents(record.id).length > 0}
            >
              {t('kb:delete')}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await getAllKbs();
      setKnowledgeBases(response.data || []);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error(t('kb:loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsData = await getAllAgents();
      setAgents(agentsData.data || []);
    } catch (error) {
      console.error('加载Agents列表失败:', error);
      message.error(t('kb:loadAgentsFailed'));
    }
  };

  const getRelatedAgents = (kbId: string): AgentConfig[] => {
    return agents.filter(agent => 
      agent.knowledgeBases && agent.knowledgeBases.some(kb => kb.knowledgeId === kbId)
    );
  };

  useEffect(() => {
    loadKnowledgeBases();
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateKb(id, { enabled });
      setKnowledgeBases(prev => prev.map(kb => 
        kb.id === id ? { ...kb, enabled } : kb
      ));
      message.success(enabled ? t('kb:enableSuccess') : t('kb:disableSuccess'));
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error(t('kb:toggleFailed'));
    }
  };

  const handleDelete = (id: string) => {
    const knowledgeBase = knowledgeBases.find(kb => kb.id === id);
    
    // 根据类型获取配置摘要
    const configSummary = knowledgeBase
      ? knowledgeBase.type === KnowledgeBaseType.BAILIAN
        ? `${t('kb:workspace')}: ${(knowledgeBase as any).workspaceId}`
        : knowledgeBase.type === KnowledgeBaseType.ELASTIC_SEARCH
          ? `${t('kb:address')}: ${(knowledgeBase as ElasticSearchKnowledgeBaseConfig).url} | ${t('kb:index')}: ${(knowledgeBase as ElasticSearchKnowledgeBaseConfig).indexName}`
          : '-'
      : '';
    
    Modal.confirm({
      title: t('kb:confirmDelete.title'),
      content: (
        <div>
          <p>{t('kb:confirmDelete.intro')}</p>
          <div style={commonStyles.confirmBox}>
            <p><strong>{t('kb:confirmDelete.name')}</strong>{knowledgeBase?.name}</p>
            <p><strong>{t('kb:confirmDelete.id')}</strong>{knowledgeBase?.id}</p>
            <p><strong>{t('kb:confirmDelete.type')}</strong>{knowledgeBase?.type === KnowledgeBaseType.BAILIAN ? 'Bailian' : 'ElasticSearch'}</p>
            <p><strong>{t('kb:confirmDelete.config')}</strong>{configSummary}</p>
          </div>
          <p style={commonStyles.confirmWarning}>
            {t('kb:confirmDelete.warning')}
          </p>
        </div>
      ),
      okText: t('kb:confirmDelete.ok'),
      cancelText: t('common:cancel'),
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          await deleteKb(id);
          setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
          message.success(t('kb:deleteSuccess'));
        } catch (error) {
          console.error('删除失败:', error);
          message.error(t('kb:deleteFailed'));
        }
      },
    });
  };

  const handleSuccess = () => {
    loadKnowledgeBases();
    loadAgents();
  };

  const handleError = (error: any) => {
    console.error('操作失败:', error);
  };

  return (
    <div className={kbStyles.container}>
      <Card title={t('kb:title')} extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadKnowledgeBases}
            loading={loading}
          >
            {t('common:refresh')}
          </Button>
          <KbManageButton onSuccess={handleSuccess} onError={handleError} />
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={knowledgeBases}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default KBPage;
