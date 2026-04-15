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

import com.aliyun.tam.x.tron.core.domain.models.events.CustomEvent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.events.SessionEventType;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.Model;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FollowupSuggestionService {
    @Value("${tron.suggection.enabled:true}")
    private boolean enabled;

    @Value("${tron.suggection.history.limit:10}")
    private int historyLimit;

    private final ObjectMapper objectMapper;

    private final Tracer tracer;

    public void suggest(Model model, List<Msg> history, EventSink eventSink) {
        if (enabled) {
            Context otelContext = Context.current();
            try {
                doSuggest(model, history, eventSink, otelContext);
            } catch (JsonProcessingException e) {
                log.error("Failed to process suggestions", e);
            }
        }
    }

    @Async
    public void doSuggest(Model model, List<Msg> history, EventSink eventSink, Context otelContext) throws JsonProcessingException {
        Span span = tracer.spanBuilder("followup suggestion")
                .setParent(otelContext)
                .setAttribute("agent.id", eventSink.getAgentId())
                .setAttribute("session.id", eventSink.getSessionId())
                .startSpan();
        try (Scope ignored = span.makeCurrent()) {
            String text = "Below is the history of the conversation :\n\n";
            text += history.stream()
                    .filter(h -> h.getRole() == MsgRole.USER || h.getRole() == MsgRole.ASSISTANT)
                    .filter(h -> CollectionUtils.isEmpty(h.getContentBlocks(ToolUseBlock.class)))
                    .filter(h -> h.getTextContent() != null)
                    .limit(historyLimit)
                    .map(m -> {
                        return String.format("%s: %s", m.getRole(), m.getTextContent());
                    }).collect(Collectors.joining("\n"));
            text += "\n\nFrom user's perspective, give at most 3 follow-up questions(in user's language) based on the history and latest input. Each question should be a complete sentence and stand alone as a valid question. \nOutput in JSON format(without any description and annotation, just the JSON content): \n Example:\n[\"content of suggestion 1\", \"content of suggestion 2\", \"content of suggestion 3\"]";

            Msg prompt = Msg.builder()
                    .role(MsgRole.USER)
                    .textContent(text)
                    .build();
            String suggestionContent = model.stream(Lists.newArrayList(prompt), Lists.newArrayList(), GenerateOptions.builder()
                            .build())
                    .map(ChatResponse::getContent)
                    .flatMap(Flux::fromIterable)
                    .filter(c -> c instanceof TextBlock)
                    .map(c -> (TextBlock) c)
                    .map(TextBlock::getText)
                    .reduce((s, s2) -> s + s2)
                    .block();
            span.setAttribute("suggestions", suggestionContent);
            List<String> suggestions = objectMapper.readValue(suggestionContent, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            eventSink.newEvent(
                    CustomEvent.builder()
                            .type(SessionEventType.FOLLOW_UP_SUGGESTION)
                            .needPersistent(false)
                            .data(suggestions)
                            .build()
            );
            span.setStatus(StatusCode.OK);
        } catch (Exception e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
