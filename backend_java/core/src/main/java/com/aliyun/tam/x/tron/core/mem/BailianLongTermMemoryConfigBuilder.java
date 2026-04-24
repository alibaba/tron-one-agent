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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class BailianLongTermMemoryConfigBuilder implements LongTermMemoryConfigBuilder {

    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    @Value("${memory.long.bailian.memory_library_id:}")
    private String memoryLibraryId;

    @Value("${memory.long.bailian.project_id:}")
    private String projectId;

    @Value("${memory.long.bailian.profile_schema:}")
    private String profileSchema;

    @Override
    public String getId() {
        return "bailian_memory";
    }

    @Override
    public LongTermMemoryConfig getConfig() {
        if (!StringUtils.hasText(apiKey)) {
            log.warn("api-key is not configured for bailian long term memory");
            return null;
        }
        return BailianLongTermMemoryConfig.builder()
                .id(getId())
                .name("百炼长期记忆")
                .apiKey(apiKey)
                .memoryLibraryId(memoryLibraryId)
                .projectId(projectId)
                .profileSchema(profileSchema)
                .build();
    }
}
