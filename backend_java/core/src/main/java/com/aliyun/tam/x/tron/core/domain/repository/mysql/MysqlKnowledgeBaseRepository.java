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

import com.aliyun.tam.x.tron.core.config.KnowledgeBaseConfig;
import com.aliyun.tam.x.tron.core.domain.repository.KnowledgeBaseRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.KnowledgeBaseConfigDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.KnowledgeBaseConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class MysqlKnowledgeBaseRepository implements KnowledgeBaseRepository {

    @Autowired
    private KnowledgeBaseConfigMapper knowledgeBaseConfigMapper;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void saveKnowledgeConfig(KnowledgeBaseConfig config) {
        LambdaQueryWrapper<KnowledgeBaseConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeBaseConfigDO::getKnowledgeBaseId, config.getId());
        KnowledgeBaseConfigDO existing = knowledgeBaseConfigMapper.selectOne(wrapper);

        try {
            String configJson = objectMapper.writeValueAsString(config);

            if (existing == null) {
                KnowledgeBaseConfigDO newEntity = new KnowledgeBaseConfigDO();
                newEntity.setKnowledgeBaseId(config.getId());
                newEntity.setName(config.getName());
                newEntity.setEnabled(1);
                newEntity.setConfig(configJson);
                newEntity.setGmtCreated(LocalDateTime.now());
                newEntity.setGmtModified(newEntity.getGmtCreated());
                knowledgeBaseConfigMapper.insert(newEntity);
            } else {
                existing.setName(config.getName());
                existing.setEnabled(config.getEnabled() != null && config.getEnabled() ? 1 : 0);
                existing.setConfig(configJson);
                existing.setGmtModified(LocalDateTime.now());
                knowledgeBaseConfigMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save knowledge config", e);
        }
    }

    @Override
    public List<KnowledgeBaseConfig> listKnowledgeConfigs() {
        List<KnowledgeBaseConfigDO> entities = knowledgeBaseConfigMapper.selectList(null);
        return entities.stream().map(entity -> {
            try {
                KnowledgeBaseConfig config = objectMapper.readValue(entity.getConfig(), KnowledgeBaseConfig.class);
                config.setId(entity.getKnowledgeBaseId());
                config.setName(entity.getName());
                config.setEnabled(entity.getEnabled() != 0);
                return config;
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse knowledge config", e);
            }
        }).collect(Collectors.toList());
    }

    @Override
    public boolean deleteKnowledgeById(String knowledgeBaseId) {
        LambdaQueryWrapper<KnowledgeBaseConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeBaseConfigDO::getKnowledgeBaseId, knowledgeBaseId);
        int deletedRows = knowledgeBaseConfigMapper.delete(wrapper);
        return deletedRows > 0;
    }

    @Override
    public KnowledgeBaseConfig getKnowledgeConfig(String knowledgeBaseId) {
        LambdaQueryWrapper<KnowledgeBaseConfigDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeBaseConfigDO::getKnowledgeBaseId, knowledgeBaseId);
        KnowledgeBaseConfigDO entity = knowledgeBaseConfigMapper.selectOne(wrapper);

        if (entity == null) {
            return null;
        }

        try {
            KnowledgeBaseConfig config = objectMapper.readValue(entity.getConfig(), KnowledgeBaseConfig.class);
            config.setId(entity.getKnowledgeBaseId());
            config.setName(entity.getName());
            config.setEnabled(entity.getEnabled() != 0);
            return config;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse knowledge config", e);
        }
    }
}
