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
import { BailianKnowledgeBaseConfig } from '../../types/kb.interface';
import { KnowledgeBaseType } from '../../types/common.interface';
import { getKbById } from '../../services/kb';

const { Text } = Typography;

const KBDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [knowledgeBase, setKnowledgeBase] = useState<BailianKnowledgeBaseConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载知识库详情
  const loadKnowledgeBase = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getKbById(id);
      setKnowledgeBase(response.data);
    } catch (error) {
      console.error('加载知识库详情失败:', error);
      message.error('加载知识库详情失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBase();
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

  if (!knowledgeBase) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Text type="secondary">知识库不存在</Text>
          <br />
          <Button type="primary" onClick={() => navigate('/kb')} style={{ marginTop: 16 }}>
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
              onClick={() => navigate('/kb')}
            >
              返回
            </Button>
            <span>{knowledgeBase.name} - 详情</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="ID">{knowledgeBase.id}</Descriptions.Item>
          <Descriptions.Item label="名称">{knowledgeBase.name}</Descriptions.Item>
          <Descriptions.Item label="类型">
            <Tag color="purple">
              {knowledgeBase.type === KnowledgeBaseType.BAILIAN ? 'Bailian' : 'Unknown'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={knowledgeBase.enabled ? 'green' : 'red'}>
              {knowledgeBase.enabled ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="工作空间ID">
            <Text code>{knowledgeBase.workspaceId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="索引ID">
            <Text code>{knowledgeBase.indexId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="启用重写">
            <Tag color={knowledgeBase.enableRewrite ? 'green' : 'red'}>
              {knowledgeBase.enableRewrite ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="启用重排">
            <Tag color={knowledgeBase.enableRerank ? 'green' : 'red'}>
              {knowledgeBase.enableRerank ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          {/* {knowledgeBase.apiKey && (
            <Descriptions.Item label="API Key">
              <Text code style={{ fontSize: '12px' }}>
                {knowledgeBase.apiKey.startsWith('$os{') ? knowledgeBase.apiKey : '***'}
              </Text>
            </Descriptions.Item>
          )} */}
        </Descriptions>
      </Card>
    </div>
  );
};

export default KBDetail;
