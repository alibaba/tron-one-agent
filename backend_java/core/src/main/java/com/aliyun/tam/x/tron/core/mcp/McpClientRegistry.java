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
import com.google.common.collect.Maps;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.mcp.McpClientBuilder;
import io.agentscope.core.tool.mcp.McpClientWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class McpClientRegistry {

    private final List<McpConfigBuilder> mcpConfigBuilders;

    private final McpClientRepository clientRepository;

    public void registerMcpClientsToToolkit(Toolkit toolkit, List<AgentMcpConfig> mcpClientConfigs) {
        if (CollectionUtils.isEmpty(mcpClientConfigs)) {
            return;
        }

        for (AgentMcpConfig config : mcpClientConfigs) {
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                continue;
            }

            McpClientConfig mcpConfig = getClientConfigById(config.getClientId());

            if (mcpConfig == null || !Objects.equals(Boolean.TRUE, mcpConfig.getEnabled())) {
                continue;
            }

            McpClientWrapper client = getClient(mcpConfig);
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
            if (configs.containsKey(config.getId())) {
                McpClientConfig existing = configs.get(config.getId());
                config = existing.merge(config);
            }
            configs.put(config.getId(), config);
        }
        return configs.values().stream().toList();
    }

    public McpClientConfig getClientConfigById(String clientId) {
        McpClientConfig dbConfig = clientRepository.getConfigById(clientId);
        McpClientConfig codeConfig = mcpConfigBuilders.stream()
                .filter(builder -> Objects.equals(builder.getId(), clientId))
                .findFirst()
                .map(McpConfigBuilder::getConfig)
                .orElse(null);
        if (dbConfig == null) {
            return codeConfig;
        } else {
            return dbConfig.merge(codeConfig);
        }
    }

    public McpClientWrapper getClient(String clientId) {
        McpClientConfig config = getClientConfigById(clientId);
        if (config == null) {
            return null;
        }
        return getClient(config);
    }

    private McpClientWrapper getClient(McpClientConfig config) {
        try {
            return buildMcpClient(config).orElse(null);
        } catch (Exception e) {
            log.error("Failed to build mcp client: {}", config.getId(), e);
            return null;
        }
    }

    private Optional<McpClientWrapper> buildMcpClient(McpClientConfig config) throws Exception {
        McpClientWrapper wrapper = null;
        if (McpClientConfig.TRANSPORT_SSE.equalsIgnoreCase(config.getTransport())) {
            wrapper = McpClientBuilder.create(config.getId())
                    .sseTransport(config.getUrl())
                    .initializationTimeout(Duration.ofSeconds(config.getInitializeTimeout()))
                    .timeout(Duration.ofSeconds(config.getTimeout()))
                    .headers(config.getHeaders())
                    .buildAsync()
                    .subscribeOn(Schedulers.boundedElastic())
                    .block();
        } else if (McpClientConfig.TRANSPORT_HTTP.equalsIgnoreCase(config.getTransport())) {
            wrapper = McpClientBuilder.create(config.getId())
                    .streamableHttpTransport(config.getUrl())
                    .initializationTimeout(Duration.ofSeconds(config.getInitializeTimeout()))
                    .timeout(Duration.ofSeconds(config.getTimeout()))
                    .headers(config.getHeaders())
                    .buildAsync()
                    .subscribeOn(Schedulers.boundedElastic())
                    .block();
        }

        if (wrapper == null) {
            return Optional.empty();
        }
        if (!wrapper.isInitialized()) {
            wrapper.initialize()
                    .then(Mono.defer(wrapper::listTools))
                    .subscribeOn(Schedulers.boundedElastic())
                    .block();
        } else {
            wrapper.listTools()
                    .subscribeOn(Schedulers.boundedElastic())
                    .block();
        }
        return Optional.of(wrapper);
    }

}
