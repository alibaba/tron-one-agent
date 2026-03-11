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

import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Session model
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionMessageDTO {
    public static SessionMessageDTO from(SessionMessage message) {
        if (message == null) {
            return null;
        }

        SessionMessageDTO.SessionMessageDTOBuilder builder = builder()
                .id(message.getId())
                .type(message.getType().getValue())
                .status(message.getStatus().getValue())
                .agentId(message.getAgentId())
                .userId(message.getUserId())
                .contents(ContentDTO.from(message.getContents()))
                .sessionId(message.getSessionId())
                .gmtCreate(message.getGmtCreate())
                .gmtModified(message.getGmtModified());

        if (message instanceof AgentSessionMessage agentSessionMessage) {
            builder.gmtFinished(agentSessionMessage.getGmtFinished());
        } else if (message instanceof UserSessionMessage userSessionMessage) {
            builder.name(userSessionMessage.getName());
        } else {
            throw new IllegalArgumentException("Unknown message type: " + message.getClass().getName());
        }
        return builder.build();
    }

    private Long id;

    private Integer type;

    private Integer status;

    private String agentId;

    private String userId;

    private String sessionId;

    private String name;

    private List<ContentDTO> contents;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;

    private LocalDateTime gmtFinished;
}
