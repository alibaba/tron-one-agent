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


package com.aliyun.tam.x.tron.core.agents;

import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.google.common.collect.Lists;
import io.opentelemetry.api.trace.Tracer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public final class AgentRegistry {

    private final List<AgentBuilder> agentBuilders;

    private final Tracer tracer;

    public List<AgentBuilder> getAgentBuilders() {
        return Lists.newArrayList(agentBuilders);
    }

    public AgentConfig getAgentConfigById(String agentId) {
        for (AgentBuilder agentBuilder : agentBuilders) {
            if (Objects.equals(agentBuilder.getAgentId(), agentId)) {
                return agentBuilder.getAgentConfig();
            }
        }
        return null;
    }

    public AgentHandler getAgent(String agentId, AgentConfig agentConfig, String userId, String sessionId) {
        if (agentConfig == null) {
            agentConfig = getAgentConfigById(agentId);
        }
        if (agentConfig == null) {
            return null;
        }
        return buildAgent(agentConfig, userId, sessionId);
    }

    private AgentHandler buildAgent(AgentConfig agentConfig, String userId, String sessionId) {
        String agentId = agentConfig.getId();
        for (AgentBuilder agentBuilder : agentBuilders) {
            if (Objects.equals(agentBuilder.getAgentId(), agentId)) {
                return new AgentHandlerLoggingWrapper(agentId, agentBuilder.build(agentId, agentConfig, userId, sessionId), tracer);
            }
        }
        return null;
    }

    public List<AgentConfig> getAgentConfigs() {
        return agentBuilders.stream().map(AgentBuilder::getAgentConfig).toList();
    }
}
