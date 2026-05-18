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

import { get, post, put, del } from './request';
import { CreateAdminRequest, UpdateAdminRequest, AdminDTO } from '@/types/admin.interface';

export const listAdmins = () => get<{ data: AdminDTO[] }>('/api/control/admins');

export const createAdmin = (data: CreateAdminRequest) => post('/api/control/admins', data);

export const updateAdminPassword = (username: string, data: UpdateAdminRequest) =>
  put(`/api/control/admins/${username}`, data);

export const deleteAdmin = (username: string) => del(`/api/control/admins/${username}`);
