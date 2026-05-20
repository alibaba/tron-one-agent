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
import { Button, Modal, Typography, Form, Input, message, Row, Col } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';
import { colors } from '../../../styles/tokens';
import agentsStyles from '../index.module.less';

const { Text } = Typography;
const { TextArea } = Input;

interface SystemPromptButtonProps {
  agent: AgentConfig;
  onManageSystemPrompt?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const SystemPromptButton: React.FC<SystemPromptButtonProps> = ({ agent, onManageSystemPrompt, onSuccess, onError, children }) => {
  const { t } = useTranslation(['agents', 'common']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [previewContent, setPreviewContent] = useState('');

  const handleClick = () => {
    if (onManageSystemPrompt) {
      onManageSystemPrompt(agent);
    } else {
      // 直接进入编辑状态
      const content = agent.systemPrompt || '';
      form.setFieldsValue({ systemPrompt: content });
      setPreviewContent(content);
      setIsModalVisible(true);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (agent.id) {
        await updateAgent(agent.id, { systemPrompt: values.systemPrompt });
        message.success(t('agents:systemPrompt.saveSuccess'));
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(agent);
        }
        
        setIsModalVisible(false);
        setPreviewContent('');
      } else {
        throw new Error('Agent ID不存在');
      }
    } catch (error) {
      console.error('Prompt update failed:', error);
      
      if (onError) {
        onError(error);
      } else {
        message.error(t('agents:systemPrompt.saveFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setPreviewContent('');
    form.resetFields();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setPreviewContent(content);
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<FileTextOutlined />}
        onClick={handleClick}
      >
        {children || t('agents:systemPrompt.button')}
      </Button>

      <Modal
        title={`${agent.name}`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleModalClose}
        width={1200}
        style={{ top: 20 }}
        okText={t('common:save')}
        cancelText={t('common:close')}
        confirmLoading={loading}
      >
        <Row gutter={24} style={{ marginTop: 16 }}>
          <Col span={12}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: '16px', color: colors.ink }}>{t('agents:systemPrompt.editor')}</Text>
            </div>
            <Form form={form}>
              <Form.Item
                name="systemPrompt"
                rules={[{ required: true, message: t('agents:systemPrompt.required') }]}
              >
                <TextArea
                  rows={22}
                  placeholder={t('agents:systemPrompt.placeholder')}
                  style={{ 
                    fontFamily: '"JetBrains Mono", "Fira Code", Monaco, Menlo, "Ubuntu Mono", monospace', 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    borderRadius: '8px',
                    border: `1px solid ${colors.borderDefault}`,
                    resize: 'none'
                  }}
                  onChange={handleContentChange}
                />
              </Form.Item>
            </Form>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: '16px', color: colors.ink }}>{t('agents:systemPrompt.preview')}</Text>
            </div>
            <div
              className={agentsStyles.markdownPreview}
              style={{
              height: '550px',
              overflow: 'auto',
              padding: '20px',
              background: colors.surfacePearl,
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.7'
            }}>
              {previewContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {previewContent}
                </ReactMarkdown>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: colors.bodyMuted
                }}>
                  <Text type="secondary">{t('agents:systemPrompt.previewHint')}</Text>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default SystemPromptButton;
