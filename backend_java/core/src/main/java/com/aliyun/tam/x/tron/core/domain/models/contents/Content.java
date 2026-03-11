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


package com.aliyun.tam.x.tron.core.domain.models.contents;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;

/**
 * Base content model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public abstract class Content {
    private Long id;

    public abstract ContentType getType();

    /**
     * Merge with another content
     *
     * @param c the content to merge
     * @return true if merge successful, false otherwise
     */
    public boolean merge(Content c) {
        return false;
    }

    public static class ContentDeserializer extends JsonDeserializer<List<Content>> {

        private static ObjectMapper mapper;
        
        static {
            mapper = new ObjectMapper();
            com.fasterxml.jackson.datatype.jsr310.JavaTimeModule javaTimeModule = new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule();
            java.time.format.DateTimeFormatter dateTimeFormatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            javaTimeModule.addSerializer(java.time.LocalDateTime.class, new com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer(dateTimeFormatter));
            javaTimeModule.addDeserializer(java.time.LocalDateTime.class, new com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer(dateTimeFormatter));
            mapper.registerModule(javaTimeModule);
            mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        }

        @Override
        public List<Content> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            JsonNode arrayNode = p.getCodec().readTree(p);
            
            if (arrayNode == null || arrayNode.isNull()) {
                return null;
            }

            if (!arrayNode.isArray()) {
                throw new IOException("Expected array for Content list deserialization");
            }

            List<Content> contents = Lists.newArrayListWithCapacity(arrayNode.size());
            for (JsonNode node : arrayNode) {
                Content content = parseContent(node);
                if (content != null) {
                    contents.add(content);
                }
            }
            return contents;
        }

        private Content parseContent(JsonNode node) throws IOException {
            if (node == null || node.isNull()) {
                return null;
            }
            
            int typeValue = node.get("type").asInt();
            ContentType contentType = ContentType.fromValue(typeValue);

            return switch (contentType) {
                case TEXT, THINKING -> mapper.treeToValue(node, TextContent.class);
                case IMAGE, VIDEO, AUDIO -> mapper.treeToValue(node, MediaContent.class);
                case TASK -> parseWithContentsContents(node, TaskContent.class, TaskContent::setContents);
                case ACTION -> parseWithContentsContents(node, ActionContent.class, ActionContent::setContents);
                default -> null;
            };
        }

        private <T> T parseWithContentsContents(JsonNode node, Class<T> cls, BiConsumer<T, List<Content>> setter) throws IOException {
            JsonNode contentsArray = node.get("contents");
            if (contentsArray == null || contentsArray.isNull() || contentsArray.isEmpty()) {
                return mapper.treeToValue(node, cls);
            }
            
            JsonNode nodeCopy = node.deepCopy();
            ((com.fasterxml.jackson.databind.node.ObjectNode) nodeCopy).remove("contents");
            T inst = mapper.treeToValue(nodeCopy, cls);
            
            List<Content> contents = new ArrayList<>();
            for (JsonNode contentNode : contentsArray) {
                Content content = parseContent(contentNode);
                if (content != null) {
                    contents.add(content);
                }
            }
            setter.accept(inst, contents);
            return inst;
        }
    }
}
