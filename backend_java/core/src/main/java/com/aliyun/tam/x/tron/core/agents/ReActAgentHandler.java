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
import io.agentscope.core.chat.completions.model.ToolCall;
import io.agentscope.core.message.*;
import io.agentscope.core.model.ChatUsage;
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
    public AgentResult handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        long startTime = System.currentTimeMillis();

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

        msg = buildRuntimeContext(msg);

        renamingService.renameSession(getFastChatModel(), msg, agent.getMemory().getMessages(),
                eventSink.getAgentId(), eventSink.getSessionId());

        AgentResult result = AgentResult.builder().build();
        Map<String, Long> ongoingToolUses = Maps.newConcurrentMap();
        Map<Long, AgentResult.Action> actions = Maps.newConcurrentMap();
        agent.stream(msg)
                .doOnEach(s -> {
                    Event event = s.get();
                    if (event == null) {
                        return;
                    }

                    if (result.getFirstTokenDelayInMs() == null) {
                        result.setFirstTokenDelayInMs(System.currentTimeMillis() - startTime);
                    }

                    if (event.getType() == EventType.AGENT_RESULT || event.getType() == EventType.SUMMARY) {
                        result.setResponse(event.getMessage().getTextContent());
                        return;
                    }

                    if (event.isLast() && event.getMessage() != null && event.getMessage().getChatUsage() != null) {
                        ChatUsage usage = event.getMessage().getChatUsage();
                        result.getUsage().increment(usage);
                    }

                    if (event.getType() == EventType.REASONING) {
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
                                    if (result.getFirstResponseTokenDelayInMs() == null) {
                                        result.setFirstResponseTokenDelayInMs(System.currentTimeMillis() - startTime);
                                    }

                                    String content = textBlocks.stream().map(TextBlock::getText).reduce("", String::concat);
                                    eventSink.appendContentToMessage(Lists.newArrayList(TextContent.builder().text(content).build()));
                                }
                            }
                        } else if (event.isLast()) {
                            result.setFirstResponseTokenDelayInMs(null);

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
                                    ongoingToolUses.put(toolUseBlock.getId(), actionId);
                                    actions.put(actionId, AgentResult.Action.builder().id(actionId).name(toolName).costInMs(System.currentTimeMillis()).build());
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
                        result.setFirstResponseTokenDelayInMs(null);

                        for (ToolResultBlock block : event.getMessage().getContentBlocks(ToolResultBlock.class)) {
                            Long actionId = ongoingToolUses.remove(block.getId());
                            if (actionId == null) {
                                continue;
                            }
                            eventSink.appendContentToAction(actionId,
                                    toolFormatter.formatToolResult(block.getOutput(), block.getName())
                            );
                            eventSink.changeActionStatus(actionId, ActionStatus.SUCCEED);
                            AgentResult.Action action = actions.remove(actionId);
                            if (action != null) {
                                action.setCostInMs(System.currentTimeMillis() - action.getCostInMs());
                                result.getActions().add(action);
                            }
                        }
                    }
                })
                .doOnComplete(() -> eventSink.changeMessageStatus(SessionMessageStatus.SUCCEED))
                .doOnError(throwable -> eventSink.changeMessageStatus(SessionMessageStatus.FAILED))
                .doFinally(s -> {
                    eventSink.onComplete();
                })
                .blockLast();
        result.setCostInMs(System.currentTimeMillis() - startTime);
        return result;
    }

    @Override
    public void cancel(String message) {
        if (StringUtils.hasText(message)) {
            agent.interrupt(
                    Msg.builder()
                            .role(MsgRole.USER)
                            .textContent(message)
                            .build()
            );
        } else {
            agent.interrupt();
        }
    }
}
