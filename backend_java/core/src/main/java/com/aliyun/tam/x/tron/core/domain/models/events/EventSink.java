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


package com.aliyun.tam.x.tron.core.domain.models.events;

import com.aliyun.tam.x.tron.core.domain.models.contents.*;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Event sink abstract class for managing session events
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public abstract class EventSink {
    protected String agentId;
    protected String userId;
    protected String sessionId;
    protected Long messageId;

    /**
     * Generate new event ID
     */
    public Long newEventId() {
        return nextSequence(SequenceService.SequenceName.EVENT);
    }

    /**
     * Handle new event
     */
    public abstract void newEvent(SessionEvent event);

    /**
     * Create new user message event
     */
    public void newUserMessage(UserSessionMessage msg) {
        newEvent(NewUserInputEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .msg(msg)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Rename session event
     */
    public void renameSession(String newName) {
        if (newName == null || newName.isEmpty()) {
            return;
        }
        if (newName.length() > 128) {
            newName = newName.substring(0, 128);
        }

        newEvent(SessionNameChangedEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .newName(newName)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Create new agent message event
     */
    public void newAgentMessage(AgentSessionMessage msg) {
        newEvent(NewAgentMessageEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .msg(msg)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Append content to message
     */
    public void appendContentToMessage(List<Content> contents) {
        newEvent(AgentMessageAppendContentEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .newContents(contents)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Change message status
     */
    public void changeMessageStatus(SessionMessageStatus newStatus) {
        newEvent(AgentMessageStatusChangedEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .gmtCreated(LocalDateTime.now())
                .newStatus(newStatus)
                .gmtFinished(LocalDateTime.now())
                .build());
    }

    /**
     * Create new task
     *
     * @return task ID
     */
    public Long newTask(String agentId, String title, String description) {
        Long taskId = nextSequence(SequenceService.SequenceName.TASK);
        newEvent(AgentMessageAppendContentEvent.builder()
                .id(newEventId())
                .agentId(this.agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .newContents(Collections.singletonList(
                        TaskContent.builder()
                                .agentId(agentId)
                                .id(taskId)
                                .title(title)
                                .description(description)
                                .status(TaskStatus.EXECUTING)
                                .contents(new ArrayList<>())
                                .gmtCreated(LocalDateTime.now())
                                .gmtModified(LocalDateTime.now())
                                .gmtFinished(null)
                                .build()
                ))
                .gmtCreated(LocalDateTime.now())
                .build());
        return taskId;
    }

    /**
     * Append content to task
     */
    public void appendContentToTask(Long taskId, List<Content> contents) {
        newEvent(TaskAppendContentEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .taskId(taskId)
                .newContents(contents)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Change task status
     */
    public void changeTaskStatus(Long taskId, TaskStatus newStatus, String result) {
        newEvent(TaskStatusChangeEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .taskId(taskId)
                .newStatus(newStatus)
                .result(result)
                .gmtCreated(LocalDateTime.now())
                .gmtFinished(newStatus == TaskStatus.SUCCEED ? LocalDateTime.now() : null)
                .build());
    }

    /**
     * Create new action
     *
     * @return action ID
     */
    public Long newAction(String title) {
        Long actionId = nextSequence(SequenceService.SequenceName.ACTION);
        newEvent(AgentMessageAppendContentEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .newContents(Collections.singletonList(
                        ActionContent.builder()
                                .id(actionId)
                                .title(title)
                                .status(ActionStatus.EXECUTING)
                                .contents(new ArrayList<>())
                                .gmtCreated(LocalDateTime.now())
                                .gmtModified(LocalDateTime.now())
                                .build()
                ))
                .gmtCreated(LocalDateTime.now())
                .build());
        return actionId;
    }

    /**
     * Append content to action
     */
    public void appendContentToAction(Long actionId, List<Content> contents) {
        newEvent(ActionAppendContentEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .actionId(actionId)
                .newContents(contents)
                .gmtCreated(LocalDateTime.now())
                .build());
    }

    /**
     * Change action status
     */
    public void changeActionStatus(Long actionId, ActionStatus newStatus) {
        newEvent(ActionStatusChangeEvent.builder()
                .id(newEventId())
                .agentId(agentId)
                .userId(userId)
                .sessionId(sessionId)
                .messageId(messageId)
                .actionId(actionId)
                .newStatus(newStatus)
                .gmtCreated(LocalDateTime.now())
                .gmtFinished(newStatus != ActionStatus.EXECUTING ? LocalDateTime.now() : null)
                .build());
    }

    /**
     * Get next sequence number for given sequence name
     * This should be implemented by subclasses or injected via dependency
     */
    public abstract Long nextSequence(SequenceService.SequenceName sequenceName);
}
