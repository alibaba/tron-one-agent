package com.aliyun.tam.x.tron.ws.jsonrpc;


public class JsonRpcException extends RuntimeException {
    private final Object id;

    private final int code;

    private final String message;

    private final Object data;

    public JsonRpcException(Object id, int code, String message) {
        this(id, code, message, null);
    }

    public JsonRpcException(Object id, int code, String message, Object data) {
        super(code + " - " + message);
        this.id = id;
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public JsonRpcException(Object id, Throwable t) {
        super(JsonRpcError.INTERNAL_ERROR + " - " + t.getMessage(), t);
        this.id = id;
        this.code = JsonRpcError.INTERNAL_ERROR;
        this.message = t.getMessage();
        this.data = null;
    }

    public JsonRpcResponse toResponse() {
        return JsonRpcResponse.error(id, JsonRpcError.builder()
                .code(code)
                .message(message)
                .data(data)
                .build());
    }
}
