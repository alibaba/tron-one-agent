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
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.Lists;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Component
@RequiredArgsConstructor
public final class AgentRegistry {

    @Data
    @RequiredArgsConstructor
    private static class CacheKey {
        private final AgentConfig agentConfig;
        private final String userId;
    }
    private final List<AgentBuilder> agentBuilders;

    private final LoadingCache<CacheKey, Optional<AgentHandler>> agentCache = CacheBuilder.newBuilder()
            .build(new CacheLoader<>() {
                @Override
                public Optional<AgentHandler> load(CacheKey key) throws Exception {
                    return Optional.ofNullable(buildAgent(key.agentConfig, key.userId));
                }
            });

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

    public AgentHandler getAgent(String agentId, AgentConfig agentConfig, String userId) {
        if (agentConfig == null) {
            agentConfig = getAgentConfigById(agentId);
        }
        if (agentConfig == null) {
            return null;
        }

        return agentCache.getUnchecked(new CacheKey(agentConfig, userId)).orElse(null);
    }

    private AgentHandler buildAgent(AgentConfig agentConfig, String userId) {
        String agentId = agentConfig.getId();
        for (AgentBuilder agentBuilder : agentBuilders) {
            if (Objects.equals(agentBuilder.getAgentId(), agentId)) {
                return new AgentHandlerLoggingWrapper(agentId, agentBuilder.build(agentId, agentConfig, userId));
            }
        }
        return null;
    }

    public List<AgentConfig> getAgentConfigs() {
        return agentBuilders.stream().map(AgentBuilder::getAgentConfig).toList();
    }
}
