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

import com.fasterxml.jackson.annotation.JsonInclude;
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

    /**
     * Per JSON-RPC 2.0 spec: when the request id cannot be detected (Parse Error /
     * Invalid Request), the response id MUST be JSON null. Hence id is nullable here
     * and is always serialized so the wire frame is `{"jsonrpc":"2.0","id":null,...}`.
     */
    public static JsonRpcResponse error(Object id, JsonRpcError error) {
        return JsonRpcResponse.builder().id(id).error(error).build();
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Object id;

    private Object result;

    private JsonRpcError error;
}
