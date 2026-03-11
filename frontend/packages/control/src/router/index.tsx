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
import { createHashRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/Layout';
import AgentsPage from '../pages/Agents';
import AgentDetail from '../pages/Agents/Detail';
import MCPPage from '../pages/MCP';
import MCPDetail from '../pages/MCP/Detail';
import ToolsPage from '../pages/Tools';
import KBPage from '../pages/KB';
import KBDetail from '../pages/KB/Detail';
import SkillsPage from '../pages/Skills';
import AgentDebugPage from '../pages/Debug/Agent';
import ToolDebugPage from '../pages/Debug/Tool';
import McpDebugPage from '../pages/Debug/Mcp';
import KbDebugPage from '../pages/Debug/Kb';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/agents" replace />,
      },
      {
        path: '/agents',
        element: <AgentsPage />,
      },
      {
        path: '/agents/:id',
        element: <AgentDetail />,
      },
      {
        path: '/mcp',
        element: <MCPPage />,
      },
      {
        path: '/mcp/:id',
        element: <MCPDetail />,
      },
      {
        path: '/tools',
        element: <ToolsPage />,
      },
      {
        path: '/kb',
        element: <KBPage />,
      },
      {
        path: '/kb/:id',
        element: <KBDetail />,
      },
      {
        path: '/skills',
        element: <SkillsPage />,
      },
      {
        path: '/debug/agent',
        element: <AgentDebugPage />,
      },
      {
        path: '/debug/tool',
        element: <ToolDebugPage />,
      },
      {
        path: '/debug/mcp',
        element: <McpDebugPage />,
      },
      {
        path: '/debug/kb',
        element: <KbDebugPage />,
      },
    ],
  },
]);
