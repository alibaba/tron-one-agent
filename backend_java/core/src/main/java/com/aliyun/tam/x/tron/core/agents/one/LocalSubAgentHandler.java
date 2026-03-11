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

import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.config.LocalSubAgentConfig;
import com.aliyun.tam.x.tron.core.domain.models.contents.*;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.session.Session;
import io.agentscope.core.tool.AgentTool;
import io.agentscope.core.tool.ToolCallParam;
import io.agentscope.core.tool.Toolkit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Mono;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class LocalSubAgentHandler extends SubAgentHandler {
    private static final String PARAM_TASK_NAME = "task_name";
    private static final String PARAM_TASK_DETAIL = "task_detail";
    private static final String PARAM_TASK_IMAGES = "task_images";
    private static final String PARAM_TASK_VIDEOS = "task_videos";

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
                    ),
                    PARAM_TASK_IMAGES, ImmutableMap.of(
                            "type", "array",
                            "items", ImmutableMap.of(
                                    "type", "string"
                            ),
                            "description", "(optional) the input images url of the task"
                    ),
                    PARAM_TASK_VIDEOS, ImmutableMap.of(
                            "type", "array",
                            "items", ImmutableMap.of(
                                    "type", "string"
                            ),
                            "description", "(optional) the input videos url of the task"
                    )
            ),
            "required", ImmutableList.of(PARAM_TASK_NAME, PARAM_TASK_DETAIL)
    );


    private final LocalSubAgentConfig subAgentConfig;

    private final AgentHandler agentHandler;

    @Autowired
    private AgentStateRepository agentStateRepository;

    public LocalSubAgentHandler(LocalSubAgentConfig subAgentConfig, AgentHandler agentHandler) {
        super(subAgentConfig);
        this.subAgentConfig = subAgentConfig;
        this.agentHandler = agentHandler;
    }

    @Override
    public Set<String> registerAgentTools(Toolkit toolkit, UserSessionMessage userMessage, EventSink eventSink) {
        AgentTool agentTool = new AgentTool() {
            @Override
            public String getName() {
                return String.format("execute_task_of_%s", subAgentConfig.getAgentId());
            }

            @Override
            public String getDescription() {
                return subAgentConfig.getCapacities();
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
                    List<String> taskImages = (List<String>) param.getInput().get(PARAM_TASK_IMAGES);
                    List<String> taskVideos = (List<String>) param.getInput().get(PARAM_TASK_VIDEOS);

                    String sessionId = String.format("%s_%s", userMessage.getSessionId(), eventSink.getAgentId());
                    String userId = String.format("%s_%s", userMessage.getUserId(), eventSink.getAgentId());

                    taskId = eventSink.newTask(eventSink.getAgentId(), taskName, String.format("%s (%s)", taskDetail, agentId()));

                    List<Content> contents = Lists.newArrayList();
                    contents.add(TextContent.builder().type(ContentType.TEXT).text(taskDetail).build());
                    if (!CollectionUtils.isEmpty(taskImages)) {
                        for (String taskImage : taskImages) {
                            contents.add(MediaContent.builder().url(taskImage).type(ContentType.IMAGE).build());
                        }
                    }
                    if (!CollectionUtils.isEmpty(taskVideos)) {
                        for (String taskVideo : taskVideos) {
                            contents.add(MediaContent.builder().url(taskVideo).type(ContentType.VIDEO).build());
                        }
                    }

                    UserSessionMessage msg = UserSessionMessage.builder()
                            .id(eventSink.nextSequence(SequenceService.SequenceName.MESSAGE))
                            .status(SessionMessageStatus.SUCCEED)
                            .agentId(agentHandler.getId())
                            .sessionId(sessionId)
                            .userId(userId)
                            .name(userMessage.getName())
                            .contents(contents)
                            .gmtCreate(LocalDateTime.now())
                            .gmtModified(LocalDateTime.now())
                            .build();

                    String result;
                    Session subSession = agentStateRepository.agentSessionsOf(agentId(), userId);
                    try {
                        agentHandler.loadFrom(subSession, sessionId);
                        result = agentHandler.handleInput(msg,
                                new SubAgentTaskEventSink(
                                        eventSink.getAgentId(),
                                        eventSink.getUserId(),
                                        eventSink.getSessionId(),
                                        eventSink.getMessageId(),
                                        eventSink, taskId)
                        );
                    } finally {
                        agentHandler.saveTo(subSession, sessionId);
                    }

                    eventSink.appendContentToTask(taskId, Lists.newArrayList(
                            TextContent.builder()
                                    .type(ContentType.TEXT)
                                    .text(result)
                                    .build()
                    ));
                    eventSink.changeTaskStatus(taskId, TaskStatus.SUCCEED, result);
                    return Mono.just(
                            ToolResultBlock.of(toolUse.getId(), toolUse.getName(), TextBlock.builder()
                                    .text(result)
                                    .build())
                    );
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
        return Sets.newHashSet(agentTool.getName());
    }
}
