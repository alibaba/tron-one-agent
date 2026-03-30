package com.aliyun.tam.x.tron.ws.jsonrpc;

import lombok.Builder;
import lombok.Data;
import lombok.NonNull;

@Data
@Builder
public class JsonRpcError {
    public static final int PARSE_ERROR = -32700;
    public static final int INVALID_REQUEST = -32600;
    public static final int METHOD_NOT_FOUND = -32601;
    public static final int INVALID_PARAMS = -32602;
    public static final int INTERNAL_ERROR = -32603;

    public static final int SERVER_ERROR_START = -32000;
    public static final int SERVER_ERROR_END = -32099;

    private final String jsonrpc = "2.0";

    @NonNull
    private Integer code;

    @NonNull
    private String message;

    private Object data;
}
