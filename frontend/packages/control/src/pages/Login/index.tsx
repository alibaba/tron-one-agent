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
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '@/services/auth';
import { setToken, setUsername } from '@/utils/auth';
import { LoginRequest } from '@/types/admin.interface';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import styles from './index.module.less';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation('login');

  const handleSubmit = async (values: LoginRequest) => {
    try {
      setLoading(true);
      const response = await login(values);
      setToken(response.data.token);
      setUsername(response.data.username);
      message.success(t('loginSuccess'));
      navigate('/agents');
    } catch (error) {
      console.error('login failed:', error);
      message.error(t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher />
      </div>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Title level={3} className={styles.title}>{t('title')}</Title>
          <div className={styles.subtitle}>{t('subtitle')}</div>
        </div>
        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('usernameRequired') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('usernamePlaceholder')}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('passwordPlaceholder')}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              {t('submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
