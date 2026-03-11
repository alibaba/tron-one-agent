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

import com.aliyun.tam.x.tron.core.domain.models.contents.ActionContent;
import com.aliyun.tam.x.tron.core.domain.models.contents.TaskContent;
import com.aliyun.tam.x.tron.core.domain.models.events.*;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.MessageRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.aliyun.tam.x.tron.infra.dal.dataobject.SessionEventDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.SessionEventMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class MysqlEventRepository implements EventRepository {

    @Autowired
    private SessionEventMapper sessionEventMapper;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private SequenceService sequenceService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final Map<SessionEventType, Class<? extends SessionEvent>> EVENT_TYPE_TO_CLS =
            ImmutableMap.<SessionEventType, Class<? extends SessionEvent>>builder()
                    .put(SessionEventType.SESSION_NAME_CHANGED, SessionNameChangedEvent.class)
                    .put(SessionEventType.NEW_USER_INPUT, NewUserInputEvent.class)
                    .put(SessionEventType.NEW_AGENT_MESSAGE, NewAgentMessageEvent.class)
                    .put(SessionEventType.AGENT_MESSAGE_APPEND_CONTENT, AgentMessageAppendContentEvent.class)
                    .put(SessionEventType.AGENT_MESSAGE_STATUS_CHANGED, AgentMessageStatusChangedEvent.class)
                    .put(SessionEventType.TASK_APPEND_CONTENT, TaskAppendContentEvent.class)
                    .put(SessionEventType.TASK_STATUS_CHANGED, TaskStatusChangeEvent.class)
                    .put(SessionEventType.ACTION_APPEND_CONTENT, ActionAppendContentEvent.class)
                    .put(SessionEventType.ACTION_STATUS_CHANGED, ActionStatusChangeEvent.class)
                    .build();

    @Override
    public List<SessionEvent> pullEvents(String agentId, String sessionId, long offset, int size) {
        LambdaQueryWrapper<SessionEventDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SessionEventDO::getSessionId, sessionId)
                .eq(SessionEventDO::getAgentId, agentId)
                .gt(SessionEventDO::getId, offset)
                .orderByAsc(SessionEventDO::getId)
                .last("LIMIT " + size);

        List<SessionEventDO> eventDOs = sessionEventMapper.selectList(wrapper);
        List<SessionEvent> events = new ArrayList<>();

        for (SessionEventDO eventDO : eventDOs) {
            SessionEventType type = SessionEventType.fromValue(eventDO.getType());
            Class<? extends SessionEvent> cls = EVENT_TYPE_TO_CLS.get(type);

            if (cls == null) {
                continue;
            }

            try {
                SessionEvent event = objectMapper.readValue(eventDO.getData(), cls);
                event.setId(eventDO.getId());
                event.setAgentId(eventDO.getAgentId());
                event.setUserId(eventDO.getUserId());
                event.setSessionId(eventDO.getSessionId());
                event.setGmtCreated(eventDO.getGmtCreated());
                if (eventDO.getMessageId() != null) {
                    if (event instanceof AgentMessageAppendContentEvent) {
                        ((AgentMessageAppendContentEvent) event).setMessageId(eventDO.getMessageId());
                    } else if (event instanceof AgentMessageStatusChangedEvent) {
                        ((AgentMessageStatusChangedEvent) event).setMessageId(eventDO.getMessageId());
                    } else if (event instanceof TaskAppendContentEvent) {
                        ((TaskAppendContentEvent) event).setMessageId(eventDO.getMessageId());
                    } else if (event instanceof TaskStatusChangeEvent) {
                        ((TaskStatusChangeEvent) event).setMessageId(eventDO.getMessageId());
                    } else if (event instanceof ActionAppendContentEvent) {
                        ((ActionAppendContentEvent) event).setMessageId(eventDO.getMessageId());
                    } else if (event instanceof ActionStatusChangeEvent) {
                        ((ActionStatusChangeEvent) event).setMessageId(eventDO.getMessageId());
                    }
                }

                events.add(event);
            } catch (Exception e) {
            }
        }

        return events;
    }

    @Override
    public EventSink createEventSink(String agentId, String userId, String sessionId, Long messageId) {
        return new MySQLEventSink(agentId, userId, sessionId, messageId);
    }

    public class MySQLEventSink extends EventSink {

        public MySQLEventSink(String agentId, String userId, String sessionId, Long messageId) {
            super(agentId, userId, sessionId, messageId);
        }

        @Override
        public Long nextSequence(SequenceService.SequenceName sequenceName) {
            return MysqlEventRepository.this.sequenceService.nextSequence(sequenceName);
        }

        @Override
        @Transactional(rollbackFor = Exception.class)
        public void newEvent(SessionEvent event) {
            Long messageId = null;
            if (event instanceof AgentMessageAppendContentEvent) {
                messageId = ((AgentMessageAppendContentEvent) event).getMessageId();
            } else if (event instanceof AgentMessageStatusChangedEvent) {
                messageId = ((AgentMessageStatusChangedEvent) event).getMessageId();
            } else if (event instanceof TaskAppendContentEvent) {
                messageId = ((TaskAppendContentEvent) event).getMessageId();
            } else if (event instanceof TaskStatusChangeEvent) {
                messageId = ((TaskStatusChangeEvent) event).getMessageId();
            } else if (event instanceof ActionAppendContentEvent) {
                messageId = ((ActionAppendContentEvent) event).getMessageId();
            } else if (event instanceof ActionStatusChangeEvent) {
                messageId = ((ActionStatusChangeEvent) event).getMessageId();
            } else if (event instanceof NewUserInputEvent) {
                UserSessionMessage msg = ((NewUserInputEvent) event).getMsg();
                if (msg != null && msg.getId() != null) {
                    messageId = msg.getId();
                }
            } else if (event instanceof NewAgentMessageEvent) {
                AgentSessionMessage msg = ((NewAgentMessageEvent) event).getMsg();
                if (msg != null && msg.getId() != null) {
                    messageId = msg.getId();
                }
            }

            Short status = null;
            if (event instanceof AgentMessageStatusChangedEvent) {
                SessionMessageStatus eventStatus =
                        ((AgentMessageStatusChangedEvent) event).getNewStatus();
                if (eventStatus != null) {
                    status = (short) eventStatus.getValue();
                }
            }

            try {
                String data = objectMapper.writeValueAsString(event);

                SessionEventDO eventDO = new SessionEventDO();
                eventDO.setId(event.getId());
                eventDO.setAgentId(event.getAgentId());
                eventDO.setUserId(event.getUserId());
                eventDO.setSessionId(event.getSessionId());
                eventDO.setMessageId(messageId);
                eventDO.setType((short) event.getType().getValue());
                eventDO.setStatus(status);
                eventDO.setData(data);
                MysqlEventRepository.this.sessionEventMapper.insert(eventDO);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize event", e);
            }
            if (event instanceof SessionNameChangedEvent) {
                handleSessionNameChanged((SessionNameChangedEvent) event);
            } else if (event instanceof NewUserInputEvent) {
                handleNewUserInput((NewUserInputEvent) event);
            } else if (event instanceof NewAgentMessageEvent) {
                handleNewAgentMessage((NewAgentMessageEvent) event);
            } else if (event instanceof AgentMessageAppendContentEvent) {
                handleAgentMessageAppendContent((AgentMessageAppendContentEvent) event);
            } else if (event instanceof AgentMessageStatusChangedEvent) {
                handleAgentMessageStatusChanged((AgentMessageStatusChangedEvent) event);
            } else if (event instanceof TaskAppendContentEvent) {
                handleTaskAppendContent((TaskAppendContentEvent) event);
            } else if (event instanceof TaskStatusChangeEvent) {
                handleTaskStatusChange((TaskStatusChangeEvent) event);
            } else if (event instanceof ActionAppendContentEvent) {
                handleActionAppendContent((ActionAppendContentEvent) event);
            } else if (event instanceof ActionStatusChangeEvent) {
                handleActionStatusChange((ActionStatusChangeEvent) event);
            }

            updateSessionLastAppliedEventId(event.getAgentId(), event.getSessionId(), event.getId());
        }

        private void handleSessionNameChanged(SessionNameChangedEvent event) {
            sessionRepository.updateSessionName(event.getAgentId(), event.getSessionId(), event.getNewName());
        }

        private void handleNewUserInput(NewUserInputEvent event) {
            saveMessage(event.getMsg());
        }

        private void handleNewAgentMessage(NewAgentMessageEvent event) {
            saveMessage(event.getMsg());
        }

        private void handleAgentMessageAppendContent(AgentMessageAppendContentEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                agentMsg.append(event.getNewContents());
                saveMessage(agentMsg);
            }
        }

        private void handleAgentMessageStatusChanged(AgentMessageStatusChangedEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                SessionMessageStatus msgStatus = event.getNewStatus();
                if (msgStatus != null) {
                    agentMsg.setStatus(msgStatus);
                }
                agentMsg.setGmtFinished(event.getGmtFinished());
                saveMessage(agentMsg);
            }
        }

        private void handleTaskAppendContent(TaskAppendContentEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                TaskContent task = agentMsg.findTask(event.getTaskId());
                if (task != null) {
                    task.append(event.getNewContents());
                    saveMessage(agentMsg);
                }
            }
        }

        private void handleTaskStatusChange(TaskStatusChangeEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                TaskContent task = agentMsg.findTask(event.getTaskId());
                if (task != null) {
                    task.setStatus(event.getNewStatus());
                    task.setResult(event.getResult());
                    task.setGmtFinished(event.getGmtFinished());
                    task.setGmtModified(LocalDateTime.now());
                    saveMessage(agentMsg);
                }
            }
        }

        private void handleActionAppendContent(ActionAppendContentEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                ActionContent action = agentMsg.findAction(event.getActionId());
                if (action != null) {
                    action.append(event.getNewContents());
                    saveMessage(agentMsg);
                }
            }
        }

        private void handleActionStatusChange(ActionStatusChangeEvent event) {
            SessionMessage msg = getMessage(event.getMessageId());
            if (msg instanceof AgentSessionMessage agentMsg) {
                ActionContent action = agentMsg.findAction(event.getActionId());
                if (action != null) {
                    action.setStatus(event.getNewStatus());
                    action.setGmtFinished(event.getGmtFinished());
                    action.setGmtModified(LocalDateTime.now());
                    saveMessage(agentMsg);
                }
            }
        }

        private SessionMessage getMessage(Long messageId) {
            if (messageId == null) {
                return null;
            }
            return messageRepository.getMessage(messageId);
        }

        private void saveMessage(SessionMessage msg) {
            if (msg == null) {
                return;
            }
            messageRepository.saveMessage(msg);
        }

        private void updateSessionLastAppliedEventId(String agentId, String sessionId, Long eventId) {
            sessionRepository.updateSessionLastAppliedEventId(agentId, sessionId, eventId);
        }
    }
}
