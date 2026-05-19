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


package com.aliyun.tam.x.tron.api.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.PathMatcher;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthInterceptor implements WebFilter {

    public static final String ATTR_USERNAME = "auth.username";

    private static final String UNAUTHORIZED_RESPONSE =
            "{\"code\":401,\"success\":false,\"message\":\"Unauthorized\"}";

    private static final List<String> INCLUDE_PATTERNS =
            List.of("/control/**", "/debug/**", "/auth/me");

    private static final List<String> EXCLUDE_PATTERNS = List.of("/auth/login");

    private static final PathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtUtils jwtUtils;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().pathWithinApplication().value();

        if (!shouldFilter(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String username = jwtUtils.parseUsername(token);
            if (username != null) {
                exchange.getAttributes().put(ATTR_USERNAME, username);
                return chain.filter(exchange);
            }
        }

        return writeUnauthorized(exchange.getResponse());
    }

    private boolean shouldFilter(String path) {
        for (String exclude : EXCLUDE_PATTERNS) {
            if (PATH_MATCHER.match(exclude, path)) {
                return false;
            }
        }
        for (String include : INCLUDE_PATTERNS) {
            if (PATH_MATCHER.match(include, path)) {
                return true;
            }
        }
        return false;
    }

    private Mono<Void> writeUnauthorized(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = response.bufferFactory()
                .wrap(UNAUTHORIZED_RESPONSE.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
