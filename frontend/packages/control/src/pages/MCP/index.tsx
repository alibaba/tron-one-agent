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
import { EditOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { McpClientConfig } from '../../types/mcp.interface';
import { AgentConfig } from '../../types/agent.interface';
import McpManageButton from './components/McpManageButton';
import { getAllMcps, createMcp, updateMcp, deleteMcp } from '../../services/mcp';
import { getAllAgents } from '../../services/agent';
import mcpStyles from './index.module.less';

const MCPPage: React.FC = () => {
  const navigate = useNavigate();
  const [mcpClients, setMcpClients] = useState<McpClientConfig[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const columns: ColumnsType<McpClientConfig> = [
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
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <Tooltip title={description} placement="topLeft">
          <span style={{ 
            display: 'inline-block',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {description}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '传输方式',
      dataIndex: 'transport',
      key: 'transport',
      render: (transport: string) => (
        <Tag color={transport === 'sse' ? 'blue' : 'green'}>
          {transport.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <Tooltip title={url} placement="topLeft">
          <span style={{ 
            display: 'inline-block',
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {url}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '已关联Agents',
      key: 'relatedAgents',
      render: (_, record: McpClientConfig) => {
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
      render: (enabled: boolean, record: McpClientConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: McpClientConfig) => (
        <Space size="middle">
          <McpManageButton
            editingMcp={record}
            onSuccess={handleSuccess}
            onError={handleError}
            buttonType="link"
            size="small"
          >
            编辑
          </McpManageButton>
          <Tooltip 
            title={getRelatedAgents(record.id).length > 0 ? 
              `该MCP客户端已被 ${getRelatedAgents(record.id).length} 个Agent关联，无法删除` : 
              '删除MCP客户端'
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

  // 加载MCP客户端列表
  const loadMcpClients = async () => {
    try {
      setLoading(true);
      const response = await getAllMcps();
      setMcpClients(response.data || []);
    } catch (error) {
      console.error('加载MCP客户端列表失败:', error);
      message.error('加载MCP客户端列表失败，请重试');
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

  // 获取与指定MCP客户端关联的Agents
  const getRelatedAgents = (mcpId: string): AgentConfig[] => {
    return agents.filter(agent => 
      agent.mcpClients?.some(mcp => mcp.clientId === mcpId)
    );
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadMcpClients();
    loadAgents();
  }, []);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMcp(id, { enabled });
      setMcpClients(prev => prev.map(mcp => 
        mcp.id === id ? { ...mcp, enabled } : mcp
      ));
      message.success(`MCP客户端已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败，请重试');
    }
  };

  const handleDelete = (id: string) => {
    const mcpClient = mcpClients.find(mcp => mcp.id === id);
    
    Modal.confirm({
      title: '确认删除MCP客户端',
      content: (
        <div>
          <p>您即将删除以下MCP客户端：</p>
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '6px', 
            margin: '12px 0' 
          }}>
            <p><strong>名称：</strong>{mcpClient?.name}</p>
            <p><strong>标识：</strong>{mcpClient?.id}</p>
            <p><strong>URL：</strong>{mcpClient?.url}</p>
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
          await deleteMcp(id);
          setMcpClients(prev => prev.filter(mcp => mcp.id !== id));
          message.success('MCP客户端删除成功');
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请重试');
        }
      },
    });
  };

  const handleSuccess = () => {
    // 操作成功后重新加载数据
    loadMcpClients();
    loadAgents();
  };

  const handleError = (error: any) => {
    console.error('操作失败:', error);
  };

  return (
    <div className={mcpStyles.container}>
      <Card title="MCP管理" extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadMcpClients}
            loading={loading}
          >
            刷新
          </Button>
          <McpManageButton onSuccess={handleSuccess} onError={handleError} />
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={mcpClients}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default MCPPage;
