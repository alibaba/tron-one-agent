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


import React, { createContext, useContext, useState, useEffect } from "react";
import { AgentConfig } from "../types/agent.interface";
import { getAllAgents } from "../services/agent";
import { ContentType } from "chatbox";

interface AgentContextType {
  agentId: string;
  agentName: string;
  agents: AgentConfig[];
  supportInputTypes?: ContentType[];
  setSelectedAgentId: (id: string) => void;
}

const AgentContext = createContext<AgentContextType>({
  agentId: "",
  agentName: "",
  agents: [],
  supportInputTypes: undefined,
  setSelectedAgentId: () => {},
});

export const AgentContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentId, setAgentId] = useState<string>("");

  useEffect(() => {
    getAllAgents()
      .then((result: any) => {
        const list: AgentConfig[] = result?.data || result || [];
        setAgents(list);
        if (list.length > 0) {
          setAgentId((prev) => prev || list[0].id || "");
        }
      })
      .catch(console.error);
  }, []);

  const selectedAgent = agents.find((a) => a.id === agentId);
  const agentName = selectedAgent?.name || "";
  const supportInputTypes = selectedAgent?.supportInputTypes;

  return (
    <AgentContext.Provider
      value={{ agentId, agentName, agents, supportInputTypes, setSelectedAgentId: setAgentId }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => useContext(AgentContext);

export default AgentContext;
