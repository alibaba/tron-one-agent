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


package com.aliyun.tam.x.tron.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Session model
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDTO {
    /**
     * Session ID
     */
    private String id;

    /**
     * User ID
     */
    private String userId;

    /**
     * Agent ID
     */
    private String agentId;

    /**
     * Session name
     */
    @Builder.Default
    private String name = "";

    /**
     * Last applied event ID
     */
    @Builder.Default
    private Long lastAppliedEventId = 0L;

    /**
     * Created time
     */
    private LocalDateTime gmtCreated;

    /**
     * Modified time
     */
    private LocalDateTime gmtModified;

    /**
     * Page result of session messages
     */
    private PageResultDTO<SessionMessageDTO> messages;
}
