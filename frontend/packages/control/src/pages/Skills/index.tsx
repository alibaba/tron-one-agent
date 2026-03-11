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


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Table, Button, Space, Tag, Switch, Modal, Card, message, Tooltip, Tree } from 'antd';
import { DeleteOutlined, ReloadOutlined, UploadOutlined, DownloadOutlined, FileZipOutlined, ReadOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SkillConfig } from '../../types/skill.interface';
import { getAllSkills, uploadSkill, updateSkill, deleteSkill, downloadSkill } from '../../services/skill';
import skillStyles from './index.module.less';

const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const [updatingSkillId, setUpdatingSkillId] = useState<number | null>(null);
  const [instructionModal, setInstructionModal] = useState<{ visible: boolean; name: string; content: string }>({
    visible: false, name: '', content: '',
  });
  const [filesModal, setFilesModal] = useState<{ visible: boolean; name: string; files: string[] }>({
    visible: false, name: '', files: [],
  });

  // 将扁平文件路径列表转换为树形结构
  const buildFileTree = (files: string[]): DataNode[] => {
    const root: Record<string, any> = {};

    for (const filePath of files) {
      const parts = filePath.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = i === parts.length - 1 ? null : {};
        }
        if (current[part] !== null) {
          current = current[part];
        }
      }
    }

    const toTreeData = (obj: Record<string, any>, parentKey: string): DataNode[] => {
      return Object.entries(obj)
        .sort(([aKey, aVal], [bKey, bVal]) => {
          // 目录排在文件前面
          const aIsDir = aVal !== null ? 0 : 1;
          const bIsDir = bVal !== null ? 0 : 1;
          if (aIsDir !== bIsDir) return aIsDir - bIsDir;
          return aKey.localeCompare(bKey);
        })
        .map(([name, value]) => {
          const key = parentKey ? `${parentKey}/${name}` : name;
          if (value === null) {
            return {
              key,
              title: name,
              icon: <FileOutlined style={{ color: '#8c8c8c' }} />,
              isLeaf: true,
            };
          }
          return {
            key,
            title: name,
            icon: <FolderOutlined style={{ color: '#faad14' }} />,
            children: toTreeData(value, key),
          };
        });
    };

    return toTreeData(root, '');
  };

  const fileTreeData = useMemo(
    () => buildFileTree(filesModal.files),
    [filesModal.files]
  );

  const columns: ColumnsType<SkillConfig> = [
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
            {description || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '指令',
      dataIndex: 'instruction',
      key: 'instruction',
      render: (instruction: string, record: SkillConfig) => {
        if (!instruction) return '-';
        return (
          <Button
            type="link"
            size="small"
            icon={<ReadOutlined />}
            onClick={() => setInstructionModal({ visible: true, name: record.name, content: instruction })}
            style={{ padding: 0 }}
          >
            <span style={{
              display: 'inline-block',
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
            }}>
              {instruction.split('\n')[0]}
            </span>
          </Button>
        );
      },
    },
    {
      title: '文件列表',
      dataIndex: 'files',
      key: 'files',
      render: (files: string[], record: SkillConfig) => {
        if (!files || files.length === 0) return '-';
        return (
          <Button
            type="link"
            size="small"
            icon={<FileZipOutlined />}
            onClick={() => setFilesModal({ visible: true, name: record.name, files })}
            style={{ padding: 0 }}
          >
            {files.length} 个文件
          </Button>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: SkillConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: SkillConfig) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<UploadOutlined />}
            onClick={() => handleUpdateFile(record.id)}
          >
            更新文件
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.id)}
          >
            下载
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 加载Skill列表
  const loadSkills = async () => {
    try {
      setLoading(true);
      const response = await getAllSkills();
      setSkills(response.data || []);
    } catch (error) {
      console.error('加载Skill列表失败:', error);
      message.error('加载Skill列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadSkills();
  }, []);

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await updateSkill(id, { enabled });
      setSkills(prev => prev.map(skill => 
        skill.id === id ? { ...skill, enabled } : skill
      ));
      message.success(`Skill已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败，请重试');
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      message.error('请上传.zip格式的文件');
      event.target.value = '';
      return;
    }

    try {
      setUploadLoading(true);
      await uploadSkill(file);
      message.success('Skill上传成功');
      loadSkills();
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
    } finally {
      setUploadLoading(false);
      event.target.value = '';
    }
  };

  const handleUpdateFile = (skillId: number) => {
    setUpdatingSkillId(skillId);
    updateFileInputRef.current?.click();
  };

  const handleUpdateFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || updatingSkillId === null) return;

    if (!file.name.endsWith('.zip')) {
      message.error('请上传.zip格式的文件');
      event.target.value = '';
      return;
    }

    try {
      setUploadLoading(true);
      await uploadSkill(file, updatingSkillId);
      message.success('Skill文件更新成功');
      loadSkills();
    } catch (error) {
      console.error('更新文件失败:', error);
      message.error('更新文件失败，请重试');
    } finally {
      setUploadLoading(false);
      setUpdatingSkillId(null);
      event.target.value = '';
    }
  };

  const handleDownload = (skillId: number) => {
    const url = downloadSkill(skillId);
    window.open(url, '_blank');
  };

  const handleDelete = (id: number) => {
    const skill = skills.find(s => s.id === id);

    Modal.confirm({
      title: '确认删除Skill',
      content: (
        <div>
          <p>您即将删除以下Skill：</p>
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '6px', 
            margin: '12px 0' 
          }}>
            <p><strong>名称：</strong>{skill?.name}</p>
            <p><strong>ID：</strong>{skill?.id}</p>
            {skill?.description && <p><strong>描述：</strong>{skill?.description}</p>}
          </div>
          <p style={{ color: '#ff4d4f', fontWeight: 500 }}>
            此操作不可撤销，请确认是否继续？
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          await deleteSkill(id);
          setSkills(prev => prev.filter(skill => skill.id !== id));
          message.success('Skill删除成功');
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请重试');
        }
      },
    });
  };

  return (
    <div className={skillStyles.container}>
      <Card title="Skills管理" extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSkills}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUpload}
            loading={uploadLoading}
          >
            上传Skill
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={skills}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </Card>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="上传Skill文件"
      />
      <input
        ref={updateFileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleUpdateFileChange}
        aria-label="更新Skill文件"
      />
      <Modal
        title={`${instructionModal.name} - 指令详情`}
        open={instructionModal.visible}
        onCancel={() => setInstructionModal({ visible: false, name: '', content: '' })}
        footer={null}
        width={800}
      >
        <div style={{
          maxHeight: '60vh',
          overflow: 'auto',
          padding: '16px 20px',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.7',
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {instructionModal.content}
          </ReactMarkdown>
        </div>
      </Modal>
      <Modal
        title={`${filesModal.name} - 文件列表`}
        open={filesModal.visible}
        onCancel={() => setFilesModal({ visible: false, name: '', files: [] })}
        footer={null}
        width={500}
      >
        <div style={{
          maxHeight: '60vh',
          overflow: 'auto',
          padding: '12px 0',
        }}>
          {fileTreeData.length > 0 ? (
            <Tree
              showIcon
              defaultExpandAll
              selectable={false}
              treeData={fileTreeData}
              style={{ fontSize: '13px' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
              无文件
            </div>
          )}
        </div>
        <div style={{
          borderTop: '1px solid #f0f0f0',
          paddingTop: '8px',
          marginTop: '8px',
          fontSize: '12px',
          color: '#8c8c8c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>共 {filesModal.files.length} 个文件</span>
          <span>请下载后查看详细内容</span>
        </div>
      </Modal>
    </div>
  );
};

export default SkillsPage;
