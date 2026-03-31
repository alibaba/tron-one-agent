package com.aliyun.tam.x.tron.api.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Session model
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelRequest {
    private String message;
}
