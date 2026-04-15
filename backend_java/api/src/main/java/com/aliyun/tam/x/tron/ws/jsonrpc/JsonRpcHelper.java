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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import org.springframework.web.bind.annotation.RequestParam;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JsonRpcHelper {
    private static final String FIELD_JSONRPC = "jsonrpc";

    private static final String JSON_RPC_VERSION = "2.0";

    private final ObjectMapper objectMapper;

    public JsonRpcRequest parseRequest(String message) {
        Object id = null;
        try {
            Map<String, Object> map = objectMapper.readValue(message, new TypeReference<Map<String, Object>>() {
            });

            id = map.get("id");
            if (id == null) {
                throw new JsonRpcException(id, JsonRpcError.PARSE_ERROR, "request id is null");
            }
            if (!(id instanceof String || id instanceof Integer || id instanceof Long)) {
                throw new JsonRpcException(id, JsonRpcError.PARSE_ERROR, "invalid request id");
            }

            if (!JSON_RPC_VERSION.equals(map.get(FIELD_JSONRPC))) {
                throw new JsonRpcException(id, JsonRpcError.INVALID_REQUEST, "invalid json rpc version");
            }
            String method = (String) map.get("method");
            if (method == null) {
                throw new JsonRpcException(id, JsonRpcError.INVALID_REQUEST, "request method is null");
            }

            Object params = map.get("params");
            if (params != null && !(params instanceof Map || params instanceof List<?>)) {
                throw new JsonRpcException(id, JsonRpcError.INVALID_REQUEST, "invalid request params");
            }
            return JsonRpcRequest.builder()
                    .id(id)
                    .method(method)
                    .params(params)
                    .build();
        } catch (JsonProcessingException e) {
            log.warn("parse json rpc request error", e);
            throw new JsonRpcException(id, JsonRpcError.PARSE_ERROR, "parse json rpc request error");
        }
    }

    public String serialize(JsonRpc jsonRpc) {
        try {
            return objectMapper.writeValueAsString(jsonRpc);
        } catch (JsonProcessingException e) {
            log.error("serialize json rpc error", e);
            if (jsonRpc instanceof JsonRpcResponse resp) {
                try {
                    return objectMapper.writeValueAsString(JsonRpcResponse.error(resp.getId(),
                            JsonRpcError.builder()
                                    .code(JsonRpcError.INTERNAL_ERROR)
                                    .message("serialize json rpc error")
                                    .build())
                    );
                } catch (JsonProcessingException ex) {
                    // ignore
                }
            }
        }
        return null;
    }

    public Object callMethod(Method method, Object target, Object args, Map<String, Object> context) throws InvocationTargetException, IllegalAccessException {
        Parameter[] parameters = method.getParameters();
        Object[] resolvedArgs = new Object[parameters.length];
        List<Integer> unfilledIndices = new ArrayList<>();

        for (int i = 0; i < parameters.length; i++) {
            String paramName = getParameterName(parameters[i]);
            if (context != null && context.containsKey(paramName)) {
                resolvedArgs[i] = convertValue(context.get(paramName), parameters[i].getType());
            } else {
                unfilledIndices.add(i);
            }
        }

        if (args instanceof Map) {
            Map<String, Object> argsMap = (Map<String, Object>) args;
            for (int i : unfilledIndices) {
                String paramName = getParameterName(parameters[i]);
                if (argsMap.containsKey(paramName)) {
                    resolvedArgs[i] = convertValue(argsMap.get(paramName), parameters[i].getType());
                }
            }
        } else if (args instanceof List) {
            List<?> argsList = (List<?>) args;
            int argsIndex = 0;
            for (int i : unfilledIndices) {
                if (argsIndex < argsList.size()) {
                    resolvedArgs[i] = convertValue(argsList.get(argsIndex++), parameters[i].getType());
                }
            }
        }

        return method.invoke(target, resolvedArgs);
    }

    private String getParameterName(Parameter parameter) {
        RequestParam requestParam = parameter.getAnnotation(RequestParam.class);
        if (requestParam != null && !requestParam.value().isEmpty()) {
            return requestParam.value();
        }
        if (requestParam != null && !requestParam.name().isEmpty()) {
            return requestParam.name();
        }
        return parameter.getName();
    }

    /**
     * 将值转换为目标类型
     */
    private Object convertValue(Object value, Class<?> targetType) {
        if (value == null) {
            return null;
        }
        if (targetType.isInstance(value)) {
            return value;
        }
        return objectMapper.convertValue(value, targetType);
    }
}
