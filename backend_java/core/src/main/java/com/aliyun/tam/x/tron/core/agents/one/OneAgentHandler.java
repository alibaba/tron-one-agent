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

import com.aliyun.tam.x.tron.core.agents.AbstractAgentHandler;
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
import com.google.common.collect.Sets;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.agent.Event;
import io.agentscope.core.agent.EventType;
import io.agentscope.core.message.*;
import io.agentscope.core.session.Session;
import io.agentscope.core.state.SessionKey;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static com.aliyun.tam.x.tron.core.utils.AgentHelper.convertToBlocks;

@Getter
public class OneAgentHandler extends AbstractAgentHandler {

    private final String id;

    private final ReActAgent mainAgent;

    private final List<SubAgentHandler> subAgents;

    @Autowired
    private ToolFormatter toolFormatter;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RenamingService renamingService;

    public OneAgentHandler(String id, ReActAgent.Builder mainAgentBuilder, List<SubAgentHandler> subAgents, Collection<ContentType> supportedInputTypes) {
        super(supportedInputTypes);
        this.id = id;
        this.mainAgent = mainAgentBuilder
                .build();
        this.subAgents = subAgents;
    }

    @Override
    public void saveTo(Session session, SessionKey sessionKey) {
        mainAgent.saveTo(session, sessionKey);
    }

    @Override
    public void loadFrom(Session session, SessionKey sessionKey) {
        mainAgent.loadFrom(session, sessionKey);
    }

    @Override
    public String handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        Msg msg = Msg.builder()
                .role(MsgRole.USER)
                .name(userMessage.getName())
                .content(convertToBlocks(userMessage.getContents()))
                .build();
        {
            processMediaContentOfMemory(userMessage.getUserId(), this.mainAgent.getMemory());

            Msg newMsg = processMediaContentOfMessage(userMessage.getUserId(), msg);
            if (newMsg != null) {
                msg = newMsg;
            }
        }

        msg = buildRuntimeContext(msg);

        renamingService.renameSession(mainAgent.getModel(), msg, mainAgent.getMemory().getMessages(),
                eventSink.getAgentId(), eventSink.getSessionId());

        Set<String> subAgentTools = Sets.newHashSet();
        for (SubAgentHandler subAgent : subAgents) {
            subAgentTools.addAll(
                    subAgent.registerAgentTools(this.mainAgent.getToolkit(), userMessage, eventSink)
            );
        }

        AtomicReference<String> result = new AtomicReference<>();
        Map<String, Long> ongoingToolUses = Maps.newConcurrentMap();
        mainAgent.stream(msg)
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
                                List<ThinkingBlock> thinkingBlocks = event.getMessage().getContentBlocks(ThinkingBlock.class);
                                if (!CollectionUtils.isEmpty(thinkingBlocks)) {
                                    String content = thinkingBlocks.stream().map(ThinkingBlock::getThinking).reduce("", String::concat);
                                    eventSink.appendContentToMessage(Lists.newArrayList(TextContent.builder().type(ContentType.THINKING).text(content).build()));
                                }

                                List<TextBlock> textBlocks = eventMsg.getContentBlocks(TextBlock.class);
                                if (!CollectionUtils.isEmpty(textBlocks)) {
                                    String content = textBlocks.stream().map(TextBlock::getText).reduce("", String::concat);
                                    eventSink.appendContentToMessage(Lists.newArrayList(TextContent.builder().text(content).build()));
                                }
                            }
                        } else if (event.isLast()) {
                            for (ToolUseBlock toolUseBlock : toolUseBlocks) {
                                String toolName = toolUseBlock.getName();

                                if (subAgentTools.contains(toolName)) {
                                    continue;
                                }

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
                                    ongoingToolUses.put(toolUseBlock.getId(), actionId);
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
                .doOnComplete(() -> eventSink.changeMessageStatus(SessionMessageStatus.SUCCEED))
                .doOnError(throwable -> eventSink.changeMessageStatus(SessionMessageStatus.FAILED))
                .doFinally(s -> {
                    eventSink.onComplete();
                })
                .blockLast();
        return result.get();
    }
}
