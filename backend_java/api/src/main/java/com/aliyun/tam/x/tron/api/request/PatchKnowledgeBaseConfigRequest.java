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


package com.aliyun.tam.x.tron.api.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Session model
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatchKnowledgeBaseConfigRequest {
    /**
     * Bailian knowledge base ID
     */
    private String id;

    /**
     * Bailian knowledge base enabled status
     */
    private Boolean enabled;

    /**
     * Bailian knowledge base name
     */
    private String name;

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
    private Boolean enableRewrite;

    /**
     * Enable rerank
     */
    private Boolean enableRerank;
}
