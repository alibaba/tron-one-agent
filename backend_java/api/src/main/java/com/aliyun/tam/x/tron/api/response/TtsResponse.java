package com.aliyun.tam.x.tron.api.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TtsResponse {
    @Builder.Default
    private Boolean success = true;

    private String dataBase64;

    @Builder.Default
    private Boolean finished = false;

    private String error;
}