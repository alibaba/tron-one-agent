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


import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Typography } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  ApiOutlined,
  ToolOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getThemeConfig } from "../../config/theme";
import { getUsername, clearAuth } from '@/utils/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import layoutStyles from "./index.module.less";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

/** Derive which submenu should be expanded based on the current pathname. */
const getOpenKeys = (pathname: string): string[] => {
  if (pathname.startsWith('/agents') || pathname.startsWith('/debug/agent')) return ['agents-group'];
  if (pathname.startsWith('/tools') || pathname.startsWith('/debug/tool')) return ['tools-group'];
  if (pathname.startsWith('/mcp') || pathname.startsWith('/debug/mcp')) return ['mcp-group'];
  if (pathname.startsWith('/kb') || pathname.startsWith('/debug/kb')) return ['kb-group'];
  return [];
};

/** Map the current pathname to the correct menu item key for selection highlighting. */
const getSelectedKey = (pathname: string): string[] => {
  if (pathname === '/agents' || pathname.startsWith('/agents/')) return ['/agents'];
  if (pathname === '/debug/agent') return ['/debug/agent'];
  if (pathname === '/tools') return ['/tools'];
  if (pathname === '/debug/tool') return ['/debug/tool'];
  if (pathname === '/mcp' || pathname.startsWith('/mcp/')) return ['/mcp'];
  if (pathname === '/debug/mcp') return ['/debug/mcp'];
  if (pathname === '/kb' || pathname.startsWith('/kb/')) return ['/kb'];
  if (pathname === '/debug/kb') return ['/debug/kb'];
  if (pathname === '/skills') return ['/skills'];
  if (pathname === '/memory') return ['/memory'];
  return [pathname];
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const themeConfig = getThemeConfig();
  const { t } = useTranslation(['menu', 'layout']);
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeys(location.pathname));

  useEffect(() => {
    setOpenKeys(getOpenKeys(location.pathname));
  }, [location.pathname]);

  const menuItems = [
    {
      key: "agents-group",
      icon: <RobotOutlined />,
      label: t('menu:agents'),
      children: [
        { key: "/agents", label: t('menu:manage') },
        { key: "/debug/agent", label: t('menu:debug') },
      ],
    },
    {
      key: "tools-group",
      icon: <ToolOutlined />,
      label: t('menu:tools'),
      children: [
        { key: "/tools", label: t('menu:manage') },
        { key: "/debug/tool", label: t('menu:debug') },
      ],
    },
    {
      key: "mcp-group",
      icon: <ApiOutlined />,
      label: t('menu:mcp'),
      children: [
        { key: "/mcp", label: t('menu:manage') },
        { key: "/debug/mcp", label: t('menu:debug') },
      ],
    },
    {
      key: "kb-group",
      icon: <DatabaseOutlined />,
      label: t('menu:kb'),
      children: [
        { key: "/kb", label: t('menu:manage') },
        { key: "/debug/kb", label: t('menu:debug') },
      ],
    },
    {
      key: "/skills",
      icon: <ThunderboltOutlined />,
      label: t('menu:skills'),
    },
    {
      key: "/memory",
      icon: <BulbOutlined />,
      label: t('menu:memory'),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout className={layoutStyles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={layoutStyles.sider}
      >
        <div className={layoutStyles.logo}>
          {!collapsed && (
            <Title level={4} className={layoutStyles.logoTitle}>
              {themeConfig.title}
            </Title>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKey(location.pathname)}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className={layoutStyles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={layoutStyles.trigger}
          />
          <div className={layoutStyles.userInfo}>
            <LanguageSwitcher />
            <span className={layoutStyles.username}>
              {getUsername() || t('layout:defaultUser')}
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                clearAuth();
                navigate('/login');
              }}
            >
              {t('layout:logout')}
            </Button>
          </div>
        </Header>
        <Content className={layoutStyles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
