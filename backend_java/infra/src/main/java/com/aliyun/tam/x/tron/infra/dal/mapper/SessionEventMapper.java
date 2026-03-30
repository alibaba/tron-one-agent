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


package com.aliyun.tam.x.tron.infra.dal.mapper;

import com.aliyun.tam.x.tron.infra.dal.dataobject.SessionEventDO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 会话事件表Mapper
 */
@Mapper
public interface SessionEventMapper extends BaseMapper<SessionEventDO> {

    @Insert("<script>" +
            "INSERT INTO session_events (id, session_id, agent_id, user_id, message_id, type, status, data, gmt_created, gmt_modified) VALUES " +
            "<foreach collection='events' item='event' separator=',' > " +
            "(#{event.id}, #{event.sessionId}, #{event.agentId}, #{event.userId}, #{event.messageId}, #{event.type}, #{event.status}, #{event.data}, #{event.gmtCreated}, #{event.gmtModified}) " +
            "</foreach>" +
            "</script>")
    int insertBatch(@Param("events") List<SessionEventDO> events);
}
