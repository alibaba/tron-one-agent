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

import com.aliyun.tam.x.tron.core.config.SkillConfig;
import com.aliyun.tam.x.tron.core.domain.repository.SkillConfigRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.SkillConfigDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.FileMapper;
import com.aliyun.tam.x.tron.infra.dal.mapper.SkillConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class MysqlSkillConfigRepository implements SkillConfigRepository {
    private final SkillConfigMapper skillConfigMapper;

    private final FileMapper fileMapper;

    @Override
    public void add(SkillConfig skillConfig) {
        SkillConfigDO existing = skillConfigMapper.selectOne(
                new LambdaQueryWrapper<SkillConfigDO>()
                        .eq(SkillConfigDO::getName, skillConfig.getName())
        );
        if (existing != null) {
            throw new IllegalArgumentException("Skill already exists");
        } else {
            SkillConfigDO entity = toDataObject(skillConfig);
            entity.setGmtCreated(LocalDateTime.now());
            entity.setGmtModified(entity.getGmtCreated());
            skillConfigMapper.insert(entity);
            skillConfig.setId(entity.getId());
        }
    }

    @Override
    public void update(SkillConfig skillConfig) {
        SkillConfigDO existing = skillConfigMapper.selectById(skillConfig.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Skill not found");
        } else {
            SkillConfigDO entity = toDataObject(skillConfig);
            entity.setGmtModified(LocalDateTime.now());
            skillConfigMapper.updateById(entity);
        }
    }

    @Override
    public List<SkillConfig> list() {
        List<SkillConfigDO> entities = skillConfigMapper.selectList(null);
        return entities.stream()
                .map(this::toSkillConfig)
                .collect(Collectors.toList());
    }

    @Override
    public SkillConfig get(Long id) {
        SkillConfigDO entity = skillConfigMapper.selectById(id);
        if (entity == null) {
            return null;
        }
        return toSkillConfig(entity);
    }

    @Override
    public void delete(Long id) {
        SkillConfigDO skillConfigDO = skillConfigMapper.selectById(id);
        if (skillConfigDO != null) {
            skillConfigMapper.deleteById(id);
            fileMapper.deleteById(skillConfigDO.getFileId());
        } else {
            throw new IllegalArgumentException("Skill not found");
        }
    }

    private SkillConfigDO toDataObject(SkillConfig config) {
        SkillConfigDO entity = new SkillConfigDO();
        entity.setId(config.getId());
        entity.setName(config.getName());
        entity.setEnabled(config.getEnabled() == null ? null : config.getEnabled() ? 1 : 0);
        entity.setDescription(config.getDescription());
        entity.setInstruction(config.getInstruction());
        entity.setBaseDir(config.getBaseDir());
        entity.setFiles(config.getFiles() != null ? String.join("\n", config.getFiles()) : null);
        entity.setFileId(config.getFileId());
        entity.setChecksum(config.getChecksum());
        return entity;
    }

    private SkillConfig toSkillConfig(SkillConfigDO entity) {
        return SkillConfig.builder()
                .id(entity.getId())
                .name(entity.getName())
                .enabled(entity.getEnabled() != null && entity.getEnabled() != 0)
                .description(entity.getDescription())
                .instruction(entity.getInstruction())
                .baseDir(entity.getBaseDir())
                .files(List.of(entity.getFiles().split("\n")))
                .fileId(entity.getFileId())
                .checksum(entity.getChecksum())
                .build();
    }
}
