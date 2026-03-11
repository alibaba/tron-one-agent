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


package com.aliyun.tam.x.tron.core.mcp;

import com.aliyun.tam.x.tron.core.config.AgentMcpConfig;
import com.aliyun.tam.x.tron.core.config.McpClientConfig;
import com.aliyun.tam.x.tron.core.domain.repository.McpClientRepository;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Maps;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.mcp.McpClientBuilder;
import io.agentscope.core.tool.mcp.McpClientWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Component
@RequiredArgsConstructor
@Slf4j
public class McpClientRegistry {
    private final List<McpConfigBuilder> mcpConfigBuilders;

    private final McpClientRepository clientRepository;

    private final Cache<String, Optional<McpClientWrapper>> mcpClientCache = CacheBuilder.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(3))
            .build();

    public void registerMcpClientsToToolkit(Toolkit toolkit, List<AgentMcpConfig> mcpClientConfigs) {
        if (CollectionUtils.isEmpty(mcpClientConfigs)) {
            return;
        }

        for (AgentMcpConfig config : mcpClientConfigs) {
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                continue;
            }

            McpClientConfig mcpConfig = clientRepository.getConfigById(config.getClientId());
            if (mcpConfig == null) {
                for (McpConfigBuilder mcpConfigBuilder : mcpConfigBuilders) {
                    if (Objects.equals(config.getClientId(), mcpConfigBuilder.getId())) {
                        mcpConfig = mcpConfigBuilder.getConfig();
                    }
                }
            }

            if (mcpConfig == null || !Objects.equals(Boolean.TRUE, mcpConfig.getEnabled())) {
                continue;
            }

            McpClientWrapper client = buildMcpClient(mcpConfig);
            if (client == null) {
                continue;
            }
            toolkit.registration()
                    .mcpClient(client)
                    .enableTools(config.getEnableFuncs())
                    .disableTools(config.getDisableFuncs())
                    .apply();
        }
    }

    public List<McpClientConfig> getClientConfigs() {
        Map<String, McpClientConfig> configs = Maps.newLinkedHashMap();
        for (McpConfigBuilder builder : mcpConfigBuilders) {
            McpClientConfig config = builder.getConfig();
            if (config == null) {
                continue;
            }
            configs.put(builder.getId(), builder.getConfig());
        }
        for (McpClientConfig config : clientRepository.listConfigs()) {
            configs.put(config.getId(), config);
        }
        return configs.values().stream().toList();
    }

    public McpClientConfig getClientConfigById(String clientId) {
        McpClientConfig config = clientRepository.getConfigById(clientId);
        if (config == null) {
            config = mcpConfigBuilders.stream()
                    .filter(builder -> Objects.equals(builder.getId(), clientId))
                    .findFirst()
                    .map(McpConfigBuilder::getConfig)
                    .orElse(null);
        }
        return config;

    }

    public McpClientWrapper getClient(String clientId) {
        McpClientConfig config = getClientConfigById(clientId);
        if (config == null) {
            return null;
        }
        return buildMcpClient(config);
    }

    private McpClientWrapper buildMcpClient(McpClientConfig config) {
        String cacheKey = String.format("%s_%d", config.getId(), config.hashCode());
        Exception lastError = null;
        try {
            for (int i = 0; i < 3; i++) {
                Optional<McpClientWrapper> client = mcpClientCache.get(cacheKey, () -> {
                    if (McpClientConfig.TRANSPORT_SSE.equalsIgnoreCase(config.getTransport())) {
                        return Optional.of(McpClientBuilder.create(config.getId())
                                .sseTransport(config.getUrl())
                                .initializationTimeout(Duration.ofSeconds(config.getTimeout()))
                                .timeout(Duration.ofSeconds(config.getSseReadTimeout()))
                                .headers(config.getHeaders())
                                .buildAsync()
                                .block());
                    } else if (McpClientConfig.TRANSPORT_HTTP.equalsIgnoreCase(config.getTransport())) {
                        return Optional.of(McpClientBuilder.create(config.getId())
                                .streamableHttpTransport(config.getUrl())
                                .initializationTimeout(Duration.ofSeconds(config.getTimeout()))
                                .timeout(Duration.ofMillis(config.getSseReadTimeout()))
                                .headers(config.getHeaders())
                                .buildAsync()
                                .block());
                    }
                    return Optional.empty();
                });

                if (client.isEmpty()) {
                    return null;
                }

                McpClientWrapper wrapper = client.get();
                try {
                    if (!wrapper.isInitialized()) {
                        wrapper.initialize().block();
                    }
                    wrapper.listTools().block();
                } catch (Exception e) {
                    lastError = e;
                    log.error("failed to check alive of mcp client {}, discard it", config.getId(), e);
                    mcpClientCache.invalidate(cacheKey);
                    continue;
                }
                return wrapper;
            }
        } catch (ExecutionException e) {
            throw new RuntimeException(e);
        }
        throw new RuntimeException("exceed max retry to build mcp client", lastError);
    }


    @Scheduled(fixedDelay = 300 * 1000)
    public void afterPropertiesSet() throws Exception {
        this.initAllClients();
    }


    private synchronized void initAllClients() {
        for (McpClientConfig config : getClientConfigs()) {
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                continue;
            }
            try {
                buildMcpClient(config);
            } catch (Exception e) {
                log.error("failed to initialize mcp client {}, ignore it", config.getId(), e);
            }
        }
    }
}
