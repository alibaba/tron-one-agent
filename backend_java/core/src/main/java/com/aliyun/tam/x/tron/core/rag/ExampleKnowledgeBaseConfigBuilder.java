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

import com.aliyun.tam.x.tron.core.config.BailianKnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.config.KnowledgeBaseConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExampleKnowledgeBaseConfigBuilder implements KnowledgeBaseConfigBuilder{
    @Value("${tron.bailian.rag.access-key-id}")
    private String accessKeyId;

    @Value("${tron.bailian.rag.access-key-secret}")
    private String accessKeySecret;

    @Override
    public String getId() {
        return "bailian_rag";
    }

    @Override
    public KnowledgeBaseConfig getConfig() {
        return BailianKnowledgeBaseConfig.builder()
                .id(getId())
                .name("百炼知识库配置样例")
                .accessKeyId(accessKeyId)
                .accessKeySecret(accessKeySecret)
                .workspaceId("123456")
                .indexId("123456")
                .enableRewrite(true)
                .enableRerank(true)
                .build();
    }
}
