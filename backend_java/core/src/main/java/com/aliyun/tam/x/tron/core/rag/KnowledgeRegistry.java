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
import com.aliyun.tam.x.tron.core.config.KnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.domain.repository.KnowledgeBaseRepository;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import io.agentscope.core.rag.Knowledge;
import io.agentscope.core.rag.integration.bailian.BailianConfig;
import io.agentscope.core.rag.integration.bailian.BailianKnowledge;
import io.agentscope.core.rag.integration.bailian.RerankConfig;
import io.agentscope.core.rag.integration.bailian.RewriteConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class KnowledgeRegistry {
    private final List<KnowledgeBaseConfigBuilder> knowledgeBaseConfigBuilders;

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    public List<Knowledge> buildKnowledgeBases(List<AgentKnowledgeBaseConfig> configs) {
        List<Knowledge> result = Lists.newArrayList();

        for (AgentKnowledgeBaseConfig config : configs) {
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                continue;
            }
            KnowledgeBaseConfig kbConfig = knowledgeBaseRepository.getKnowledgeConfig(config.getKnowledgeId());
            if (kbConfig == null) {
                kbConfig = knowledgeBaseConfigBuilders.stream()
                        .filter(b -> Objects.equals(config.getKnowledgeId(), b.getId()))
                        .findFirst()
                        .map(KnowledgeBaseConfigBuilder::getConfig)
                        .orElse(null);
            }

            if (kbConfig == null || !Objects.equals(Boolean.TRUE, kbConfig.getEnabled())) {
                continue;
            }

            Knowledge knowledge = buildKnowledge(kbConfig);
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
            configs.put(config.getId(), config);
        }
        for (KnowledgeBaseConfig config : knowledgeBaseRepository.listKnowledgeConfigs()) {
            configs.put(config.getId(), config);
        }
        return Lists.newArrayList(configs.values());
    }

    public KnowledgeBaseConfig getConfig(String knowledgeId) {
        KnowledgeBaseConfig kbConfig = knowledgeBaseRepository.getKnowledgeConfig(knowledgeId);
        if (kbConfig == null) {
            kbConfig = knowledgeBaseConfigBuilders.stream()
                    .filter(b -> Objects.equals(knowledgeId, b.getId()))
                    .findFirst()
                    .map(KnowledgeBaseConfigBuilder::getConfig)
                    .orElse(null);
        }
        return kbConfig;
    }

    public Knowledge getKnowledgeBase(String knowledgeId) {
        KnowledgeBaseConfig kbConfig = getConfig(knowledgeId);
        if (kbConfig == null) {
            return null;
        }

        return buildKnowledge(kbConfig);
    }

    private Knowledge buildKnowledge(KnowledgeBaseConfig kbConfig) {
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
        }
        return null;
    }


}
