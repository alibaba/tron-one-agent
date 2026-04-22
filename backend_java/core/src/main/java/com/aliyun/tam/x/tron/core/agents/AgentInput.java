package com.aliyun.tam.x.tron.core.agents;

import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Agent result
 */
@Data
@Builder
@AllArgsConstructor
public class AgentInput {
    public enum Source {
        USER,
        AGENT,

    }

    private final UserSessionMessage userMessage;

    private final EventSink eventSink;

    @Builder.Default
    private Source source = Source.USER;
}
