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


package com.aliyun.tam.x.tron.core.utils;


import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.MediaContent;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.google.common.collect.Lists;
import io.agentscope.core.message.*;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.Model;
import org.springframework.scheduling.annotation.Async;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public final class AgentHelper {
    private AgentHelper() {

    }


    public static List<Content> convertFromBlocks(List<ContentBlock> blocks) {
        return blocks.stream()
                .map(AgentHelper::convertFromBlock)
                .filter(Objects::nonNull)
                .toList();
    }

    public static Content convertFromBlock(ContentBlock block) {
        if (block instanceof TextBlock textBlock) {
            return TextContent.builder()
                    .text(textBlock.getText())
                    .type(ContentType.TEXT)
                    .build();
        } else if (block instanceof ThinkingBlock thinkingBlock) {
            return TextContent.builder()
                    .text(thinkingBlock.getThinking())
                    .type(ContentType.THINKING)
                    .build();
        } else if (block instanceof ImageBlock imageBlock) {
            return fillSource(MediaContent.builder()
                            .type(ContentType.IMAGE)
                    , imageBlock.getSource());
        } else if (block instanceof VideoBlock videoBlock) {
            return fillSource(MediaContent.builder()
                            .type(ContentType.VIDEO)
                    , videoBlock.getSource());
        } else if (block instanceof AudioBlock audioBlock) {
            return fillSource(MediaContent.builder()
                            .type(ContentType.AUDIO)
                    , audioBlock.getSource());
        }
        return null;
    }

    private static MediaContent fillSource(MediaContent.MediaContentBuilder builder, Source source) {
        if (source instanceof URLSource urlSource) {
            builder.url(urlSource.getUrl());
        } else if (source instanceof Base64Source base64Source) {
            builder.base64Data(base64Source.getData());
            builder.mediaType(base64Source.getMediaType());
        }
        return builder.build();
    }

    public static List<ContentBlock> convertToBlocks(List<Content> content) {
        return content.stream()
                .map(AgentHelper::convertToBlock)
                .filter(Objects::nonNull)
                .toList();
    }

    public static ContentBlock convertToBlock(Content content) {
        if (content == null) {
            return null;
        }

        if (content instanceof TextContent textContent) {
            if (content.getType() == ContentType.THINKING) {
                return ThinkingBlock.builder()
                        .thinking(textContent.getText())
                        .build();
            } else if (content.getType() == ContentType.TEXT) {
                return TextBlock.builder()
                        .text(textContent.getText())
                        .build();
            }
        } else if (content instanceof MediaContent mediaContent) {
            Source source;
            if (StringUtils.hasText(mediaContent.getUrl())) {
                source = URLSource.builder()
                        .url(mediaContent.getUrl())
                        .build();
            } else {
                source = Base64Source.builder()
                        .data(mediaContent.getBase64Data())
                        .mediaType(mediaContent.getMediaType())
                        .build();
            }

            if (mediaContent.getType() == ContentType.IMAGE) {
                return ImageBlock.builder()
                        .source(source)
                        .build();
            } else if (mediaContent.getType() == ContentType.VIDEO) {
                return VideoBlock.builder()
                        .source(source)
                        .build();
            } else if (mediaContent.getType() == ContentType.AUDIO) {
                return AudioBlock.builder()
                        .source(source)
                        .build();
            }
        }

        return null;
    }

}