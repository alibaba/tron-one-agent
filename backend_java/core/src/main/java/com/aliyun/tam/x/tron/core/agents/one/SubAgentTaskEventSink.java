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


package com.aliyun.tam.x.tron.core.agents.one;

import com.aliyun.tam.x.tron.core.domain.models.contents.ActionContent;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.contents.MediaContent;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.*;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;

import java.time.LocalDateTime;
import java.util.List;

public class SubAgentTaskEventSink extends EventSink {

    private final EventSink delegate;
    private final long taskId;

    public SubAgentTaskEventSink(String agentId, String userId, String sessionId, Long messageId, EventSink delegate, long taskId) {
        super(agentId, userId, sessionId, messageId);
        this.delegate = delegate;
        this.taskId = taskId;
    }

    @Override
    public void newEvent(SessionEvent event) {
        if (event instanceof SessionNameChangedEvent || event instanceof NewUserInputEvent || event instanceof NewAgentMessageEvent
                || event instanceof AgentMessageStatusChangedEvent || event instanceof TaskAppendContentEvent
                || event instanceof TaskStatusChangeEvent) {
            return;
        }

        if (event instanceof AgentMessageAppendContentEvent e) {
            List<Content> contents = e.getNewContents()
                    .stream()
                    .filter(c -> c instanceof TextContent || c instanceof MediaContent || c instanceof ActionContent)
                    .peek(c -> {
                        if (c instanceof ActionContent ac) {
                            ac.setTaskId(taskId);
                        }
                    })
                    .toList();

            if (contents.isEmpty()) {
                return;
            }

            delegate.newEvent(
                    TaskAppendContentEvent.builder()
                            .id(delegate.newEventId())
                            .agentId(delegate.getAgentId())
                            .sessionId(delegate.getSessionId())
                            .userId(delegate.getUserId())
                            .messageId(delegate.getMessageId())
                            .taskId(taskId)
                            .newContents(contents)
                            .gmtCreated(LocalDateTime.now())
                            .build()
            );
        } else {
            delegate.newEvent(event);
        }
    }

    @Override
    public Long nextSequence(SequenceService.SequenceName sequenceName) {
        return delegate.nextSequence(sequenceName);
    }
}
