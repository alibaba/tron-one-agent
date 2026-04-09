package com.aliyun.tam.x.tron.core.utils;

import io.agentscope.core.agent.AgentBase;
import io.agentscope.core.hook.*;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.model.ChatUsage;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Metrics;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class AgentMetricsHook implements Hook {
    @PostConstruct
    public void init() {
        AgentBase.addSystemHook(this);
    }

    private final Map<String, Long> ongoingToolUseStartTimestamp = new ConcurrentHashMap<>();

    @Override

    public <T extends HookEvent> Mono<T> onEvent(T event) {
        if (event instanceof PostReasoningEvent e) {
            publishModelUsage(e.getAgent().getDescription(), e.getModelName(), e.getReasoningMessage().getChatUsage());
            Counter.builder("one.agent.times.reasoning")
                    .tag("agent.id", e.getAgent().getDescription())
                    .tag("model.name", e.getModelName())
                    .register(Metrics.globalRegistry)
                    .increment();
        } else if (event instanceof PreActingEvent e) {
            String toolUseId = e.getToolUse().getId();
            ongoingToolUseStartTimestamp.put(toolUseId, e.getTimestamp());
        } else if (event instanceof PostActingEvent e) {
            Counter.builder("one.agent.times.acting")
                    .tag("agent.id", e.getAgent().getDescription())
                    .register(Metrics.globalRegistry)
                    .increment();

            ToolUseBlock toolUse = e.getToolUse();
            Long startTime = ongoingToolUseStartTimestamp.remove(toolUse.getId());
            if (startTime != null) {
                long duration = e.getTimestamp() - startTime;
                DistributionSummary.builder("one.agent.tool.time")
                        .tag("agent.id", e.getAgent().getDescription())
                        .tag("tool.name", toolUse.getName())
                        .baseUnit("seconds")
                        .publishPercentileHistogram()
                        .register(Metrics.globalRegistry)
                        .record((double) duration / 1000);
            }
        } else if (event instanceof PostSummaryEvent e) {
            publishModelUsage(e.getAgent().getDescription(), e.getModelName(), e.getSummaryMessage().getChatUsage());
            Counter.builder("one.agent.times.summary")
                    .tag("agent.id", e.getAgent().getDescription())
                    .tag("model.name", e.getModelName())
                    .register(Metrics.globalRegistry)
                    .increment();
        } else if (event instanceof ErrorEvent e) {
            Counter.builder("one.agent.times.error")
                    .tag("agent.id", e.getAgent().getDescription())
                    .register(Metrics.globalRegistry)
                    .increment();
        }
        return Mono.just(event);
    }

    private void publishModelUsage(String agentId, String modelName, ChatUsage chatUsage) {
        DistributionSummary.builder("one.agent.model.input")
                .tag("agent.id", agentId)
                .tag("model.name", modelName)
                .baseUnit("tokens")
                .publishPercentileHistogram()
                .register(Metrics.globalRegistry)
                .record(chatUsage.getInputTokens());
        DistributionSummary.builder("one.agent.model.output")
                .tag("agent.id", agentId)
                .tag("model.name", modelName)
                .baseUnit("tokens")
                .publishPercentileHistogram()
                .register(Metrics.globalRegistry)
                .record(chatUsage.getOutputTokens());

        DistributionSummary.builder("one.agent.model.time")
                .tag("agent.id", agentId)
                .tag("model.name", modelName)
                .baseUnit("seconds")
                .publishPercentileHistogram()
                .register(Metrics.globalRegistry)
                .record(chatUsage.getTime());
    }
}
