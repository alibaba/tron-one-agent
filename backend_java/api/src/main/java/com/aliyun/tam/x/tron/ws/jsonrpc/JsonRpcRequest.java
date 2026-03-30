package com.aliyun.tam.x.tron.ws.jsonrpc;

import lombok.Builder;
import lombok.Data;
import lombok.NonNull;

@Data
@Builder
public class JsonRpcRequest implements JsonRpc {
    private final String jsonrpc = "2.0";

    @NonNull
    private Object id;

    @NonNull
    private String method;

    private Object params;
}
