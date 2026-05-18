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


package com.aliyun.tam.x.tron.core.domain.repository.mysql;

import com.aliyun.tam.x.tron.core.domain.repository.AdminRepository;
import com.aliyun.tam.x.tron.infra.dal.dataobject.AdminUserDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.AdminUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class MysqlAdminRepository implements AdminRepository {

    private final AdminUserMapper adminUserMapper;

    @Override
    public AdminUserDO findByUsername(String username) {
        return adminUserMapper.selectOne(
                new LambdaQueryWrapper<AdminUserDO>().eq(AdminUserDO::getUsername, username));
    }

    @Override
    public List<AdminUserDO> listAll() {
        return adminUserMapper.selectList(
                new LambdaQueryWrapper<AdminUserDO>().orderByAsc(AdminUserDO::getId));
    }

    @Override
    public void save(AdminUserDO adminUser) {
        adminUser.setGmtCreated(LocalDateTime.now());
        adminUser.setGmtModified(LocalDateTime.now());
        adminUserMapper.insert(adminUser);
    }

    @Override
    public void updatePassword(String username, String encryptedPassword) {
        adminUserMapper.update(null,
                new LambdaUpdateWrapper<AdminUserDO>()
                        .eq(AdminUserDO::getUsername, username)
                        .set(AdminUserDO::getPassword, encryptedPassword)
                        .set(AdminUserDO::getGmtModified, LocalDateTime.now()));
    }

    @Override
    public void deleteByUsername(String username) {
        adminUserMapper.delete(
                new LambdaQueryWrapper<AdminUserDO>().eq(AdminUserDO::getUsername, username));
    }

    @Override
    public long count() {
        return adminUserMapper.selectCount(null);
    }
}
