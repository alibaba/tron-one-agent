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
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space, Typography, Spin, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { McpClientConfig } from '../../types/mcp.interface';
import { getMcpById } from '../../services/mcp';

const { Text } = Typography;

const MCPDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mcpClient, setMcpClient] = useState<McpClientConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载MCP客户端详情
  const loadMcpClient = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getMcpById(id);
      setMcpClient(response);
    } catch (error) {
      console.error('加载MCP客户端详情失败:', error);
      message.error('加载MCP客户端详情失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMcpClient();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载中...</Text>
        </div>
      </div>
    );
  }

  if (!mcpClient) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Text type="secondary">MCP客户端不存在</Text>
          <br />
          <Button type="primary" onClick={() => navigate('/mcp')} style={{ marginTop: 16 }}>
            返回列表
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/mcp')}
            >
              返回
            </Button>
            <span>{mcpClient.name} - 详情</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="ID">{mcpClient.id}</Descriptions.Item>
          <Descriptions.Item label="名称">{mcpClient.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={mcpClient.enabled ? 'green' : 'red'}>
              {mcpClient.enabled ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="传输方式">
            <Tag color={mcpClient.transport === 'sse' ? 'blue' : 'green'}>
              {mcpClient.transport.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="URL" span={2}>
            <Text code>{mcpClient.url}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="超时时间">{mcpClient.timeout}秒</Descriptions.Item>
          <Descriptions.Item label="SSE读取超时">{mcpClient.sse_read_timeout}秒</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {mcpClient.description}
          </Descriptions.Item>
          <Descriptions.Item label="请求头" span={2}>
            <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              {JSON.stringify(mcpClient.headers, null, 2)}
            </pre>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default MCPDetail;
