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
 * elasticsearch knowledge base configuration
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonTypeName("2")
public class ElasticSearchKnowledgeBaseConfig extends KnowledgeBaseConfig {

    private String url;

    private String username;

    private String password;

    private String indexName;

    private Integer dimensions;

    private DashscopeEmbeddingModelConfig embeddingModelConfig;

    @Override
    public KnowledgeBaseType getTypeEnum() {
        return KnowledgeBaseType.ELASTIC_SEARCH;
    }
}
