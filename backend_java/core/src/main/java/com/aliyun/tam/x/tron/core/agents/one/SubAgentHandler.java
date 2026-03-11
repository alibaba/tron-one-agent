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

import com.aliyun.tam.x.tron.core.config.SubAgentConfig;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import io.agentscope.core.tool.Toolkit;

import java.util.Set;

public abstract class SubAgentHandler {
    private final SubAgentConfig subAgentConfig;

    protected SubAgentHandler(SubAgentConfig subAgentConfig) {
        this.subAgentConfig = subAgentConfig;
    }

    public String agentId() {
        return subAgentConfig.getAgentId();
    }

    public abstract Set<String> registerAgentTools(Toolkit toolkit, UserSessionMessage userMessage, EventSink eventSink);
}
