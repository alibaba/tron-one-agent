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
import { Card, Descriptions, Button, Tag, Space, Typography, Spin, message, Divider } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { AnyKnowledgeBaseConfig, ElasticSearchKnowledgeBaseConfig } from '../../types/kb.interface';
import { KnowledgeBaseType } from '../../types/common.interface';
import { getKbById } from '../../services/kb';

const { Text } = Typography;

const KBDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [knowledgeBase, setKnowledgeBase] = useState<AnyKnowledgeBaseConfig | null>(null);
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

  // 渲染 Bailian 类型详情
  const renderBailianDetail = (kb: any) => (
    <Descriptions column={2} bordered>
      <Descriptions.Item label="ID">{kb.id}</Descriptions.Item>
      <Descriptions.Item label="名称">{kb.name}</Descriptions.Item>
      <Descriptions.Item label="类型">
        <Tag color="purple">Bailian</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="状态">
        <Tag color={kb.enabled ? 'green' : 'red'}>
          {kb.enabled ? '启用' : '禁用'}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="工作空间ID">
        <Text code>{kb.workspaceId}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="索引ID">
        <Text code>{kb.indexId}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="启用重写">
        <Tag color={kb.enableRewrite ? 'green' : 'red'}>
          {kb.enableRewrite ? '启用' : '禁用'}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="启用重排">
        <Tag color={kb.enableRerank ? 'green' : 'red'}>
          {kb.enableRerank ? '启用' : '禁用'}
        </Tag>
      </Descriptions.Item>
    </Descriptions>
  );

  // 渲染 ElasticSearch 类型详情
  const renderESDetail = (kb: ElasticSearchKnowledgeBaseConfig) => (
    <>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="ID">{kb.id}</Descriptions.Item>
        <Descriptions.Item label="名称">{kb.name}</Descriptions.Item>
        <Descriptions.Item label="类型">
          <Tag color="orange">ElasticSearch</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={kb.enabled ? 'green' : 'red'}>
            {kb.enabled ? '启用' : '禁用'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="服务地址" span={2}>
          <Text code>{kb.url}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="用户名">
          {kb.username || <Text type="secondary">未设置</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="密码">
          {kb.password ? <Text code>******</Text> : <Text type="secondary">未设置</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="索引名称">
          <Text code>{kb.indexName}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="向量维度">
          {kb.dimensions || <Text type="secondary">未设置</Text>}
        </Descriptions.Item>
      </Descriptions>

      {/* Embedding 模型配置 */}
      {kb.embeddingModelConfig && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 13, marginTop: 24, marginBottom: 16 }}>
            Embedding 模型配置
          </Divider>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="API Key">
              {kb.embeddingModelConfig.apiKey
                ? <Text code>******</Text>
                : <Text type="secondary">未设置</Text>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Base URL">
              {kb.embeddingModelConfig.baseUrl || <Text type="secondary">默认</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="模型名称">
              {kb.embeddingModelConfig.modelName || <Text type="secondary">未设置</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Embedding 维度">
              {kb.embeddingModelConfig.dimensions || <Text type="secondary">未设置</Text>}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </>
  );

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
        {knowledgeBase.type === KnowledgeBaseType.BAILIAN
          ? renderBailianDetail(knowledgeBase)
          : knowledgeBase.type === KnowledgeBaseType.ELASTIC_SEARCH
            ? renderESDetail(knowledgeBase as ElasticSearchKnowledgeBaseConfig)
            : <Text type="secondary">未知的知识库类型</Text>
        }
      </Card>
    </div>
  );
};

export default KBDetail;
