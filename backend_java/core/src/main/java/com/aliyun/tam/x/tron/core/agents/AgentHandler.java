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
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Metrics;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public interface AgentHandler extends StateModule {

    String getId();

    AgentResult handleInput(UserSessionMessage userMessage, EventSink eventSink);

    default boolean supportInputType(ContentType contentType) {
        return true;
    }
}

class AgentHandlerLoggingWrapper implements AgentHandler {

    private final String agentId;

    private final AgentHandler agentHandler;

    private final Logger logger;

    private final Tracer tracer;

    protected AgentHandlerLoggingWrapper(String agentId, AgentHandler agentHandler, Tracer tracer) {
        this.agentId = agentId;
        this.agentHandler = agentHandler;
        this.logger = LoggerFactory.getLogger("agent." + agentId);
        this.tracer = tracer;
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
    public AgentResult handleInput(UserSessionMessage userMessage, EventSink eventSink) {
        Span span = tracer.spanBuilder("handling input")
                .setAttribute("agent.id", agentId)
                .setAttribute("user.id", userMessage.getUserId())
                .setAttribute("session.id", eventSink.getSessionId())
                .setAttribute("user.message.id", userMessage.getId())
                .setAttribute("agent.message.id", eventSink.getMessageId())
                .startSpan();
        Timer.Sample timerSample = Timer.start(Metrics.globalRegistry);
        try (var ignored = span.makeCurrent()) {
            logger.info("serving user input, agent_id={}, user_id={}, session_id={}, user_message_id={}, agent_message_id={}",
                    agentId, userMessage.getUserId(), userMessage.getSessionId(), userMessage.getId(), eventSink.getMessageId());

            AgentResult result = agentHandler.handleInput(userMessage, eventSink);

            logger.info("finished serving user input, agent_id={}, user_id={}, session_id={}, user_message_id={}, agent_message_id={}, result={}",
                    agentId, userMessage.getUserId(), userMessage.getSessionId(), userMessage.getId(), eventSink.getMessageId(), result);

            long costInNano = timerSample.stop(Timer.builder("one.agent.e2el")
                    .tag("agent.id", agentId)
                    .publishPercentileHistogram()
                    .register(Metrics.globalRegistry));

            DistributionSummary.builder("one.agent.ttft")
                    .tag("agent.id", agentId)
                    .baseUnit("milliseconds")
                    .publishPercentileHistogram()
                    .register(Metrics.globalRegistry)
                    .record(result.getFirstTokenDelayInMs());

            DistributionSummary.builder("one.agent.response.ttft")
                    .tag("agent.id", agentId)
                    .baseUnit("milliseconds")
                    .publishPercentileHistogram()
                    .register(Metrics.globalRegistry)
                    .record(result.getFirstResponseTokenDelayInMs());

            result.setCostInMs(costInNano / 1000);
            return result;
        } catch (Exception e) {
            long costInNano = timerSample.stop(Timer.builder("one.agent.e2el")
                    .tag("agent.id", agentId)
                    .tag("error", e.getClass().getSimpleName())
                    .publishPercentileHistogram()
                    .register(Metrics.globalRegistry));
            logger.error("Encounter exception during handling input, cost={}ms, agent_id={}, user_id={}, session_id={}, agent_message_id={}",
                    costInNano / 1000, agentId, userMessage.getUserId(), userMessage.getSessionId(), eventSink.getMessageId(), e);

            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }
}