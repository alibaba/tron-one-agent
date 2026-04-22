package com.aliyun.tam.x.tron.core.agents;

import io.agentscope.core.model.ChatUsage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentChatUsage {
    @Builder.Default
    private int times = 0;

    @Builder.Default
    private long costInMs = 0;

    @Builder.Default
    private long promptTokens = 0;

    @Builder.Default
    private long completionTokens = 0;

    public void increment(ChatUsage usage) {
        times++;
        costInMs += (long) Math.ceil(usage.getTime() * 1000);
        promptTokens += usage.getInputTokens();
        completionTokens += usage.getOutputTokens();
    }
}
