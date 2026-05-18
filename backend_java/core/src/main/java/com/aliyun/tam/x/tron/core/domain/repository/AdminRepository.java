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


package com.aliyun.tam.x.tron.core.domain.repository;

import com.aliyun.tam.x.tron.infra.dal.dataobject.AdminUserDO;

import java.util.List;

public interface AdminRepository {

    AdminUserDO findByUsername(String username);

    List<AdminUserDO> listAll();

    void save(AdminUserDO adminUser);

    void updatePassword(String username, String encryptedPassword);

    void deleteByUsername(String username);

    long count();
}
