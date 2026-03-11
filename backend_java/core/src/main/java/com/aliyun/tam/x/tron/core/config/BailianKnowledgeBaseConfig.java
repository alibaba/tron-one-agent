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


package com.aliyun.tam.x.tron.core.config;

import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Bailian knowledge base configuration
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonTypeName("1")
public class BailianKnowledgeBaseConfig extends KnowledgeBaseConfig {


    private String accessKeyId;

    private String accessKeySecret;

    /**
     * Bailian workspace ID
     */
    private String workspaceId;

    /**
     * x
     * Bailian index ID
     */
    private String indexId;

    /**
     * Enable rewrite
     */
    @Builder.Default
    private Boolean enableRewrite = true;

    private String rewriteModelName;

    /**
     * Enable rerank
     */
    @Builder.Default
    private Boolean enableRerank = true;

    @Builder.Default
    private String rerankModelName = "qwen3-rerank";

    @Builder.Default
    private Float rerankMinScore = 0.2f;

    @Builder.Default
    private Integer rerankTopK = 5;

    @Builder.Default
    private Integer denseSimilarityTopK = 50;

    @Builder.Default
    private Integer sparseSimilarityTopK = 50;

    @Builder.Default
    private Boolean saveRetrieverHistory = true;

    @Override
    public KnowledgeBaseType getTypeEnum() {
        return KnowledgeBaseType.BAILIAN;
    }
}
