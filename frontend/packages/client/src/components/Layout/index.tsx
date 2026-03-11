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


import React from "react";
import { Layout, Typography, Space, Dropdown, Avatar, Select } from "antd";
import { RobotOutlined, UserOutlined, AppstoreOutlined } from "@ant-design/icons";
import { Outlet } from "react-router-dom";
import { useNavigate, useLocation } from "react-router";
import { getThemeConfig } from "../../config/theme";
import { useAgentContext } from "../../context/AgentContext";
import layoutStyles from "./index.module.less";

const { Header, Content } = Layout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const themeConfig = getThemeConfig();
  const navigator = useNavigate();
  const location = useLocation();
  const { agents, agentId, setSelectedAgentId } = useAgentContext();

  const handleAgentChange = (value: string) => {
    setSelectedAgentId(value);
    // 已在 chat 页面时才跳转，其他页面不自动跳转
    if (location.pathname === "/chat") {
      navigator("/chat");
    }
  };

  // 用户菜单项
  const userMenuItems = [
    {
      key: "profile",
      label: "个人资料",
    },
    {
      key: "settings",
      label: "设置",
    },
    {
      key: "logout",
      label: "退出登录",
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    console.log("用户菜单点击:", key);
    // 这里可以处理用户菜单的点击事件
  };

  const handleDemoClick = () => {
    window.open("#/demo", "_blank");
  };

  return (
    <Layout className={layoutStyles.layoutWithoutSider}>
      <Header className={layoutStyles.headerWithoutSider}>
        <div className={layoutStyles.headerLeft}>
          <Space size="middle" onClick={() => navigator("/home")}>
            <RobotOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              {themeConfig.title}
            </Title>
          </Space>
        </div>
        <div className={layoutStyles.headerRight}>
          <Space size="middle">
            <div className={layoutStyles.agentSelectWrap}>
              <AppstoreOutlined className={layoutStyles.agentSelectIcon} />
              <Select
                value={agentId || undefined}
                onChange={handleAgentChange}
                placeholder="选择 Agent"
                style={{ minWidth: 150, color: "#fff" }}
                options={agents.map((a) => ({ label: a.name, value: a.id }))}
                variant="borderless"
                className={layoutStyles.agentSelect}
              />
            </div>
            <span
              style={{ color: "#fff", cursor: "pointer" }}
              onClick={handleDemoClick}
            >
              示例
            </span>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <Space style={{ cursor: "pointer" }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span style={{ color: "#fff" }}>用户</span>
              </Space>
            </Dropdown>
          </Space>
        </div>
      </Header>
      <Content className={layoutStyles.contentWithoutSider}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AppLayout;
