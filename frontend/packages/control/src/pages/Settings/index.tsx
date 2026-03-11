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
import { Card, Form, Input, Button, message, Space } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getThemeConfig, setThemeConfig, defaultTheme } from '../../config/theme';
import settingsStyles from './index.module.less';

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const config = getThemeConfig();
    form.setFieldsValue(config);
  }, [form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      setThemeConfig(values);
      message.success('主题配置保存成功！');
      
      // 刷新页面以应用新配置
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      message.error('保存失败，请检查输入内容');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(defaultTheme);
    message.info('已重置为默认配置');
  };

  return (
    <div className={settingsStyles.container}>
      <Card title="主题设置">
        <Form
          form={form}
          layout="vertical"
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            name="title"
            label="系统标题"
            rules={[
              { required: true, message: '请输入系统标题' },
              { max: 20, message: '标题长度不能超过20个字符' }
            ]}
          >
            <Input placeholder="请输入系统标题" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                保存配置
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置默认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
