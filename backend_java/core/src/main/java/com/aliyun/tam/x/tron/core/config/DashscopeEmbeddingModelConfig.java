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

import com.aliyun.tam.x.tron.utils.encrypt.Encrypted;
import com.fasterxml.jackson.annotation.JsonTypeName;
import io.agentscope.core.embedding.EmbeddingModel;
import io.agentscope.core.embedding.dashscope.DashScopeTextEmbedding;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * dashscope embedding model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonTypeName("1")
public class DashscopeEmbeddingModelConfig extends EmbeddingModelConfig {
    @Encrypted
    @Builder.Default
    private String apiKey = System.getenv("DASHSCOPE_API_KEY");

    private String baseUrl;

    private String modelName;

    private Integer dimensions;

    @Override
    public EmbeddingModelProvider getProviderEnum() {
        return EmbeddingModelProvider.DASHSCOPE;
    }

    @Override
    public EmbeddingModel buildModel() {
        return DashScopeTextEmbedding.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName(modelName)
                .dimensions(dimensions)
                .build();
    }
}
