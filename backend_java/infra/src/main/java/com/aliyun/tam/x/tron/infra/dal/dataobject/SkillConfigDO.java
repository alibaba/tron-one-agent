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


package com.aliyun.tam.x.tron.infra.dal.dataobject;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 技能表DO
 */
@Data
@TableName("skill_configs")
public class SkillConfigDO {
    /**
     * 主键ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 技能名称
     */
    @TableField("name")
    private String name;

    /**
     * 是否启用
     */
    @TableField("enabled")
    private Integer enabled;

    /**
     * 描述
     */
    @TableField("description")
    private String description;

    /**
     * 使用说明
     */
    @TableField("instruction")
    private String instruction;

    /**
     * 基础目录
     */
    @TableField("base_dir")
    private String baseDir;

    /**
     * 上传的文件列表
     */
    @TableField("files")
    private String files;

    /**
     * 文件ID
     */
    @TableField("file_id")
    private Long fileId;

    /**
     * 校验和
     */
    @TableField("checksum")
    private String checksum;

    /**
     * 修改时间
     */
    @TableField(value = "gmt_modified", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime gmtModified;

    /**
     * 创建时间
     */
    @TableField(value = "gmt_created", fill = FieldFill.INSERT)
    private LocalDateTime gmtCreated;
}
