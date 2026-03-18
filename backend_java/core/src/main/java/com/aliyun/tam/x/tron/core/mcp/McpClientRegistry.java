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
import com.google.common.cache.*;
import com.google.common.collect.Maps;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListenableFutureTask;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.mcp.McpClientBuilder;
import io.agentscope.core.tool.mcp.McpClientWrapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class McpClientRegistry {
    private final ExecutorService executor = new ThreadPoolExecutor(1, 10, Long.MAX_VALUE, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(100),
            r -> {
                Thread t = new Thread(r, "mcp-client-builder");
                t.setDaemon(true);
                return t;
            },
            new ThreadPoolExecutor.CallerRunsPolicy());

    private final List<McpConfigBuilder> mcpConfigBuilders;

    private final McpClientRepository clientRepository;

    private final LoadingCache<McpClientConfig, Optional<McpClientWrapper>> mcpClientCache = CacheBuilder.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .refreshAfterWrite(3, TimeUnit.MINUTES)
            .removalListener((RemovalListener<McpClientConfig, Optional<McpClientWrapper>>) notification -> {
                log.info("mcp client removed: {}", notification.getKey());
                notification.getValue().ifPresent(McpClientWrapper::close);
            })
            .build(new CacheLoader<>() {
                @Override
                public Optional<McpClientWrapper> load(McpClientConfig key) throws Exception {
                    log.info("building mcp client: {}", key);
                    return buildMcpClient(key);
                }

                @Override
                public ListenableFuture<Optional<McpClientWrapper>> reload(McpClientConfig key, Optional<McpClientWrapper> oldValue) throws Exception {
                    ListenableFutureTask<Optional<McpClientWrapper>> task = ListenableFutureTask.create(() -> {
                        log.info("rebuilding mcp client: {}", key);
                        McpClientConfig config = getClientConfigById(key.getId());
                        if (Objects.equals(config, key)) {
                            return oldValue;
                        }
                        return Optional.empty();
                    });
                    executor.submit(task);
                    return task;
                }

                @Override
                public Map<McpClientConfig, Optional<McpClientWrapper>> loadAll(Iterable<? extends McpClientConfig> keys) throws Exception {
                    log.info("building all mcp clients");
                    Map<McpClientConfig, Optional<McpClientWrapper>> result = Maps.newHashMap();
                    for (McpClientConfig key : keys) {
                        Optional<McpClientWrapper> value = buildMcpClient(key);
                        result.put(key, value);
                    }
                    return result;
                }
            });

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
        return mcpClientCache.getUnchecked(config).orElse(null);
    }

    private McpClientWrapper getClient(McpClientConfig config) {
        return mcpClientCache.getUnchecked(config).orElse(null);
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

    @PostConstruct
    public void init() throws ExecutionException {
        mcpClientCache.getAll(getClientConfigs());
    }
}
