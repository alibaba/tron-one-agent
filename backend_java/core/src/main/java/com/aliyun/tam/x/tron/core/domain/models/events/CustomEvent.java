package com.aliyun.tam.x.tron.core.domain.models.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CustomEvent<T> extends SessionEvent {

    @NonNull
    private SessionEventType type;

    private T data;

    @Builder.Default
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private boolean needPersistent = false;


    public boolean needPersistent() {
        return needPersistent;
    }
}
