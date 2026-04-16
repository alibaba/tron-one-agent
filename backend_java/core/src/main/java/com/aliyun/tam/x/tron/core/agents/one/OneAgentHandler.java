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
import com.aliyun.tam.x.tron.core.agents.AgentResult;
import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.aliyun.tam.x.tron.core.domain.models.contents.*;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.tools.ToolFormatter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.agent.Event;
import io.agentscope.core.agent.EventType;
import io.agentscope.core.message.*;
import io.agentscope.core.model.ChatUsage;
import io.agentscope.core.session.Session;
import io.agentscope.core.state.SessionKey;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Getter
public class OneAgentHandler extends AbstractAgentHandler {

    private final ReActAgent mainAgent;

    private final List<SubAgentHandler> subAgents;

    private final AtomicBoolean cancelled = new AtomicBoolean(false);

    @Autowired
    private ToolFormatter toolFormatter;

    @Autowired
    private ObjectMapper objectMapper;


    public OneAgentHandler(AgentConfig agentConfig, ReActAgent.Builder mainAgentBuilder, List<SubAgentHandler> subAgents) {
        super(agentConfig);
        this.mainAgent = mainAgentBuilder
                .build();
        this.subAgents = subAgents;
        registerQuestionTool(mainAgent);
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
    public AgentResult handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        long startTime = System.currentTimeMillis();

        List<Msg> inputMsgs = convertToInputMsgs(userMessage, eventSink, mainAgent.getMemory());

        Set<String> subAgentTools = Sets.newHashSet();
        for (SubAgentHandler subAgent : subAgents) {
            subAgentTools.addAll(
                    subAgent.registerAgentTools(this.mainAgent.getToolkit(), userMessage, eventSink)
            );
            subAgent.resetExecutedTasks();
        }

        AgentResult result = AgentResult.builder().build();
        Map<String, Long> ongoingToolUses = Maps.newConcurrentMap();
        Map<Long, AgentResult.Action> actions = Maps.newConcurrentMap();
        AtomicBoolean hasHitl = new AtomicBoolean(false);
        mainAgent.stream(inputMsgs)
                .doFirst(() -> cancelled.set(false))
                .doOnEach(s -> {
                    Event event = s.get();
                    if (event == null) {
                        return;
                    }

                    if (result.getFirstTokenDelayInMs() == null) {
                        result.setFirstTokenDelayInMs(System.currentTimeMillis() - startTime);
                    }

                    if (event.getType() == EventType.AGENT_RESULT || event.getType() == EventType.SUMMARY) {
                        if (event.getMessage().hasContentBlocks(ToolUseBlock.class)) {
                            hasHitl.set(true);
                        }
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

                                if (subAgentTools.contains(toolName)) {
                                    continue;
                                }

                                if (QUESTION_TOOL_NAME.contains(toolName)) {
                                    hasHitl.set(true);
                                    eventSink.appendContentToMessage(
                                            List.of(
                                                    HitlContent.builder()
                                                            .id(toolUseBlock.getId())
                                                            .agentMessageId(eventSink.getMessageId())
                                                            .status(HitlStatus.PENDING)
                                                            .properties(toolUseBlock.getInput())
                                                            .method(toolName)
                                                            .build()
                                            )
                                    );
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
                .doOnComplete(() -> {
                    eventSink.changeMessageStatus(cancelled.get() ? SessionMessageStatus.CANCELLED : SessionMessageStatus.SUCCEED);
                })
                .doOnError(throwable -> {
                    eventSink.changeMessageStatus(SessionMessageStatus.FAILED);
                })
                .doFinally(s -> {
                    eventSink.onComplete();
                    if (!cancelled.get() && !hasHitl.get()) {
                        followupSuggestions(eventSink, mainAgent.getMemory().getMessages());
                    }
                })
                .blockLast();

        result.setCostInMs(System.currentTimeMillis() - startTime);
        for (SubAgentHandler subAgent : subAgents) {
            result.getTasks().addAll(subAgent.getExecutedTasks());
            subAgent.resetExecutedTasks();
        }
        return result;
    }

    @Override
    public void cancel(String message) {
        if (StringUtils.hasText(message)) {
            mainAgent.interrupt(
                    Msg.builder()
                            .role(MsgRole.USER)
                            .textContent(message)
                            .build()
            );
        } else {
            mainAgent.interrupt();
        }
        cancelled.set(true);
    }
}
