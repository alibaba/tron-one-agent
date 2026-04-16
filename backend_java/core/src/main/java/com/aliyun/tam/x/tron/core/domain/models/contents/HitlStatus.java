package com.aliyun.tam.x.tron.core.domain.models.contents;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum HitlStatus {
    PENDING(1),
    APPROVED(2),
    REJECTED(3),
    ;
    private final int value;

    HitlStatus(int value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }

    @JsonCreator
    public static HitlStatus fromValue(int value) {
        for (HitlStatus status : values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown HitlStatus value: " + value);
    }
}