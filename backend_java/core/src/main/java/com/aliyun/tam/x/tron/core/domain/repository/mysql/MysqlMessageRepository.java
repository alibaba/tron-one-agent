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
import com.aliyun.tam.x.tron.core.domain.models.messages.*;
import com.aliyun.tam.x.tron.core.domain.repository.MessageRepository;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.aliyun.tam.x.tron.infra.dal.dataobject.MessageDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.MessageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class MysqlMessageRepository implements MessageRepository {


    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private SequenceService sequenceService;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void saveMessage(SessionMessage msg) {
        MessageDO messageDO = new MessageDO();
        messageDO.setId(msg.getId());
        messageDO.setSessionId(msg.getSessionId());
        messageDO.setAgentId(msg.getAgentId());
        messageDO.setUserId(msg.getUserId());
        messageDO.setType((short) msg.getType().getValue());
        messageDO.setStatus((short) msg.getStatus().getValue());
        try {
            messageDO.setData(objectMapper.writeValueAsString(msg));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize message", e);
        }

        MessageDO existing = messageMapper.selectById(msg.getId());
        if (existing == null) {
            messageDO.setGmtCreated(LocalDateTime.now());
            messageDO.setGmtModified(messageDO.getGmtCreated());
            messageMapper.insert(messageDO);
        } else {
            messageDO.setGmtModified(LocalDateTime.now());
            messageMapper.updateById(messageDO);
        }
    }

    @Override
    public SessionMessage getMessage(Long messageId) {
        MessageDO messageDO = messageMapper.selectById(messageId);
        return convertToMessage(messageDO);
    }

    @Override
    public SessionMessage lastMessage(String agentId, String sessionId) {
        LambdaQueryWrapper<MessageDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MessageDO::getSessionId, sessionId)
                .eq(MessageDO::getAgentId, agentId)
                .orderByDesc(MessageDO::getId)
                .last("LIMIT 1");
        MessageDO messageDO = messageMapper.selectOne(wrapper);
        return convertToMessage(messageDO);
    }

    @Override
    public PageResult<SessionMessage> listMessages(String agentId, String sessionId, int pageNo, int pageSize) {
        LambdaQueryWrapper<MessageDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MessageDO::getSessionId, sessionId)
                .eq(MessageDO::getAgentId, agentId)
                .orderByDesc(MessageDO::getId);

        Page<MessageDO> page = new Page<>(pageNo, pageSize);
        Page<MessageDO> result = messageMapper.selectPage(page, wrapper);

        List<SessionMessage> messages = result.getRecords().stream()
                .map(this::convertToMessage)
                .collect(Collectors.toList());

        return PageResult.<SessionMessage>builder()
                .totalRecords(result.getTotal())
                .records(messages)
                .pageNum(pageNo)
                .pageSize(pageSize)
                .totalPages((int) ((result.getTotal() + pageSize - 1) / pageSize))
                .build();
    }

    private SessionMessage convertToMessage(MessageDO messageDO) {
        if (messageDO == null) {
            return null;
        }

        SessionMessageType type = SessionMessageType.fromValue(messageDO.getType());
        SessionMessage msg = null;

        try {
            if (type == SessionMessageType.USER) {
                msg = objectMapper.readValue(messageDO.getData(), UserSessionMessage.class);
            } else if (type == SessionMessageType.AGENT) {
                msg = objectMapper.readValue(messageDO.getData(), AgentSessionMessage.class);
            }

            if (msg != null) {
                msg.setId(messageDO.getId());
                msg.setSessionId(messageDO.getSessionId());
                msg.setAgentId(messageDO.getAgentId());
                msg.setUserId(messageDO.getUserId());
                msg.setStatus(SessionMessageStatus.fromValue(messageDO.getStatus()));
                msg.setGmtCreate(messageDO.getGmtCreated());
                msg.setGmtModified(messageDO.getGmtModified());
            }

            return msg;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse message", e);
        }
    }

}
