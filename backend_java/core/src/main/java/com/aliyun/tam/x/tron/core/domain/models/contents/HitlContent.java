package com.aliyun.tam.x.tron.core.domain.models.contents;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.Map;

import static com.aliyun.tam.x.tron.core.domain.models.contents.ContentType.HITL;

/**
 * Human In The Loop content model
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class HitlContent extends Content<String> {

    private HitlStatus status;

    private String method;

    private Map<String, Object> properties;

    private String result;

    @Override
    public ContentType getType() {
        return HITL;
    }
}
