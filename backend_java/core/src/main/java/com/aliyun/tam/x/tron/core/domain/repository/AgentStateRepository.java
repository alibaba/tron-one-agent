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


package com.aliyun.tam.x.tron.core.domain.repository;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.agentscope.core.session.Session;

import java.util.List;
import java.util.function.Consumer;

public interface AgentStateRepository {

    Session agentSessionsOf(String agentId, String userId);

    ObjectNode getStateData(String agentId, String userId, String sessionId);

    List<String> listSessionIds(String agentId, String userId);

    void deleteState(String agentId, String userId, String sessionId);

    void saveState(String agentId, String userId, String sessionId, Consumer<ObjectNode> consumer);
}
