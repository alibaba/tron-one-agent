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


package com.aliyun.tam.x.tron.core.agents;

import com.aliyun.tam.x.tron.core.domain.models.contents.ActionStatus;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.service.RenamingService;
import com.aliyun.tam.x.tron.core.tools.ToolFormatter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.agent.Event;
import io.agentscope.core.agent.EventType;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.session.Session;
import io.agentscope.core.state.SessionKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static com.aliyun.tam.x.tron.core.utils.AgentHelper.*;

public class ReActAgentHandler extends AbstractAgentHandler {
    private final String id;

    private final ReActAgent agent;

    @Autowired
    private ToolFormatter toolFormatter;


    @Autowired
    private RenamingService renamingService;

    public ReActAgentHandler(String id, ReActAgent agent, Collection<ContentType> supportedInputTypes) {
        super(supportedInputTypes);
        this.id = id;
        this.agent = agent;
    }

    @Override
    public void saveTo(Session session, SessionKey sessionKey) {
        agent.saveTo(session, sessionKey);
    }

    @Override
    public void loadFrom(Session session, SessionKey sessionKey) {
        agent.loadFrom(session, sessionKey);
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        Msg msg = Msg.builder()
                .role(MsgRole.USER)
                .name(userMessage.getName())
                .content(convertToBlocks(userMessage.getContents()))
                .build();
        {
            processMediaContentOfMemory(userMessage.getUserId(), this.agent.getMemory());

            Msg newMsg = processMediaContentOfMessage(userMessage.getUserId(), msg);
            if (newMsg != null) {
                msg = newMsg;
            }
        }

        renamingService.renameSession(agent.getModel(), msg, agent.getMemory().getMessages(), eventSink);

        AtomicReference<String> result = new AtomicReference<>();
        Map<String, Long> ongoingToolUses = Maps.newConcurrentMap();
        agent.stream(msg)
                .doOnEach(s -> {
                    Event event = s.get();
                    if (event == null) {
                        return;
                    }
                    if (event.getType() == EventType.AGENT_RESULT || event.getType() == EventType.SUMMARY) {
                        result.set(event.getMessage().getTextContent());
                    } else if (event.getType() == EventType.REASONING) {
                        Msg eventMsg = event.getMessage();
                        if (eventMsg.getRole() != MsgRole.ASSISTANT) {
                            return;
                        }
                        List<ToolUseBlock> toolUseBlocks = eventMsg.getContentBlocks(ToolUseBlock.class);
                        if (CollectionUtils.isEmpty(toolUseBlocks)) {
                            if (!event.isLast()) {
                                eventSink.appendContentToMessage(convertFromBlocks(eventMsg.getContent()));
                            }
                        } else if (event.isLast()) {
                            for (ToolUseBlock toolUseBlock : toolUseBlocks) {
                                String toolName = toolUseBlock.getName();
                                Long actionId = null;
                                try {
                                    String formattedToolName = toolFormatter.formatToolName(toolName);
                                    if (!StringUtils.hasText(formattedToolName)) {
                                        continue;
                                    }
                                    actionId = eventSink.newAction(formattedToolName);
                                    eventSink.appendContentToAction(actionId,
                                            Lists.newArrayList(TextContent.builder()
                                                    .text(toolFormatter.formatToolArguments(toolUseBlock.getInput(), toolName))
                                                    .build()
                                            )
                                    );
                                } catch (Exception e) {
                                    if (actionId != null) {
                                        eventSink.appendContentToAction(actionId,
                                                Lists.newArrayList(TextContent.builder()
                                                        .text(String.valueOf(toolUseBlock.getInput()))
                                                        .build()
                                                )
                                        );
                                    }
                                }
                                ongoingToolUses.put(toolUseBlock.getId(), actionId);
                            }
                        }
                    } else if (event.getType() == EventType.TOOL_RESULT) {
                        for (ToolResultBlock block : event.getMessage().getContentBlocks(ToolResultBlock.class)) {
                            Long actionId = ongoingToolUses.remove(block.getId());
                            if (actionId == null) {
                                continue;
                            }
                            eventSink.appendContentToAction(actionId,
                                    toolFormatter.formatToolResult(block.getOutput(), block.getName())
                            );
                            eventSink.changeActionStatus(actionId, ActionStatus.SUCCEED);
                        }
                    }
                })
                .doOnError(throwable -> eventSink.changeMessageStatus(SessionMessageStatus.FAILED))
                .doFinally(s -> {
                    eventSink.changeMessageStatus(SessionMessageStatus.SUCCEED);
                })
                .blockLast();
        return result.get();
    }
}
