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

import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import io.agentscope.core.session.Session;
import io.agentscope.core.state.SessionKey;
import io.agentscope.core.state.StateModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public interface AgentHandler extends StateModule {

    String getId();

    String handleInput(UserSessionMessage userMessage, EventSink eventSink);

    default boolean supportInputType(ContentType contentType) {
        return true;
    }
}

class AgentHandlerLoggingWrapper implements AgentHandler {

    private final String agentId;
    private final AgentHandler agentHandler;
    private final Logger logger;

    protected AgentHandlerLoggingWrapper(String agentId, AgentHandler agentHandler) {
        this.agentId = agentId;
        this.agentHandler = agentHandler;
        this.logger = LoggerFactory.getLogger("agent." + agentId);
    }

    @Override
    public void saveTo(Session session, SessionKey sessionKey) {
        agentHandler.saveTo(session, sessionKey);
    }

    @Override
    public void loadFrom(Session session, SessionKey sessionKey) {
        agentHandler.loadFrom(session, sessionKey);
    }

    @Override
    public String getId() {
        return agentId;
    }

    @Override
    public String handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        long startTime = System.currentTimeMillis();
        try {
            logger.info("serving user input, agent_id={}, user_id={}, session_id={}, user_message_id={}, agent_message_id={}",
                    agentId, userMessage.getUserId(), userMessage.getSessionId(), userMessage.getId(), eventSink.getMessageId());
            String result = agentHandler.handleInput(userMessage, eventSink);
            logger.info("finished serving user input, agent_id={}, user_id={}, session_id={}, user_message_id={}, agent_message_id={}",
                    agentId, userMessage.getUserId(), userMessage.getSessionId(), userMessage.getId(), eventSink.getMessageId());
            return result;
        } catch (Exception e) {
            logger.error("Encounter exception during handling input, cost={}ms, agent_id={}, user_id={}, session_id={}, agent_message_id={}",
                    System.currentTimeMillis() - startTime, agentId, userMessage.getUserId(), userMessage.getSessionId(), eventSink.getMessageId(), e);
            throw e;
        }
    }
}