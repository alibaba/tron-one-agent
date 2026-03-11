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


import React, { useState } from "react";
import { Layout, Menu, Button, Typography, Space, Badge } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  ApiOutlined,
  ToolOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { getThemeConfig } from "../../config/theme";
import layoutStyles from "./index.module.less";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const themeConfig = getThemeConfig();

  const menuItems = [
    {
      key: "/agents",
      icon: <RobotOutlined />,
      label: "Agents管理",
    },
    {
      key: "/mcp",
      icon: <ApiOutlined />,
      label: "MCP管理",
    },
    {
      key: "/tools",
      icon: <ToolOutlined />,
      label: "Tools管理",
    },
    {
      key: "/kb",
      icon: <DatabaseOutlined />,
      label: "知识库管理",
    },
    {
      key: "/skills",
      icon: <ThunderboltOutlined />,
      label: "Skills管理",
    },
    {
      key: "/debug",
      icon: <BugOutlined />,
      label: "调试",
      children: [
        {
          key: "/debug/agent",
          label: "Agents调试",
        },
        {
          key: "/debug/tool",
          label: "Tools调试",
        },
        {
          key: "/debug/mcp",
          label: "MCP调试",
        },
        {
          key: "/debug/kb",
          label: "知识库调试",
        },
      ],
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
          <Space>
            <RobotOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
            {!collapsed && (
              <Title level={4} style={{ margin: 0, color: "#fff" }}>
                {themeConfig.title}
              </Title>
            )}
          </Space>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
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
        </Header>
        <Content className={layoutStyles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
