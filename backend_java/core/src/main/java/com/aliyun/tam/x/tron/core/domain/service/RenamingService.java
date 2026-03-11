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


package com.aliyun.tam.x.tron.core.domain.service;

import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.google.common.collect.Lists;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.Model;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RenamingService {
    @Value("${tron.renaming.history.limit: 2}")
    private int historyLimit;

    @Async
    public void renameSession(Model model, Msg msg, List<Msg> history, EventSink eventSink) {
        String text = "Below is the history of the conversation :\n\n";
        text += history.stream()
                .filter(h -> h.getRole() == MsgRole.USER || h.getRole() == MsgRole.ASSISTANT)
                .filter(h -> CollectionUtils.isEmpty(h.getContentBlocks(ToolUseBlock.class)))
                .filter(h -> h.getTextContent() != null)
                .limit(historyLimit)
                .map(m -> {
                    return String.format("%s: %s", m.getRole(), m.getTextContent());
                }).collect(Collectors.joining("\n"));
        text += String.format("\n%s: %s", msg.getRole(), msg.getTextContent());
        text += "\n\nFrom user's perspective, summarize and generate a concise session name (within 20 characters, excluding the word \"session\") based on the history, latest input, and user's language.";

        Msg prompt = Msg.builder()
                .name(msg.getName())
                .role(MsgRole.USER)
                .textContent(text)
                .build();
        String name = model.stream(Lists.newArrayList(prompt), Lists.newArrayList(), GenerateOptions.builder()
                        .build())
                .map(ChatResponse::getContent)
                .flatMap(Flux::fromIterable)
                .filter(c -> c instanceof TextBlock)
                .map(c -> (TextBlock) c)
                .map(TextBlock::getText)
                .reduce((s, s2) -> s + s2)
                .block();
        eventSink.renameSession(name);
    }
}
