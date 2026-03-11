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
  const handleClick = () => {
    Modal.confirm({
      title: `确认${agent.enabled ? '下线' : '上线'}`,
      content: `确定要${agent.enabled ? '下线' : '上线'}Agent "${agent.name}" 吗？`,
      onOk: async () => {
        try {
          if (onToggleStatus) {
            // 使用外部提供的状态切换逻辑
            onToggleStatus(agent);
          } else {
            // 内置处理逻辑：调用API更新agent状态
            if (agent.id) {
              await updateAgent(agent.id, { enabled: !agent.enabled });
              message.success(`Agent已${agent.enabled ? '下线' : '上线'}`);
            } else {
              throw new Error('Agent ID不存在');
            }
          }
          
          // 调用成功回调
          if (onSuccess) {
            onSuccess(agent);
          }
        } catch (error) {
          console.error('状态切换失败:', error);
          
          // 调用错误回调
          if (onError) {
            onError(error);
          } else {
            message.error('状态切换失败，请重试');
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
      {children || (agent.enabled ? '下线' : '上线')}
    </Button>
  );
};

export default StatusToggleButton;
