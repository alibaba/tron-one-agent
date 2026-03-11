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

import com.aliyun.tam.x.tron.core.config.AgentConfig;
import com.aliyun.tam.x.tron.core.config.LocalAgentType;
import com.aliyun.tam.x.tron.core.domain.repository.AgentRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AgentDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.AgentMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public class MysqlAgentRepository implements AgentRepository {

    @Autowired
    private AgentMapper agentMapper;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public AgentConfig getConfig(String agentId) {
        LambdaQueryWrapper<AgentDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentDO::getAgentId, agentId);
        AgentDO entity = agentMapper.selectOne(wrapper);
        if (entity == null) {
            return null;
        }

        try {
            AgentConfig config = objectMapper.readValue(entity.getConfig(), AgentConfig.class);
            config.setId(entity.getAgentId());
            config.setName(entity.getName());
            config.setEnabled(entity.getEnabled() != 0);
            config.setType(LocalAgentType.values()[entity.getType()]);
            return config;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse agent config", e);
        }
    }

    @Override
    public void saveConfig(String agentId, AgentConfig config) {
        LambdaQueryWrapper<AgentDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentDO::getAgentId, agentId);
        AgentDO existing = agentMapper.selectOne(wrapper);

        try {
            String configJson = objectMapper.writeValueAsString(config);

            if (existing == null) {
                AgentDO newEntity = new AgentDO();
                newEntity.setAgentId(agentId);
                newEntity.setName(config.getName());
                newEntity.setEnabled(config.getEnabled() != null && config.getEnabled() ? 1 : 0);
                newEntity.setType(config.getType() != null ? (short) config.getType().ordinal() : 0);
                newEntity.setConfig(configJson);
                newEntity.setGmtCreated(LocalDateTime.now());
                newEntity.setGmtModified(newEntity.getGmtCreated());
                agentMapper.insert(newEntity);
            } else {
                existing.setName(config.getName());
                existing.setEnabled(config.getEnabled() != null && config.getEnabled() ? 1 : 0);
                existing.setType(config.getType() != null ? (short) config.getType().ordinal() : 0);
                existing.setConfig(configJson);
                existing.setGmtModified(LocalDateTime.now());
                agentMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save agent config", e);
        }
    }
}
