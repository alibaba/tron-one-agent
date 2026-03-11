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

import com.aliyun.tam.x.tron.core.config.McpClientConfig;
import com.aliyun.tam.x.tron.core.domain.repository.McpClientRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.McpClientDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.McpClientMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class MysqlMcpClientRepository implements McpClientRepository {

    @Autowired
    private McpClientMapper mcpClientMapper;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void saveConfig(McpClientConfig config) {
        LambdaQueryWrapper<McpClientDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(McpClientDO::getMcpId, config.getId());
        McpClientDO existing = mcpClientMapper.selectOne(wrapper);

        try {
            String configJson = objectMapper.writeValueAsString(config);

            if (existing == null) {
                McpClientDO newEntity = new McpClientDO();
                newEntity.setMcpId(config.getId());
                newEntity.setName(config.getName());
                newEntity.setEnabled(1);
                newEntity.setConfig(configJson);
                newEntity.setGmtCreated(LocalDateTime.now());
                newEntity.setGmtModified(newEntity.getGmtCreated());
                mcpClientMapper.insert(newEntity);
            } else {
                existing.setName(config.getName());
                existing.setEnabled(config.getEnabled() != null && config.getEnabled() ? 1 : 0);
                existing.setConfig(configJson);
                existing.setGmtModified(LocalDateTime.now());
                mcpClientMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to save mcp client config", e);
        }
    }

    @Override
    public List<McpClientConfig> listConfigs() {
        List<McpClientDO> entities = mcpClientMapper.selectList(null);
        return entities.stream().map(entity -> {
            try {
                McpClientConfig config = objectMapper.readValue(entity.getConfig(), McpClientConfig.class);
                config.setId(entity.getMcpId());
                config.setName(entity.getName());
                config.setEnabled(entity.getEnabled() != 0);
                return config;
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse mcp client config", e);
            }
        }).collect(Collectors.toList());
    }

    @Override
    public McpClientConfig getConfigById(String mcpId) {
        LambdaQueryWrapper<McpClientDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(McpClientDO::getMcpId, mcpId);
        McpClientDO entity = mcpClientMapper.selectOne(wrapper);
        
        if (entity == null) {
            return null;
        }

        try {
            McpClientConfig config = objectMapper.readValue(entity.getConfig(), McpClientConfig.class);
            config.setId(entity.getMcpId());
            config.setName(entity.getName());
            config.setEnabled(entity.getEnabled() != 0);
            return config;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse mcp client config", e);
        }
    }

    @Override
    public boolean deleteConfigById(String mcpId) {
        LambdaQueryWrapper<McpClientDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(McpClientDO::getMcpId, mcpId);
        int deletedRows = mcpClientMapper.delete(wrapper);
        return deletedRows > 0;
    }
}
