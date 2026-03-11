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

import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.domain.models.contents.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentDTO {
    public static List<ContentDTO> from(List<Content> contents) {
        return contents.stream()
                .map(ContentDTO::from)
                .filter(Objects::nonNull)
                .toList();
    }

    public static ContentDTO from(Content content) {
        if (content == null) {
            return null;
        }
        ContentDTO.ContentDTOBuilder builder = ContentDTO.builder()
                .id(content.getId())
                .type(content.getType().getValue());
        if (content instanceof TextContent textContent) {
            builder.type(textContent.getType().getValue())
                    .text(textContent.getText());
        } else if (content instanceof MediaContent mediaContent) {
            builder.type(mediaContent.getType().getValue())
                    .url(mediaContent.getUrl())
                    .base64Data(mediaContent.getBase64Data())
                    .mediaType(mediaContent.getMediaType());
        } else if (content instanceof TaskContent taskContent) {
            builder.type(taskContent.getType().getValue())
                    .agentId(taskContent.getAgentId())
                    .status(taskContent.getStatus().getValue())
                    .title(taskContent.getTitle())
                    .description(taskContent.getDescription())
                    .result(taskContent.getResult())
                    .contents(from(taskContent.getContents()))
                    .gmtCreated(taskContent.getGmtCreated())
                    .gmtModified(taskContent.getGmtModified())
                    .gmtFinished(taskContent.getGmtFinished());
        } else if (content instanceof ActionContent actionContent) {
            builder.type(actionContent.getType().getValue())
                    .status(actionContent.getStatus().getValue())
                    .title(actionContent.getTitle())
                    .contents(from(actionContent.getContents()))
                    .gmtCreated(actionContent.getGmtCreated())
                    .gmtModified(actionContent.getGmtModified())
                    .gmtFinished(actionContent.getGmtFinished());
        } else {
            throw new IllegalArgumentException("Unknown content type: " + content.getClass().getName());
        }

        return builder.build();
    }


    private Long id;

    @NotNull
    private Integer type;

    private String text;

    private Integer status;

    private String url;

    private String base64Data;

    private String mediaType;

    private String agentId;

    private String title;

    private String description;

    private String result;

    private List<ContentDTO> contents = new ArrayList<>();

    private LocalDateTime gmtCreated;

    private LocalDateTime gmtModified;

    private LocalDateTime gmtFinished;

    public Content toInputContent(AgentHandler agentHandler) {
        ContentType type = ContentType.fromValue(this.type);
        if (!agentHandler.supportInputType(type)) {
            throw new IllegalArgumentException("Unsupported input content type: " + type);
        }
        switch (type) {
            case TEXT:

                return TextContent.builder()
                        .id(id)
                        .type(ContentType.TEXT)
                        .text(text)
                        .build();
            case IMAGE:
            case VIDEO:
            case AUDIO:
                return MediaContent.builder()
                        .id(id)
                        .type(type)
                        .url(url)
                        .base64Data(base64Data)
                        .mediaType(mediaType)
                        .build();
            default:
                throw new IllegalArgumentException("Unknown input content type: " + type);
        }
    }
}
