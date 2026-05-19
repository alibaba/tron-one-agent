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


package com.aliyun.tam.x.tron.api;

import com.aliyun.tam.x.tron.api.auth.JwtAuthInterceptor;
import com.aliyun.tam.x.tron.api.auth.JwtUtils;
import com.aliyun.tam.x.tron.api.dto.AdminDTO;
import com.aliyun.tam.x.tron.api.request.LoginRequest;
import com.aliyun.tam.x.tron.core.domain.service.AdminService;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AdminUserDO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AdminService adminService;
    private final JwtUtils jwtUtils;

    @Data
    @AllArgsConstructor
    public static class LoginResponse {
        private String token;
        private String username;
    }

    @ExceptionHandler
    public ConfigController.ControlResponse<?> handleException(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ConfigController.ControlResponse.error(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
        log.error("Internal server error", e);
        return ConfigController.ControlResponse.error(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal server error");
    }

    @PostMapping("/login")
    public ConfigController.ControlResponse<?> login(@RequestBody @Validated LoginRequest request) {
        AdminUserDO admin = adminService.login(request.getUsername(), request.getPassword());
        String token = jwtUtils.generateToken(admin.getUsername());
        return ConfigController.ControlResponse.success(new LoginResponse(token, admin.getUsername()));
    }

    @GetMapping("/me")
    public ConfigController.ControlResponse<?> me(ServerWebExchange exchange) {
        String username = exchange.getAttribute(JwtAuthInterceptor.ATTR_USERNAME);
        return ConfigController.ControlResponse.success(AdminDTO.builder().username(username).build());
    }
}
