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

import com.aliyun.tam.x.tron.core.config.A2ASubAgentConfig;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TaskStatus;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import io.a2a.spec.AgentCard;
import io.a2a.spec.AgentSkill;
import io.agentscope.core.a2a.agent.A2aAgent;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.session.Session;
import io.agentscope.core.tool.AgentTool;
import io.agentscope.core.tool.ToolCallParam;
import io.agentscope.core.tool.Toolkit;
import org.springframework.beans.factory.annotation.Autowired;
import reactor.core.publisher.Mono;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Map;
import java.util.Set;

public class A2ASubAgentHandler extends SubAgentHandler {
    private static final String PARAM_TASK_NAME = "task_name";
    private static final String PARAM_TASK_DETAIL = "task_detail";

    private static final Map<String, Object> PARAMETER_SCHEMA = ImmutableMap.of(
            "type", "object",
            "properties", ImmutableMap.of(
                    PARAM_TASK_NAME, ImmutableMap.of(
                            "type", "string",
                            "description", "the shorten name of the task"
                    ),
                    PARAM_TASK_DETAIL, ImmutableMap.of(
                            "type", "string",
                            "description", "the detail content of the task"
                    )
            ),
            "required", ImmutableList.of(PARAM_TASK_NAME, PARAM_TASK_DETAIL)
    );


    private final A2ASubAgentConfig subAgentConfig;

    private final A2aAgent a2aAgent;

    @Autowired
    private AgentStateRepository agentStateRepository;

    public A2ASubAgentHandler(A2ASubAgentConfig subAgentConfig) {
        super(subAgentConfig);
        this.subAgentConfig = subAgentConfig;
        this.a2aAgent = A2aAgent.builder()
                .name(subAgentConfig.getAgentId())
                .agentCard(subAgentConfig.getAgentCard())
                .build();
    }

    @Override
    public Set<String> registerAgentTools(Toolkit toolkit, UserSessionMessage userMessage, EventSink eventSink) {
        Set<String> toolNames = Sets.newHashSet();
        AgentCard agentCard = subAgentConfig.getAgentCard();
        for (AgentSkill skill : agentCard.skills()) {

            AgentTool agentTool = new AgentTool() {
                @Override
                public String getName() {
                    return skill.id();
                }

                @Override
                public String getDescription() {
                    return String.format("%s\nTags: %s\nDescription:\n%s\n\nExamples:\n%s\n",
                            skill.name(),
                            String.join(", ", skill.tags()),
                            skill.description(),
                            String.join("\n", skill.examples())
                    );
                }

                @Override
                public Map<String, Object> getParameters() {
                    return PARAMETER_SCHEMA;
                }

                @Override
                public Mono<ToolResultBlock> callAsync(ToolCallParam param) {
                    ToolUseBlock toolUse = param.getToolUseBlock();

                    Long taskId = null;
                    try {
                        String taskName = (String) param.getInput().get(PARAM_TASK_NAME);
                        String taskDetail = (String) param.getInput().get(PARAM_TASK_DETAIL);

                        String sessionId = String.format("%s_%s", userMessage.getSessionId(), eventSink.getAgentId());
                        String userId = String.format("%s_%s", userMessage.getUserId(), eventSink.getAgentId());

                        Long finalTaskId = eventSink.newTask(eventSink.getAgentId(), taskName, String.format("%s (%s)", taskDetail, agentId()));
                        taskId = finalTaskId;

                        Session subSession = agentStateRepository.agentSessionsOf(agentId(), userId);
                        try {
                            a2aAgent.loadFrom(subSession, sessionId);
                            String result = a2aAgent.call(Msg.builder()
                                            .name(userMessage.getName())
                                            .role(io.agentscope.core.message.MsgRole.USER)
                                            .content(ImmutableList.of(TextBlock.builder()
                                                    .text(taskDetail)
                                                    .build()))
                                            .build()
                                    ).map(Msg::getTextContent)
                                    .block();
                            eventSink.appendContentToTask(finalTaskId, Lists.newArrayList(
                                    TextContent.builder()
                                            .type(ContentType.TEXT)
                                            .text(result)
                                            .build()
                            ));
                            eventSink.changeTaskStatus(finalTaskId, TaskStatus.SUCCEED, result);
                            return Mono.just(
                                    ToolResultBlock.of(toolUse.getId(), toolUse.getName(), TextBlock.builder()
                                            .text(result)
                                            .build())
                            );
                        } finally {
                            a2aAgent.saveTo(subSession, sessionId);
                        }
                    } catch (Exception e) {
                        if (taskId != null) {
                            StringWriter sw = new StringWriter();
                            e.printStackTrace(new PrintWriter(sw));
                            eventSink.changeTaskStatus(taskId, TaskStatus.FAILED, sw.toString());
                        }
                        return Mono.just(
                                ToolResultBlock.of(toolUse.getId(), toolUse.getName(), TextBlock.builder()
                                        .text("failed to process this task temporarily, try it again next time please")
                                        .build())
                        );
                    }
                }
            };

            toolkit.registerAgentTool(agentTool);
            toolNames.add(agentTool.getName());
        }
        return toolNames;
    }
}
