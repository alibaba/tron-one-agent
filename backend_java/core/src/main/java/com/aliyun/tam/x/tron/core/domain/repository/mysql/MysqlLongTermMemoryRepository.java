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

import com.aliyun.tam.x.tron.core.config.LongTermMemoryConfig;
import com.aliyun.tam.x.tron.core.domain.repository.LongTermMemoryRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.LongTermMemoryConfigDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.LongTermMemoryConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class MysqlLongTermMemoryRepository implements LongTermMemoryRepository {

    @Autowired
    private LongTermMemoryConfigMapper longTermMemoryConfigMapper;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void saveConfig(LongTermMemoryConfig config) {
        LambdaQueryWrapper<LongTermMemoryConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LongTermMemoryConfigDO::getMemoryId, config.getId());
        LongTermMemoryConfigDO existing = longTermMemoryConfigMapper.selectOne(wrapper);

        try {
            String configJson = objectMapper.writeValueAsString(config);

            if (existing == null) {
                LongTermMemoryConfigDO newEntity = new LongTermMemoryConfigDO();
                newEntity.setMemoryId(config.getId());
                newEntity.setName(config.getName());
                newEntity.setEnabled(1);
                newEntity.setConfig(configJson);
                newEntity.setGmtCreated(LocalDateTime.now());
                newEntity.setGmtModified(newEntity.getGmtCreated());
                longTermMemoryConfigMapper.insert(newEntity);
            } else {
                existing.setName(config.getName());
                existing.setEnabled(config.getEnabled() != null && config.getEnabled() ? 1 : 0);
                existing.setConfig(configJson);
                existing.setGmtModified(LocalDateTime.now());
                longTermMemoryConfigMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save long term memory config", e);
        }
    }

    @Override
    public List<LongTermMemoryConfig> listConfigs() {
        List<LongTermMemoryConfigDO> entities = longTermMemoryConfigMapper.selectList(null);
        return entities.stream().map(entity -> {
            try {
                LongTermMemoryConfig config = objectMapper.readValue(entity.getConfig(), LongTermMemoryConfig.class);
                config.setId(entity.getMemoryId());
                config.setName(entity.getName());
                config.setEnabled(entity.getEnabled() != 0);
                return config;
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse long term memory config", e);
            }
        }).collect(Collectors.toList());
    }

    @Override
    public LongTermMemoryConfig getConfigById(String memoryId) {
        LambdaQueryWrapper<LongTermMemoryConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LongTermMemoryConfigDO::getMemoryId, memoryId);
        LongTermMemoryConfigDO entity = longTermMemoryConfigMapper.selectOne(wrapper);

        if (entity == null) {
            return null;
        }

        try {
            LongTermMemoryConfig config = objectMapper.readValue(entity.getConfig(), LongTermMemoryConfig.class);
            config.setId(entity.getMemoryId());
            config.setName(entity.getName());
            config.setEnabled(entity.getEnabled() != 0);
            return config;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse long term memory config", e);
        }
    }

    @Override
    public boolean deleteConfigById(String memoryId) {
        LambdaQueryWrapper<LongTermMemoryConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LongTermMemoryConfigDO::getMemoryId, memoryId);
        int deletedRows = longTermMemoryConfigMapper.delete(wrapper);
        return deletedRows > 0;
    }
}
