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

package com.aliyun.tam.x.tron.ws.jsonrpc;


import java.io.Serial;

public class JsonRpcException extends RuntimeException {
    @Serial
    private static final long serialVersionUID = 1870763915083895024L;

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
