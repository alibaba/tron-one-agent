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

import com.aliyun.tam.x.tron.core.domain.models.contents.ActionContent;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.contents.TaskContent;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Agent session message model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class AgentSessionMessage extends SessionMessage {
    @lombok.Builder.Default
    @JsonDeserialize(using = Content.ContentDeserializer.class)
    private List<Content> contents = new ArrayList<>();

    private LocalDateTime gmtFinished;

    @Override
    public SessionMessageType getType() {
        return SessionMessageType.AGENT;
    }

    @Override
    public TaskContent findTask(Long taskId) {
        if (this.contents == null || taskId == null) {
            return null;
        }
        for (Content c : this.contents) {
            if (c instanceof TaskContent task && taskId.equals(task.getId())) {
                return task;
            }
        }
        return null;
    }

    /**
     * Find action by action ID
     */
    public ActionContent findAction(Long actionId) {
        if (this.contents == null || actionId == null) {
            return null;
        }
        for (Content c : this.contents) {
            if (c instanceof ActionContent action && actionId.equals(action.getId())) {
                return action;
            } else if (c instanceof TaskContent task) {
                ActionContent action = task.findAction(actionId);
                if (action != null) {
                    return action;
                }
            }
        }
        return null;
    }

    /**
     * Append new contents to this message
     */
    public void append(List<Content> newContents) {
        List<Content> mergedContents = new ArrayList<>();
        if (this.contents != null) {
            mergedContents.addAll(this.contents);
        }

        for (Content c : newContents) {
            Content lastContent = mergedContents.isEmpty() ? null : mergedContents.get(mergedContents.size() - 1);
            if (lastContent == null || !lastContent.merge(c)) {
                mergedContents.add(c);
            }
        }
        this.contents = mergedContents;
    }
}
