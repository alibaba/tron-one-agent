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
import { Table, Button, Space, Modal, Card, message, Form, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AdminDTO } from '@/types/admin.interface';
import { listAdmins, createAdmin, updateAdminPassword, deleteAdmin } from '@/services/admin';
import styles from './index.module.less';

const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const columns: ColumnsType<AdminDTO> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '创建时间',
      dataIndex: 'gmtCreated',
      key: 'gmtCreated',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: AdminDTO) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.username)}
          >
            修改密码
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={record.username === 'admin'}
            onClick={() => handleDelete(record.username)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await listAdmins();
      setAdmins(response.data || []);
    } catch (error) {
      console.error('加载管理员列表失败:', error);
      message.error('加载管理员列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleEdit = (username: string) => {
    setEditingUsername(username);
    editForm.resetFields();
    setEditModalVisible(true);
  };

  const handleAdd = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      await createAdmin(values);
      message.success('管理员创建成功');
      setCreateModalVisible(false);
      loadAdmins();
    } catch (error) {
      console.error('创建管理员失败:', error);
      if (error instanceof Error) {
        message.error(error.message || '创建管理员失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingUsername) return;
      setSubmitting(true);
      await updateAdminPassword(editingUsername, { password: values.password });
      message.success('密码修改成功');
      setEditModalVisible(false);
      setEditingUsername(null);
    } catch (error) {
      console.error('修改密码失败:', error);
      if (error instanceof Error) {
        message.error(error.message || '修改密码失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (username: string) => {
    Modal.confirm({
      title: '确认删除管理员',
      content: (
        <div>
          <p>您即将删除管理员账号：</p>
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', margin: '12px 0' }}>
            <p><strong>用户名：</strong>{username}</p>
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
          await deleteAdmin(username);
          setAdmins(prev => prev.filter(a => a.username !== username));
          message.success('管理员删除成功');
        } catch (error) {
          console.error('删除管理员失败:', error);
          message.error('删除管理员失败，请重试');
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      <Card title="管理员管理" extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAdmins} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增管理员
          </Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={admins}
          rowKey="username"
          loading={loading}
        />
      </Card>

      <Modal
        title="新增管理员"
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={submitting}
        width={500}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="修改密码"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingUsername(null);
          editForm.resetFields();
        }}
        confirmLoading={submitting}
        width={500}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item
            name="password"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminsPage;
