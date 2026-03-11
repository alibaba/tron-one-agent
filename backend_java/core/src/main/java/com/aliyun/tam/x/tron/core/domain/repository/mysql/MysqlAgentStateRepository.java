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


package com.aliyun.tam.x.tron.core.domain.repository.mysql;

import com.aliyun.tam.x.tron.core.domain.repository.AgentStateRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AgentStateDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.AgentStateMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.Lists;
import io.agentscope.core.session.Session;
import io.agentscope.core.state.SessionKey;
import io.agentscope.core.state.SimpleSessionKey;
import io.agentscope.core.state.State;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Repository
public class MysqlAgentStateRepository implements AgentStateRepository {


    @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
    public static class MysqlAgentSession implements Session {
        private final String agentId;

        private final String userId;

        private final MysqlAgentStateRepository mysqlAgentStateRepository;
        
        private final ObjectMapper objectMapper;

        @Override
        public void save(SessionKey sessionKey, String key, State value) {
            mysqlAgentStateRepository.saveState(agentId, userId, sessionKey.toIdentifier(), data -> {
                data.set(key, objectMapper.valueToTree(value));
            });
        }

        @Override
        public void save(SessionKey sessionKey, String key, List<? extends State> values) {
            mysqlAgentStateRepository.saveState(agentId, userId, sessionKey.toIdentifier(), data -> {
                data.set(key, objectMapper.valueToTree(values));
            });
        }

        @Override
        public <T extends State> Optional<T> get(SessionKey sessionKey, String key, Class<T> type) {
            return Optional.ofNullable(mysqlAgentStateRepository.getStateData(agentId, userId, sessionKey.toIdentifier()))
                    .map(data -> {
                        try {
                            return objectMapper.convertValue(data.get(key), type);
                        } catch (Exception e) {
                            return null;
                        }
                    });
        }

        @Override
        public <T extends State> List<T> getList(SessionKey sessionKey, String key, Class<T> itemType) {
            return Optional.ofNullable(mysqlAgentStateRepository.getStateData(agentId, userId, sessionKey.toIdentifier()))
                    .map(data -> {
                        try {
                            Object list = data.get(key);
                            if (list == null) return Lists.<T>newArrayList();
                            return objectMapper.convertValue(list, 
                                objectMapper.getTypeFactory().constructCollectionType(List.class, itemType));
                        } catch (Exception e) {
                            return Lists.<T>newArrayList();
                        }
                    })
                    .orElseGet(Lists::newArrayList);
        }

        @Override
        public boolean exists(SessionKey sessionKey) {
            return mysqlAgentStateRepository.getStateData(agentId, userId, sessionKey.toIdentifier()) != null;
        }

        @Override
        public void delete(SessionKey sessionKey) {
            mysqlAgentStateRepository.deleteState(agentId, userId, sessionKey.toIdentifier());
        }

        @Override
        public Set<SessionKey> listSessionKeys() {
            return mysqlAgentStateRepository.listSessionIds(agentId, userId)
                    .stream()
                    .map(SimpleSessionKey::new)
                    .collect(Collectors.toSet());
        }
    }

    @Autowired
    private AgentStateMapper agentStateMapper;
    
    @Autowired
    private ObjectMapper objectMapper;


    @Override
    public Session agentSessionsOf(String agentId, String userId) {
        return new MysqlAgentSession(agentId, userId, this, objectMapper);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ObjectNode getStateData(String agentId, String userId, String sessionId) {
        LambdaQueryWrapper<AgentStateDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentStateDO::getSessionId, sessionId)
                .eq(AgentStateDO::getAgentId, agentId)
                .eq(AgentStateDO::getUserId, userId);
        AgentStateDO entity = agentStateMapper.selectOne(wrapper);
        if (entity == null) {
            return null;
        }

        try {
            return (ObjectNode) objectMapper.readTree(entity.getData());
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse agent state", e);
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<String> listSessionIds(String agentId, String userId) {
        LambdaQueryWrapper<AgentStateDO> wrapper = new LambdaQueryWrapper<>();
        wrapper
                .eq(AgentStateDO::getAgentId, agentId)
                .eq(AgentStateDO::getUserId, userId);
        return agentStateMapper.selectList(wrapper)
                .stream()
                .map(AgentStateDO::getSessionId)
                .toList();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteState(String agentId, String userId, String sessionId) {
        LambdaQueryWrapper<AgentStateDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentStateDO::getSessionId, sessionId)
                .eq(AgentStateDO::getAgentId, agentId)
                .eq(AgentStateDO::getUserId, userId);
        agentStateMapper.delete(wrapper);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveState(String agentId, String userId, String sessionId, Consumer<ObjectNode> consumer) {
        LambdaQueryWrapper<AgentStateDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentStateDO::getSessionId, sessionId)
                .eq(AgentStateDO::getAgentId, agentId);

        AgentStateDO existing = agentStateMapper.selectOne(wrapper);
        try {
            ObjectNode data = existing == null ? objectMapper.createObjectNode() : (ObjectNode) objectMapper.readTree(existing.getData());
            consumer.accept(data);

            if (existing == null) {
                AgentStateDO newEntity = new AgentStateDO();
                newEntity.setAgentId(agentId);
                newEntity.setUserId(userId);
                newEntity.setSessionId(sessionId);
                newEntity.setData(objectMapper.writeValueAsString(data));
                newEntity.setGmtCreated(LocalDateTime.now());
                newEntity.setGmtModified(newEntity.getGmtCreated());
                agentStateMapper.insert(newEntity);
            } else {
                existing.setData(objectMapper.writeValueAsString(data));
                existing.setGmtModified(LocalDateTime.now());
                agentStateMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save agent state", e);
        }
    }

}
