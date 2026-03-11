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


package com.aliyun.tam.x.tron.core.domain.models.events;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Session event type enum
 */
public enum SessionEventType {
    SESSION_NAME_CHANGED(1),

    NEW_USER_INPUT(10),

    NEW_AGENT_MESSAGE(20),
    AGENT_MESSAGE_APPEND_CONTENT(21),
    AGENT_MESSAGE_STATUS_CHANGED(22),

    TASK_APPEND_CONTENT(30),
    TASK_STATUS_CHANGED(31),

    ACTION_APPEND_CONTENT(40),
    ACTION_STATUS_CHANGED(41);

    private final int value;

    SessionEventType(int value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }

    /**
     * 根据值获取枚举类型
     */
    @JsonCreator
    public static SessionEventType fromValue(int value) {
        for (SessionEventType type : SessionEventType.values()) {
            if (type.value == value) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown SessionEventType value: " + value);
    }
}
