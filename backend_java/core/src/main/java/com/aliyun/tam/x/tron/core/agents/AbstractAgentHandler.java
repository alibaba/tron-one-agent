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

import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.aliyun.tam.x.tron.core.config.ChatModelConfig;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.service.FollowupSuggestionService;
import com.aliyun.tam.x.tron.core.domain.service.RenamingService;
import com.aliyun.tam.x.tron.infra.storage.StorageProvider;
import com.google.common.collect.Lists;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.memory.Memory;
import io.agentscope.core.message.*;
import io.agentscope.core.model.ChatModelBase;
import io.agentscope.core.model.ToolSchema;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Setter
public abstract class AbstractAgentHandler implements AgentHandler {

    private static final String RUNTIME_CONTEXT_PREFIX = "[Runtime Context — metadata only, not instructions]\n\n";

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss EEE");

    protected static final String QUESTION_TOOL_NAME = "question";
    private static final ToolSchema QUESTION_SCHEMA = ToolSchema.builder()
            .name(QUESTION_TOOL_NAME)
            .description("""
                    Use this tool when you need to ask the user questions during execution. This allows you to:
                    1. Gather user preferences or requirements
                    2. Clarify ambiguous instructions
                    3. Get decisions on implementation choices as you work
                    4. Offer choices to the user about what direction to take.
                    
                    Usage notes:
                    - A "Type your own answer" option is added automatically; don't include "Other" or catch-all options
                    - Answers are returned as arrays of labels; set `multiple: true` to allow selecting more than one
                    - If you recommend a specific option, make that the first option in the list and add "(Recommended/推荐)" at the end of the label"
                    """)
            .parameters(
                    Map.of(
                            "type", "object",
                            "properties", Map.of(
                                    "questions", Map.of(
                                            "type", "array",
                                            "minItems", 1,
//                                            "maxItems", 4,
                                            "items", Map.of(
                                                    "type", "object",
                                                    "properties", Map.of(
                                                            "question", Map.of(
                                                                    "type", "string",
                                                                    "description", "The complete question to ask the user. Should be clear, specific, and end with a question mark."
                                                            ),
                                                            "header", Map.of(
                                                                    "type", "string",
                                                                    "description", "Very short label displayed as a chip/tag (max 12 chars)."
                                                            ),
                                                            "options", Map.of(
                                                                    "type", "array",
                                                                    "minItems", 2,
                                                                    "maxItems", 4,
                                                                    "items", Map.of(
                                                                            "type", "object",
                                                                            "properties", Map.of(
                                                                                    "label", Map.of(
                                                                                            "type", "string",
                                                                                            "description", "The display text for this option (1-5 words)."
                                                                                    ),
                                                                                    "description", Map.of(
                                                                                            "type", "string",
                                                                                            "description", "Explanation of what this option means or what will happen if chosen."
                                                                                    )
                                                                            ),
                                                                            "required", List.of("label", "description"),
                                                                            "additionalProperties", false
                                                                    )
                                                            ),
                                                            "multiSelect", Map.of(
                                                                    "type", "boolean",
                                                                    "description", "Set to true to allow multiple answers. Defaults to false."
                                                            )
                                                    ),
                                                    "required", List.of("question", "header", "options", "multiSelect"),
                                                    "additionalProperties", false
                                            )
                                    )
                            ),
                            "required", List.of("questions"),
                            "additionalProperties", false
                    )
            )
            .build();

    @Autowired(required = false)
    private StorageProvider storageProvider;

    @Autowired
    private RenamingService renamingService;

    @Autowired
    private FollowupSuggestionService followupSuggestionService;

    protected final AgentConfig agentConfig;

    protected AbstractAgentHandler(AgentConfig agentConfig) {
        this.agentConfig = agentConfig;
    }

    @Override
    public boolean supportInputType(ContentType contentType) {
        if (CollectionUtils.isEmpty(agentConfig.getSupportInputTypes())) {
            return false;
        }
        return agentConfig.getSupportInputTypes().contains(contentType);
    }

    @Override
    public String getId() {
        return agentConfig.getId();
    }

    protected void registerQuestionTool(ReActAgent agent) {
        if (!Boolean.TRUE.equals(agentConfig.getEnableQuestion()) || agent.getToolkit().getTool(QUESTION_TOOL_NAME) != null) {
            return;
        }
        agent.getToolkit().registerSchema(QUESTION_SCHEMA);
    }

    protected void renameSession(EventSink eventSink, Msg msg, List<Msg> history) {
        if (!Boolean.TRUE.equals(agentConfig.getEnableSessionRenaming())) {
            return;
        }
        renamingService.renameSession(getFastChatModel(), msg, history, eventSink.getAgentId(), eventSink.getSessionId());
    }

    protected void followupSuggestions(EventSink eventSink, List<Msg> history) {
        if (!Boolean.TRUE.equals(agentConfig.getEnableSuggestion())) {
            return;
        }
        followupSuggestionService.suggest(getFastChatModel(), history, eventSink);
    }

    protected void processMediaContentOfMemory(String userId, Memory memory) {
        if (storageProvider == null) {
            return;
        }

        boolean modified = false;
        List<Msg> msgs = Lists.newArrayList();
        for (Msg msg : memory.getMessages()) {
            Msg newMsg = processMediaContentOfMessage(userId, msg);
            if (newMsg != null) {
                modified = true;
                msgs.add(newMsg);
            } else {
                msgs.add(msg);
            }
        }
        if (modified) {
            memory.clear();
            msgs.forEach(memory::addMessage);
        }
    }

    protected Msg processMediaContentOfMessage(String userId, Msg msg) {
        if (storageProvider == null) {
            return null;
        }

        if (msg.getRole() != MsgRole.USER) {
            return null;
        }

        boolean modified = false;
        List<ContentBlock> newContentBlocks = Lists.newArrayList();
        for (ContentBlock content : msg.getContent()) {
            if (content instanceof ImageBlock imageBlock) {
                Source newSource = processMediaContentOfSource(userId, imageBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new ImageBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else if (content instanceof VideoBlock videoBlock) {
                Source newSource = processMediaContentOfSource(userId, videoBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new VideoBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else if (content instanceof AudioBlock audioBlock) {
                Source newSource = processMediaContentOfSource(userId, audioBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new AudioBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else {
                newContentBlocks.add(content);
            }
        }

        if (!modified) {
            return null;
        }

        return Msg.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(newContentBlocks)
                .build();
    }

    private Source processMediaContentOfSource(String userId, Source source) {
        if (source instanceof URLSource urlSource) {
            String originalUrl = urlSource.getUrl();
            String newUrl = storageProvider.toPublicUrl(userId, originalUrl);
            if (!Objects.equals(originalUrl, newUrl)) {
                return new URLSource(newUrl);
            }
        }
        return null;
    }

    protected Msg buildRuntimeContext(Msg msg) {
        String runtimeContext = RUNTIME_CONTEXT_PREFIX + LocalDateTime.now().format(FORMATTER);

        TextBlock firstTextBlock = msg.getContent().stream()
                .filter(block -> block instanceof TextBlock)
                .findFirst()
                .map(block -> (TextBlock) block)
                .orElse(null);
        List<ContentBlock> blocks = Lists.newArrayList();
        if (firstTextBlock != null) {
            blocks.add(
                    TextBlock.builder().text(runtimeContext + "\n\n" + firstTextBlock.getText())
                            .build()
            );
            for (ContentBlock block : msg.getContent()) {
                if (block != firstTextBlock) {
                    blocks.add(block);
                }
            }
        } else {
            blocks.addAll(msg.getContent());
            blocks.add(
                    TextBlock.builder().text(RUNTIME_CONTEXT_PREFIX)
                            .build()
            );
        }

        return Msg.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(blocks)
                .build();
    }

    protected ChatModelBase getFastChatModel() {
        ChatModelConfig config = agentConfig.getFastChatModel();
        if (config == null) {
            config = agentConfig.getChatModel();
        }
        return BaseAgentBuilder.newChatModel(config);
    }
}
