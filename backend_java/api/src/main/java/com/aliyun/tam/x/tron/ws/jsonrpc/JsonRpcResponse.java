package com.aliyun.tam.x.tron.ws.jsonrpc;

import lombok.Builder;
import lombok.Data;
import lombok.NonNull;

@Data
@Builder
public class JsonRpcResponse implements JsonRpc {
    private final String jsonrpc = "2.0";

    public static JsonRpcResponse success(@NonNull Object id, Object result) {
        return JsonRpcResponse.builder().id(id).result(result).build();
    }

    public static JsonRpcResponse error(@NonNull Object id, JsonRpcError error) {
        return JsonRpcResponse.builder().id(id).error(error).build();
    }

    @NonNull
    private Object id;

    private Object result;

    private JsonRpcError error;
}
