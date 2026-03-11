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

import com.aliyun.tam.x.tron.core.domain.models.PageResult;
import com.aliyun.tam.x.tron.core.domain.models.Session;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AgentStateDO;
import com.aliyun.tam.x.tron.infra.dal.dataobject.MessageDO;
import com.aliyun.tam.x.tron.infra.dal.dataobject.SessionDO;
import com.aliyun.tam.x.tron.infra.dal.dataobject.SessionEventDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.AgentStateMapper;
import com.aliyun.tam.x.tron.infra.dal.mapper.MessageMapper;
import com.aliyun.tam.x.tron.infra.dal.mapper.SessionEventMapper;
import com.aliyun.tam.x.tron.infra.dal.mapper.SessionMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class MysqlSessionRepository implements SessionRepository {

    @Autowired
    private SessionMapper sessionMapper;

    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private SessionEventMapper sessionEventMapper;

    @Autowired
    private AgentStateMapper agentStateMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void newSession(Session session) {
        SessionDO sessionDO = new SessionDO();
        sessionDO.setSessionId(session.getId());
        sessionDO.setAgentId(session.getAgentId());
        sessionDO.setUserId(session.getUserId());
        sessionDO.setName(session.getName() != null ? session.getName() : "");
        sessionDO.setLastAppliedEventId(session.getLastAppliedEventId() != null ? session.getLastAppliedEventId() : 0L);
        sessionDO.setGmtCreated(LocalDateTime.now());
        sessionDO.setGmtModified(sessionDO.getGmtCreated());
        sessionMapper.insert(sessionDO);
    }

    @Override
    public PageResult<Session> listSessions(String agentId, String userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<SessionDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SessionDO::getAgentId, agentId)
                .eq(SessionDO::getUserId, userId)
                .orderByDesc(SessionDO::getId);

        Page<SessionDO> page = new Page<>(pageNo, pageSize);
        Page<SessionDO> result = sessionMapper.selectPage(page, queryWrapper);

        List<Session> items = result.getRecords().stream()
                .map(this::convertToSession)
                .collect(Collectors.toList());
        return PageResult.<Session>builder()
                .records(items)
                .totalRecords(result.getTotal())
                .pageNum(pageNo)
                .pageSize(pageSize)
                .totalPages((int) ((result.getTotal() + pageSize - 1) / pageSize))
                .build();
    }

    @Override
    public Session getSession(String agentId, String sessionId) {
        LambdaQueryWrapper<SessionDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SessionDO::getSessionId, sessionId)
                .eq(SessionDO::getAgentId, agentId);

        SessionDO sessionDO = sessionMapper.selectOne(queryWrapper);
        return sessionDO != null ? convertToSession(sessionDO) : null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteSession(String agentId, String sessionId) {
        LambdaQueryWrapper<SessionDO> sessionWrapper = new LambdaQueryWrapper<>();
        sessionWrapper.eq(SessionDO::getSessionId, sessionId)
                .eq(SessionDO::getAgentId, agentId);
        sessionMapper.delete(sessionWrapper);

        LambdaQueryWrapper<MessageDO> messageWrapper = new LambdaQueryWrapper<>();
        messageWrapper.eq(MessageDO::getSessionId, sessionId)
                .eq(MessageDO::getAgentId, agentId);
        messageMapper.delete(messageWrapper);

        LambdaQueryWrapper<SessionEventDO> eventWrapper = new LambdaQueryWrapper<>();
        eventWrapper.eq(SessionEventDO::getSessionId, sessionId)
                .eq(SessionEventDO::getAgentId, agentId);
        sessionEventMapper.delete(eventWrapper);

        LambdaQueryWrapper<AgentStateDO> stateWrapper = new LambdaQueryWrapper<>();
        stateWrapper.eq(AgentStateDO::getSessionId, sessionId)
                .eq(AgentStateDO::getAgentId, agentId);
        agentStateMapper.delete(stateWrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateSessionName(String agentId, String sessionId, String name) {
        LambdaUpdateWrapper<SessionDO> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(SessionDO::getSessionId, sessionId)
                .eq(SessionDO::getAgentId, agentId)
                .set(SessionDO::getName, name)
                .set(SessionDO::getGmtModified, LocalDateTime.now());
        sessionMapper.update(null, updateWrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateSessionLastAppliedEventId(String agentId, String sessionId, long lastAppliedEventId) {
        LambdaUpdateWrapper<SessionDO> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(SessionDO::getSessionId, sessionId)
                .eq(SessionDO::getAgentId, agentId)
                .lt(SessionDO::getLastAppliedEventId, lastAppliedEventId)
                .set(SessionDO::getLastAppliedEventId, lastAppliedEventId)
                .set(SessionDO::getGmtModified, LocalDateTime.now());
        sessionMapper.update(null, updateWrapper);
    }

    private Session convertToSession(SessionDO sessionDO) {
        return Session.builder()
                .id(sessionDO.getSessionId())
                .agentId(sessionDO.getAgentId())
                .userId(sessionDO.getUserId())
                .name(sessionDO.getName())
                .lastAppliedEventId(sessionDO.getLastAppliedEventId() != null ? sessionDO.getLastAppliedEventId() : 0L)
                .gmtCreated(sessionDO.getGmtCreated())
                .gmtModified(sessionDO.getGmtModified())
                .build();
    }
}
