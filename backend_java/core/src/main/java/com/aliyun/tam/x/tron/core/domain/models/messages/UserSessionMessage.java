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
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TaskContent;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * User session message model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class UserSessionMessage extends SessionMessage {

    private String name;

    @lombok.Builder.Default
    @JsonDeserialize(using = Content.ContentDeserializer.class)
    private List<Content<?>> contents = new ArrayList<>();

    @Override
    public SessionMessageType getType() {
        return SessionMessageType.USER;
    }

    @Override
    public TaskContent findTask(Long taskId) {
        if (this.contents == null || taskId == null) {
            return null;
        }
        for (Content<?> c : this.contents) {
            if (c instanceof TaskContent task && taskId.equals(task.getId())) {
                return task;
            }
        }
        return null;
    }

    public boolean hasContentOf(ContentType contentType) {
        return this.contents.stream().anyMatch(c -> c.getType() == contentType);
    }

    public <ID, T extends Content<ID>> List<T> getContentsOfType(ContentType contentType, Class<T> cls) {
        return this.contents.stream().filter(c -> c.getType() == contentType).map(cls::cast).toList();
    }

    public boolean isVisible() {
        if (hasContentOf(ContentType.HITL)) {
            return false;
        }
        return true;
    }
}
