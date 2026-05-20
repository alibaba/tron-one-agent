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
import { DeleteOutlined, ReloadOutlined, UploadOutlined, DownloadOutlined, FileZipOutlined, ReadOutlined, FolderOutlined, FileOutlined, LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { SkillConfig } from '../../types/skill.interface';
import { getAllSkills, uploadSkill, updateSkill, deleteSkill, downloadSkill } from '../../services/skill';
import { colors, commonStyles } from '../../styles/tokens';
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
  const { t } = useTranslation(['skills', 'common']);

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
              icon: <FileOutlined style={{ color: colors.bodyMuted }} />,
              isLeaf: true,
            };
          }
          return {
            key,
            title: name,
            icon: <FolderOutlined style={{ color: colors.accentPurpleLight }} />,
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
      title: t('common:id'),
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number, record: SkillConfig) => (
        record.builtin ? (
          <Tag icon={<LockOutlined />} color="purple">
            {t('skills:builtin')}
          </Tag>
        ) : (
          id
        )
      ),
    },
    {
      title: t('skills:columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('skills:columns.description'),
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
      title: t('skills:columns.instruction'),
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
      title: t('skills:columns.files'),
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
            {t('skills:fileCount', { count: files.length })}
          </Button>
        );
      },
    },
    {
      title: t('skills:columns.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: SkillConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
          disabled={record.builtin}
        />
      ),
    },
    {
      title: t('skills:columns.action'),
      key: 'action',
      render: (_, record: SkillConfig) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<UploadOutlined />}
            onClick={() => handleUpdateFile(record.id)}
            disabled={record.builtin}
          >
            {t('skills:updateFile')}
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.id)}
            disabled={record.builtin}
          >
            {t('skills:download')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            disabled={record.builtin}
          >
            {t('skills:delete')}
          </Button>
        </Space>
      ),
    },
  ];

  // Load skill list
  const loadSkills = async () => {
    try {
      setLoading(true);
      const response = await getAllSkills();
      setSkills(response.data || []);
    } catch (error) {
      console.error('Failed to load skills:', error);
      message.error(t('skills:loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await updateSkill(id, { enabled });
      setSkills(prev => prev.map(skill => 
        skill.id === id ? { ...skill, enabled } : skill
      ));
      message.success(enabled ? t('skills:enableSuccess') : t('skills:disableSuccess'));
    } catch (error) {
      console.error('Status update failed:', error);
      message.error(t('skills:toggleFailed'));
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      message.error(t('skills:uploadInvalid'));
      event.target.value = '';
      return;
    }

    try {
      setUploadLoading(true);
      await uploadSkill(file);
      message.success(t('skills:uploadSuccess'));
      loadSkills();
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(t('skills:uploadFailed'));
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
      message.error(t('skills:uploadInvalid'));
      event.target.value = '';
      return;
    }

    try {
      setUploadLoading(true);
      await uploadSkill(file, updatingSkillId);
      message.success(t('skills:updateSuccess'));
      loadSkills();
    } catch (error) {
      console.error('Update file failed:', error);
      message.error(t('skills:updateFailed'));
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
      title: t('skills:confirmDelete.title'),
      content: (
        <div>
          <p>{t('skills:confirmDelete.intro')}</p>
          <div style={commonStyles.confirmBox}>
            <p><strong>{t('skills:confirmDelete.name')}</strong>{skill?.name}</p>
            <p><strong>{t('skills:confirmDelete.id')}</strong>{skill?.id}</p>
            {skill?.description && <p><strong>{t('skills:confirmDelete.desc')}</strong>{skill?.description}</p>}
          </div>
          <p style={commonStyles.confirmWarning}>
            {t('skills:confirmDelete.warning')}
          </p>
        </div>
      ),
      okText: t('skills:confirmDelete.ok'),
      cancelText: t('common:cancel'),
      okType: 'danger',
      width: 500,
      onOk: async () => {
        try {
          await deleteSkill(id);
          setSkills(prev => prev.filter(skill => skill.id !== id));
          message.success(t('skills:deleteSuccess'));
        } catch (error) {
          console.error('Delete failed:', error);
          message.error(t('skills:deleteFailed'));
        }
      },
    });
  };

  return (
    <div className={skillStyles.container}>
      <Card title={t('skills:title')} extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSkills}
            loading={loading}
          >
            {t('common:refresh')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUpload}
            loading={uploadLoading}
          >
            {t('skills:uploadButton')}
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={skills}
          rowKey="id"
          loading={loading}
        />
      </Card>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label={t('skills:uploadAria')}
      />
      <input
        ref={updateFileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleUpdateFileChange}
        aria-label={t('skills:updateAria')}
      />
      <Modal
        title={t('skills:instructionModalTitle', { name: instructionModal.name })}
        open={instructionModal.visible}
        onCancel={() => setInstructionModal({ visible: false, name: '', content: '' })}
        footer={null}
        width={800}
      >
        <div style={{
          maxHeight: '60vh',
          overflow: 'auto',
          padding: '16px 20px',
          background: colors.surfacePearl,
          border: `1px solid ${colors.dividerSoft}`,
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
        title={t('skills:filesModalTitle', { name: filesModal.name })}
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
            <div style={{ textAlign: 'center', color: colors.bodyMuted, padding: '20px 0' }}>
              {t('skills:noFile')}
            </div>
          )}
        </div>
        <div style={{
          borderTop: `1px solid ${colors.dividerSoft}`,
          paddingTop: '8px',
          marginTop: '8px',
          fontSize: '12px',
          color: colors.bodyMuted,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{t('skills:fileSummary', { count: filesModal.files.length })}</span>
          <span>{t('skills:downloadHint')}</span>
        </div>
      </Modal>
    </div>
  );
};

export default SkillsPage;
