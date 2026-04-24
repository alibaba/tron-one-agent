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


package com.aliyun.tam.x.tron.core.mem;

import com.aliyun.tam.x.tron.core.config.BailianLongTermMemoryConfig;
import com.aliyun.tam.x.tron.core.config.LongTermMemoryConfig;
import com.aliyun.tam.x.tron.core.domain.repository.LongTermMemoryRepository;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;
import io.agentscope.core.memory.LongTermMemory;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@Slf4j
public class LongTermMemoryRegistry {

    private final List<LongTermMemoryConfigBuilder> longTermMemoryConfigBuilders;

    private final LongTermMemoryRepository longTermMemoryRepository;

    private final RestClient restClient;

    public LongTermMemoryRegistry(
            List<LongTermMemoryConfigBuilder> longTermMemoryConfigBuilders,
            LongTermMemoryRepository longTermMemoryRepository,
            RestClient.Builder restClientBuilder) {
        this.longTermMemoryConfigBuilders = longTermMemoryConfigBuilders;
        this.longTermMemoryRepository = longTermMemoryRepository;
        this.restClient = restClientBuilder.build();
    }

    public List<LongTermMemoryConfig> getConfigs() {
        Map<String, LongTermMemoryConfig> configs = Maps.newLinkedHashMap();
        for (LongTermMemoryConfigBuilder builder : longTermMemoryConfigBuilders) {
            LongTermMemoryConfig config = builder.getConfig();
            if (config == null) {
                continue;
            }
            configs.put(builder.getId(), config);
        }
        for (LongTermMemoryConfig config : longTermMemoryRepository.listConfigs()) {
            if (configs.containsKey(config.getId())) {
                LongTermMemoryConfig existing = configs.get(config.getId());
                config = existing.merge(config);
            }
            configs.put(config.getId(), config);
        }
        return configs.values().stream().toList();
    }

    public LongTermMemoryConfig getConfigById(String memoryId) {
        LongTermMemoryConfig dbConfig = longTermMemoryRepository.getConfigById(memoryId);
        LongTermMemoryConfig codeConfig = longTermMemoryConfigBuilders.stream()
                .filter(b -> Objects.equals(memoryId, b.getId()))
                .findFirst()
                .map(LongTermMemoryConfigBuilder::getConfig)
                .orElse(null);
        if (dbConfig == null) {
            return codeConfig;
        } else {
            return dbConfig.merge(codeConfig);
        }
    }

    public LongTermMemory create(String userId) {
        List<LongTermMemoryConfig> configs = getConfigs();
        LongTermMemoryConfig config = configs.stream()
                .filter(c -> Boolean.TRUE.equals(c.getEnabled()))
                .findFirst()
                .orElse(null);
        if (config == null) {
            return new LongTermMemory() {
                @Override
                public Mono<Void> record(List<Msg> msgs) {
                    return Mono.empty();
                }

                @Override
                public Mono<String> retrieve(Msg msg) {
                    return Mono.empty();
                }
            };
        }
        return createMemory(userId, config);
    }

    private LongTermMemory createMemory(String userId, LongTermMemoryConfig config) {
        if (config instanceof BailianLongTermMemoryConfig bailianConfig) {
            return createBailianMemory(userId, bailianConfig);
        }
        throw new IllegalArgumentException("Unsupported long term memory type: " + config.getTypeEnum());
    }

    private LongTermMemory createBailianMemory(String userId, BailianLongTermMemoryConfig config) {
        String apiKey = config.getApiKey();
        String memoryLibraryId = config.getMemoryLibraryId();
        String projectId = config.getProjectId();
        String profileSchema = config.getProfileSchema();
        return new LongTermMemory() {
            @Override
            public Mono<Void> record(List<Msg> msgs) {
                return Mono.fromRunnable(() -> {
                    restClient.post()
                            .uri("https://dashscope.aliyuncs.com/api/v2/apps/memory/add")
                            .header("Authorization", "Bearer " + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(toAddMemoryRequest(userId, msgs, memoryLibraryId, projectId, profileSchema))
                            .retrieve()
                            .body(Void.class);
                });
            }

            @Override
            public Mono<String> retrieve(Msg msg) {
                return Mono.fromCallable(() -> {
                    return restClient.post()
                            .uri("https://dashscope.aliyuncs.com/api/v2/apps/memory/memory_nodes/search")
                            .header("Authorization", "Bearer " + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(toSearchMemoryRequest(userId, msg, memoryLibraryId, projectId))
                            .retrieve()
                            .body(String.class);
                });
            }
        };
    }

    private Map<String, Object> toSearchMemoryRequest(String userId, Msg msg, String memoryLibraryId, String projectId) {
        ImmutableMap.Builder<String, Object> request = ImmutableMap.builder();
        request.put("user_id", processUserId(userId));

        if (StringUtils.hasText(memoryLibraryId)) {
            request.put("memory_library_id", memoryLibraryId);
        }
        if (StringUtils.hasText(projectId)) {
            request.put("project_id", projectId);
        }

        ImmutableList.Builder<Map<String, Object>> messages = ImmutableList.builder();
        if (msg.getRole() == MsgRole.USER && msg.getTextContent() != null) {
            messages.add(ImmutableMap.of("role", "user", "content", msg.getTextContent()));
        } else if (msg.getRole() == MsgRole.ASSISTANT && msg.getTextContent() != null) {
            messages.add(ImmutableMap.of("role", "assistant", "content", msg.getTextContent()));
        }
        request.put("messages", messages.build());
        return request.build();
    }

    private Map<String, Object> toAddMemoryRequest(String userId, List<Msg> msgs, String memoryLibraryId, String projectId, String profileSchema) {
        ImmutableMap.Builder<String, Object> request = ImmutableMap.builder();
        request.put("user_id", processUserId(userId));

        if (StringUtils.hasText(memoryLibraryId)) {
            request.put("memory_library_id", memoryLibraryId);
        }
        if (StringUtils.hasText(profileSchema)) {
            request.put("profile_schema", profileSchema);
        }
        if (StringUtils.hasText(projectId)) {
            request.put("project_id", projectId);
        }

        ImmutableList.Builder<Map<String, Object>> messages = ImmutableList.builder();
        for (Msg msg : msgs) {
            if (msg.getRole() == MsgRole.USER && msg.getTextContent() != null) {
                messages.add(ImmutableMap.of("role", "user", "content", msg.getTextContent()));
            } else if (msg.getRole() == MsgRole.ASSISTANT && msg.getTextContent() != null) {
                messages.add(ImmutableMap.of("role", "assistant", "content", msg.getTextContent()));
            }
        }
        request.put("messages", messages.build());
        return request.build();
    }

    private String processUserId(String userId) {
        if (userId.length() < 4) {
            return org.apache.commons.lang3.StringUtils.leftPad(userId, 4, '0');
        }
        if (userId.length() > 64) {
            return userId.substring(0, 64);
        }
        return userId;
    }

}
