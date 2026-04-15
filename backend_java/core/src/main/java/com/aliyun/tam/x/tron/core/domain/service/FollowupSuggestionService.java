package com.aliyun.tam.x.tron.core.domain.service;

import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowupSuggestionService {
    @Value("${tron.suggection.enabled:true}")
    private boolean enabled;

    @Value("${tron.suggection.history.limit:10}")
    private int historyLimit;

    private final SessionRepository sessionRepository;

    private final Tracer tracer;

    public void suggest(Model model, Msg msg, List<Msg> history, String agentId, String sessionId) {
        if (enabled) {
            Context otelContext = Context.current();
            doSuggest(model, msg, history, agentId, sessionId, otelContext);
        }
    }

    @Async
    public void doSuggest(Model model, Msg msg, List<Msg> history, String agentId, String sessionId, Context otelContext) {
        Span span = tracer.spanBuilder("followup suggestion")
                .setParent(otelContext)
                .setAttribute("agent.id", agentId)
                .setAttribute("session.id", sessionId)
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
            sessionRepository.updateSessionName(agentId, sessionId, name);
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
