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


package com.aliyun.tam.x.tron.core.domain.models.messages;

import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.contents.TaskContent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Base session message model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public abstract class SessionMessage {
    private Long id;
    private SessionMessageStatus status;
    private String agentId;
    private String userId;
    private String sessionId;
    private LocalDateTime gmtCreate;
    private LocalDateTime gmtModified;

    public abstract SessionMessageType getType();

    public abstract List<Content> getContents();

    /**
     * Find task by task ID
     */
    public abstract TaskContent findTask(Long taskId);
}
