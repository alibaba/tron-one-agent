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


import React, { useState } from 'react';
import { Card, Button, Space, Modal, Form, Input, Typography, Divider } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import systemPromptStyles from './index.module.less';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface SystemPromptConfig {
  id: string;
  name: string;
  content: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemPromptPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<SystemPromptConfig[]>([
    {
      id: '1',
      name: 'AI助手基础提示',
      description: '通用AI助手的基础系统提示',
      content: `# AI助手系统提示

你是一个专业的AI助手，具备以下能力：

## 核心能力
- **问题解答**：能够准确回答各种问题
- **任务协助**：帮助用户完成各种任务
- **创意支持**：提供创意想法和建议

## 行为准则
1. 始终保持**专业**和**友好**的态度
2. 提供**准确**和**有用**的信息
3. 承认不确定性，避免编造信息
4. 尊重用户隐私和数据安全

## 响应格式
- 使用清晰的结构化回答
- 适当使用**粗体**和*斜体*强调重点
- 必要时提供代码示例：

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

请始终遵循这些指导原则为用户提供最佳服务。`,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: '2',
      name: 'React开发助手提示',
      description: '专门用于React开发的系统提示',
      content: `# React开发助手

你是一个专业的React开发助手，专注于前端开发。

## 专业领域
- **React生态系统**：React、Next.js、Gatsby等
- **状态管理**：Redux、Zustand、Context API
- **样式方案**：CSS Modules、Styled Components、Tailwind CSS
- **构建工具**：Webpack、Vite、Rollup

## 代码规范
遵循以下最佳实践：

### 组件设计
\`\`\`tsx
interface Props {
  title: string;
  children: React.ReactNode;
}

const MyComponent: React.FC<Props> = ({ title, children }) => {
  return (
    <div className="component">
      <h2>{title}</h2>
      {children}
    </div>
  );
};
\`\`\`

### Hooks使用
- 优先使用函数组件和Hooks
- 合理使用useCallback和useMemo优化性能
- 自定义Hooks提取复用逻辑

## 回答要求
1. 提供完整可运行的代码示例
2. 解释代码的关键部分
3. 指出潜在的性能问题
4. 推荐最佳实践和工具`,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
    },
  ]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPromptConfig | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<SystemPromptConfig | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingPrompt(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (prompt: SystemPromptConfig) => {
    setEditingPrompt(prompt);
    form.setFieldsValue(prompt);
    setIsModalVisible(true);
  };

  const handlePreview = (prompt: SystemPromptConfig) => {
    setPreviewPrompt(prompt);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const now = new Date();
      
      if (editingPrompt) {
        setPrompts(prev => prev.map(prompt => 
          prompt.id === editingPrompt.id 
            ? { ...prompt, ...values, updatedAt: now }
            : prompt
        ));
      } else {
        const newPrompt: SystemPromptConfig = {
          ...values,
          id: Date.now().toString(),
          createdAt: now,
          updatedAt: now,
        };
        setPrompts(prev => [...prev, newPrompt]);
      }
      setIsModalVisible(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个系统提示吗？',
      onOk: () => {
        setPrompts(prev => prev.filter(prompt => prompt.id !== id));
      },
    });
  };

  return (
    <div className={systemPromptStyles.container}>
      <Card 
        title="系统提示管理" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增提示
          </Button>
        }
      >
        <div className={systemPromptStyles.promptList}>
          {prompts.map(prompt => (
            <Card
              key={prompt.id}
              className={systemPromptStyles.promptCard}
              title={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>
                    {prompt.name}
                  </Title>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(prompt)}
                  >
                    预览
                  </Button>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(prompt)}
                  >
                    编辑
                  </Button>
                  <Button
                    type="text"
                    danger
                    onClick={() => handleDelete(prompt.id)}
                  >
                    删除
                  </Button>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {prompt.description && (
                  <Text type="secondary">{prompt.description}</Text>
                )}
                <div className={systemPromptStyles.promptPreview}>
                  <Text ellipsis={{ rows: 3 }}>
                    {prompt.content.replace(/[#*`]/g, '').substring(0, 200)}...
                  </Text>
                </div>
                <div className={systemPromptStyles.promptMeta}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    创建时间: {prompt.createdAt.toLocaleDateString()}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    更新时间: {prompt.updatedAt.toLocaleDateString()}
                  </Text>
                </div>
              </Space>
            </Card>
          ))}
        </div>
      </Card>

      {/* 编辑/新增弹窗 */}
      <Modal
        title={editingPrompt ? '编辑系统提示' : '新增系统提示'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        style={{ top: 20 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="提示名称"
            rules={[{ required: true, message: '请输入提示名称' }]}
          >
            <Input placeholder="请输入提示名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="请输入提示描述（可选）" />
          </Form.Item>

          <Form.Item
            name="content"
            label="提示内容"
            rules={[{ required: true, message: '请输入提示内容' }]}
          >
            <TextArea
              rows={12}
              placeholder="请输入系统提示内容，支持Markdown格式"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title={`预览: ${previewPrompt?.name}`}
        open={!!previewPrompt}
        onCancel={() => setPreviewPrompt(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewPrompt(null)}>
            关闭
          </Button>,
          <Button 
            key="edit" 
            type="primary" 
            onClick={() => {
              setPreviewPrompt(null);
              handleEdit(previewPrompt!);
            }}
          >
            编辑
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
      >
        {previewPrompt && (
          <div className={systemPromptStyles.markdownPreview}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {previewPrompt.content}
            </ReactMarkdown>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SystemPromptPage;
