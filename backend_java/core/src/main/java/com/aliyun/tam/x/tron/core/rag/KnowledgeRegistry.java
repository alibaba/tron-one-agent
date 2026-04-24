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


package com.aliyun.tam.x.tron.core.rag;

import com.aliyun.tam.x.tron.core.config.AgentKnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.config.BailianKnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.config.ElasticSearchKnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.config.KnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.domain.repository.KnowledgeBaseRepository;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import io.agentscope.core.embedding.EmbeddingModel;
import io.agentscope.core.rag.Knowledge;
import io.agentscope.core.rag.integration.bailian.BailianConfig;
import io.agentscope.core.rag.integration.bailian.BailianKnowledge;
import io.agentscope.core.rag.integration.bailian.RerankConfig;
import io.agentscope.core.rag.integration.bailian.RewriteConfig;
import io.agentscope.core.rag.knowledge.SimpleKnowledge;
import io.agentscope.core.rag.store.ElasticsearchStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.Closeable;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

import static java.util.concurrent.TimeUnit.MINUTES;

@Component
@RequiredArgsConstructor
@Slf4j
public class KnowledgeRegistry {
    private final List<KnowledgeBaseConfigBuilder> knowledgeBaseConfigBuilders;

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    private final LoadingCache<KnowledgeBaseConfig, Optional<Knowledge>> knowledgeCache = CacheBuilder.newBuilder()
            .maximumSize(100)
            .expireAfterAccess(10, MINUTES)
            .<KnowledgeBaseConfig, Optional<Knowledge>>removalListener(notification -> {
                Knowledge value = notification.getValue().orElse(null);
                if (value == null) {
                    return;
                }
                if (value instanceof SimpleKnowledge sk && sk.getEmbeddingStore() instanceof Closeable close) {
                    try {
                        close.close();
                    } catch (IOException e) {
                        log.error("Error closing knowledge base", e);
                    }
                }
            })
            .build(new CacheLoader<>() {
                @Override
                public Optional<Knowledge> load(KnowledgeBaseConfig key) throws Exception {
                    return Optional.ofNullable(buildKnowledge(key));
                }
            });

    public List<Knowledge> buildKnowledgeBases(List<AgentKnowledgeBaseConfig> configs) {
        List<Knowledge> result = Lists.newArrayList();

        for (AgentKnowledgeBaseConfig config : configs) {
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                continue;
            }
            KnowledgeBaseConfig kbConfig = getConfig(config.getKnowledgeId());

            if (kbConfig == null || !Objects.equals(Boolean.TRUE, kbConfig.getEnabled())) {
                continue;
            }

            Knowledge knowledge = getKnowledge(kbConfig);
            if (knowledge != null) {
                result.add(knowledge);
            }
        }
        return result;
    }

    public List<KnowledgeBaseConfig> getConfigs() {
        Map<String, KnowledgeBaseConfig> configs = Maps.newLinkedHashMap();
        for (KnowledgeBaseConfigBuilder builder : knowledgeBaseConfigBuilders) {
            KnowledgeBaseConfig config = builder.getConfig();
            if (config == null) {
                continue;
            }
            configs.put(config.getId(), config);
        }
        for (KnowledgeBaseConfig config : knowledgeBaseRepository.listKnowledgeConfigs()) {
            if (configs.containsKey(config.getId())) {
                KnowledgeBaseConfig existing = configs.get(config.getId());
                config = existing.merge(config);
            }
            configs.put(config.getId(), config);
        }
        return Lists.newArrayList(configs.values());
    }

    public KnowledgeBaseConfig getConfig(String knowledgeId) {
        KnowledgeBaseConfig dbConfig = knowledgeBaseRepository.getKnowledgeConfig(knowledgeId);
        KnowledgeBaseConfig codeConfig = knowledgeBaseConfigBuilders.stream()
                .filter(b -> Objects.equals(knowledgeId, b.getId()))
                .findFirst()
                .map(KnowledgeBaseConfigBuilder::getConfig)
                .orElse(null);
        if (dbConfig == null) {
            return codeConfig;
        } else {
            return dbConfig.merge(codeConfig);
        }
    }

    public Knowledge getKnowledgeBase(String knowledgeId) {
        KnowledgeBaseConfig kbConfig = getConfig(knowledgeId);
        if (kbConfig == null) {
            return null;
        }
        return getKnowledge(kbConfig);
    }

    private Knowledge getKnowledge(KnowledgeBaseConfig kbConfig) {
        Optional<Knowledge> knowledge = knowledgeCache.getIfPresent(kbConfig);
        if (knowledge == null || knowledge.isEmpty()) {
            return null;
        }
        return knowledge.get();
    }


    private Knowledge buildKnowledge(KnowledgeBaseConfig kbConfig) throws Exception {
        if (kbConfig instanceof BailianKnowledgeBaseConfig config) {
            BailianConfig.Builder builder = BailianConfig.builder()
                    .workspaceId(config.getWorkspaceId())
                    .indexId(config.getIndexId())
                    .accessKeyId(config.getAccessKeyId())
                    .accessKeySecret(config.getAccessKeySecret())
                    .denseSimilarityTopK(config.getDenseSimilarityTopK())
                    .sparseSimilarityTopK(config.getSparseSimilarityTopK())
                    .saveRetrieverHistory(config.getSaveRetrieverHistory());
            if (Boolean.TRUE.equals(config.getEnableRewrite())) {
                builder.enableRewrite(true)
                        .rewriteConfig(RewriteConfig.builder()
                                .modelName(config.getRewriteModelName())
                                .build());
            }
            if (Boolean.TRUE.equals(config.getEnableRerank())) {
                builder.enableReranking(true)
                        .rerankConfig(RerankConfig.builder()
                                .modelName(config.getRerankModelName())
                                .rerankMinScore(config.getRerankMinScore())
                                .rerankTopN(config.getRerankTopK())
                                .build());
            }
            return BailianKnowledge.builder()
                    .config(builder.build())
                    .build();
        } else if (kbConfig instanceof ElasticSearchKnowledgeBaseConfig config) {
            config.getEmbeddingModelConfig().setDimensions(config.getDimensions());
            EmbeddingModel embeddingModel = config.getEmbeddingModelConfig().buildModel();

            ElasticsearchStore vectorStore = ElasticsearchStore.builder()
                    .url(config.getUrl())
                    .username(config.getUsername())
                    .password(config.getPassword())
                    .indexName(config.getIndexName())
                    .dimensions(config.getDimensions())
                    .build();

            return SimpleKnowledge.builder()
                    .embeddingModel(embeddingModel)
                    .embeddingStore(vectorStore)
                    .build();
        }
        return null;
    }


}
