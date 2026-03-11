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
import { AgentToolConfig } from '../../types/tool.interface';
import { getAllTools } from '../../services/tools';
import toolsStyles from './index.module.less';

const ToolsPage: React.FC = () => {
  const [tools, setTools] = useState<AgentToolConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载工具数据
  const loadTools = async () => {
    try {
      setLoading(true);
      const toolsData = await getAllTools();
      setTools(toolsData.data || []);
    } catch (error) {
      console.error('加载工具列表失败:', error);
      message.error('加载工具列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadTools();
  }, []);

  const columns: ColumnsType<AgentToolConfig & { id: string }> = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => {
        return <Tag>{name}</Tag>;
      },
    },
    {
      title: '工具描述',
			dataIndex: 'description',
      key: 'description',
      render: (description: string, record: AgentToolConfig) => {
        return <span style={{ color: '#666' }}>{description}</span>;
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
        title="Tools管理"
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
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: loading ? '加载中...' : '暂无工具数据' }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default ToolsPage;
