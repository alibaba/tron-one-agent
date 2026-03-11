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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * MCP client configuration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpClientConfig {
    public static final String TRANSPORT_SSE = "sse";
    public static final String TRANSPORT_HTTP = "http";

    /**
     * MCP client ID
     */
    private String id;
    
    /**
     * MCP client enabled status
     */
    @Builder.Default
    private Boolean enabled = true;
    
    /**
     * MCP client name
     */
    private String name;
    
    /**
     * MCP client description
     */
    private String description;
    
    /**
     * MCP transport protocol: streamable_http or sse
     */
    @Builder.Default
    private String transport = "sse";
    
    /**
     * MCP service URL
     */
    private String url;
    
    /**
     * MCP request timeout in seconds
     */
    @Builder.Default
    private Integer timeout = 30;
    
    /**
     * SSE read timeout in seconds
     */
    @Builder.Default
    private Integer sseReadTimeout = 300;
    
    /**
     * MCP request headers
     */
    private Map<String, String> headers;
}
