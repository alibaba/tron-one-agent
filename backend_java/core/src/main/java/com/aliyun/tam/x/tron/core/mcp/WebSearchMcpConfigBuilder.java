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

import com.aliyun.tam.x.tron.core.config.McpClientConfig;
import com.google.common.collect.ImmutableMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class WebSearchMcpConfigBuilder implements McpConfigBuilder {
    @Override
    public String getId() {
        return "WebSearch";
    }

    @Override
    public McpClientConfig getConfig() {
        String apiKey = System.getenv("DASHSCOPE_API_KEY");
        if (!StringUtils.hasText(apiKey)) {
            log.error("DASHSCOPE_API_KEY is required for WebSearch mcp client");
            return null;
        }
        return McpClientConfig.builder()
                .id(getId())
                .name("阿里云百炼_联网搜索")
                .description("基于通义实验室 Text-Embedding，GTE-reRank，Query 改写，搜索判定等多种检索模型及语义理解，串接专业搜索工程框架及各类型实时信息检索工具，提供实时互联网全栈信息检索，提升 LLM 回答准确性及时效性。")
                .transport(McpClientConfig.TRANSPORT_HTTP)
                .url("https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/mcp")
                .headers(ImmutableMap.of(
                        "Authorization", "Bearer " + apiKey
                ))
                .build();
    }
}
