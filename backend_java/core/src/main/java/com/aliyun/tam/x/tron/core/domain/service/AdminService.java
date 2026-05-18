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


package com.aliyun.tam.x.tron.core.domain.service;

import com.aliyun.tam.x.tron.core.domain.repository.AdminRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AdminUserDO;
import com.aliyun.tam.x.tron.utils.encrypt.EncryptUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@DependsOn("encryptUtils")
@RequiredArgsConstructor
public class AdminService {

    private static final String DEFAULT_ADMIN_USERNAME = "admin";

    private final AdminRepository adminRepository;

    @PostConstruct
    public void init() {
        if (adminRepository.count() == 0) {
            log.info("No admin users found, creating default admin user");
            AdminUserDO admin = new AdminUserDO();
            admin.setUsername(DEFAULT_ADMIN_USERNAME);
            admin.setPassword(EncryptUtils.encrypt("admin@123"));
            adminRepository.save(admin);
            log.info("Default admin user created: {}", DEFAULT_ADMIN_USERNAME);
        }
    }

    public AdminUserDO login(String username, String password) {
        AdminUserDO admin = adminRepository.findByUsername(username);
        if (admin == null) {
            throw new IllegalArgumentException("Invalid username or password");
        }
        String decryptedPassword = EncryptUtils.decrypt(admin.getPassword());
        if (!decryptedPassword.equals(password)) {
            throw new IllegalArgumentException("Invalid username or password");
        }
        return admin;
    }

    public void createAdmin(String username, String password) {
        AdminUserDO existing = adminRepository.findByUsername(username);
        if (existing != null) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }
        AdminUserDO admin = new AdminUserDO();
        admin.setUsername(username);
        admin.setPassword(EncryptUtils.encrypt(password));
        adminRepository.save(admin);
    }

    public void updatePassword(String username, String newPassword) {
        AdminUserDO existing = adminRepository.findByUsername(username);
        if (existing == null) {
            throw new IllegalArgumentException("Admin not found: " + username);
        }
        adminRepository.updatePassword(username, EncryptUtils.encrypt(newPassword));
    }

    public void deleteAdmin(String username) {
        if (DEFAULT_ADMIN_USERNAME.equals(username)) {
            throw new IllegalArgumentException("Cannot delete the default admin user");
        }
        AdminUserDO existing = adminRepository.findByUsername(username);
        if (existing == null) {
            throw new IllegalArgumentException("Admin not found: " + username);
        }
        adminRepository.deleteByUsername(username);
    }

    public List<AdminUserDO> listAdmins() {
        return adminRepository.listAll();
    }
}
