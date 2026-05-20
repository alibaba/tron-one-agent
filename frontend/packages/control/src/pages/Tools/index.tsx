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
import { Table, Card, Tag, message, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { AgentToolConfig } from '../../types/tool.interface';
import { getAllTools } from '../../services/tools';
import { colors } from '../../styles/tokens';
import toolsStyles from './index.module.less';

const ToolsPage: React.FC = () => {
  const [tools, setTools] = useState<AgentToolConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(['tools', 'common']);

  const loadTools = async () => {
    try {
      setLoading(true);
      const toolsData = await getAllTools();
      setTools(toolsData.data || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
      message.error(t('tools:loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<AgentToolConfig & { id: string }> = [
    {
      title: t('tools:columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => {
        return <Tag>{name}</Tag>;
      },
    },
    {
      title: t('tools:columns.description'),
			dataIndex: 'description',
      key: 'description',
      render: (description: string) => {
        return <span style={{ color: colors.bodyMuted }}>{description}</span>;
      },
    },
  ];

  const dataSource = tools.map((tool, index) => ({
    ...tool,
    id: index.toString(),
  }));

  return (
    <div className={toolsStyles.container}>
      <Card 
        title={t('tools:title')}
        extra={
          <ReloadOutlined 
            onClick={loadTools}
            style={{ cursor: 'pointer', fontSize: '16px' }}
            spin={loading}
          />
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            locale={{ emptyText: loading ? t('common:loading') : t('tools:emptyTools') }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default ToolsPage;
