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

import com.aliyun.tam.x.tron.api.dto.AdminDTO;
import com.aliyun.tam.x.tron.api.request.CreateAdminRequest;
import com.aliyun.tam.x.tron.api.request.UpdateAdminRequest;
import com.aliyun.tam.x.tron.core.domain.service.AdminService;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AdminUserDO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/control/admins")
@RequiredArgsConstructor
@Validated
public class AdminController {

    private final AdminService adminService;

    @ExceptionHandler
    public ConfigController.ControlResponse<?> handleException(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ConfigController.ControlResponse.error(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
        log.error("Internal server error", e);
        return ConfigController.ControlResponse.error(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal server error");
    }

    @GetMapping
    public ConfigController.ControlResponse<?> listAdmins() {
        List<AdminDTO> admins = adminService.listAdmins().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ConfigController.ControlResponse.success(admins);
    }

    @PostMapping
    public ConfigController.ControlResponse<?> createAdmin(@RequestBody @Validated CreateAdminRequest request) {
        adminService.createAdmin(request.getUsername(), request.getPassword());
        return ConfigController.ControlResponse.success(null);
    }

    @PutMapping("/{username}")
    public ConfigController.ControlResponse<?> updatePassword(
            @PathVariable("username") String username,
            @RequestBody @Validated UpdateAdminRequest request) {
        adminService.updatePassword(username, request.getPassword());
        return ConfigController.ControlResponse.success(null);
    }

    @DeleteMapping("/{username}")
    public ConfigController.ControlResponse<?> deleteAdmin(@PathVariable("username") String username) {
        adminService.deleteAdmin(username);
        return ConfigController.ControlResponse.success(null);
    }

    private AdminDTO toDTO(AdminUserDO adminUser) {
        return AdminDTO.builder()
                .username(adminUser.getUsername())
                .gmtCreated(adminUser.getGmtCreated())
                .gmtModified(adminUser.getGmtModified())
                .build();
    }
}
