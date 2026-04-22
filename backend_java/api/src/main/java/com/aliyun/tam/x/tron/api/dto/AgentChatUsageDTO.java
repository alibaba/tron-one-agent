package com.aliyun.tam.x.tron.api.dto;

import io.agentscope.core.model.ChatUsage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentChatUsageDTO {
    private int times;

    private long costInMs;

    private long promptTokens;

    private long completionTokens;

}
