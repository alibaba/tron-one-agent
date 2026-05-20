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


import React from 'react';
import { Button, Modal, message } from 'antd';
import { PoweroffOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AgentConfig } from '../../../types/agent.interface';
import { updateAgent } from '../../../services/agent';

interface StatusToggleButtonProps {
  agent: AgentConfig;
  onToggleStatus?: (agent: AgentConfig) => void;
  onSuccess?: (agent: AgentConfig) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

const StatusToggleButton: React.FC<StatusToggleButtonProps> = ({ agent, onToggleStatus, onSuccess, onError, children }) => {
  const { t } = useTranslation(['agents', 'common']);
  const actionText = agent.enabled ? t('agents:statusToggle.offline') : t('agents:statusToggle.online');

  const handleClick = () => {
    Modal.confirm({
      title: t('agents:statusToggle.confirmTitle', { action: actionText }),
      content: t('agents:statusToggle.confirmContent', { action: actionText, name: agent.name }),
      onOk: async () => {
        try {
          if (onToggleStatus) {
            onToggleStatus(agent);
          } else {
            if (agent.id) {
              await updateAgent(agent.id, { enabled: !agent.enabled });
              message.success(agent.enabled ? t('agents:statusToggle.successDisable') : t('agents:statusToggle.successEnable'));
            } else {
              throw new Error('Agent ID不存在');
            }
          }
          
          // 调用成功回调
          if (onSuccess) {
            onSuccess(agent);
          }
        } catch (error) {
          console.error('Status toggle failed:', error);
          
          if (onError) {
            onError(error);
          } else {
            message.error(t('agents:statusToggle.failed'));
          }
        }
      },
    });
  };

  return (
    <Button
      type="link"
      size="small"
      icon={agent.enabled ? <PoweroffOutlined /> : <CheckCircleOutlined />}
      onClick={handleClick}
    >
      {children || actionText}
    </Button>
  );
};

export default StatusToggleButton;
