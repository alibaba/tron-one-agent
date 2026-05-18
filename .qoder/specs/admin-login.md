# Admin Login & Management Implementation Plan

## Context

The Tron OneAgent control console currently has no authentication — anyone with network access can modify agent configurations. This plan adds admin login with JWT authentication and a management page for CRUD operations on admin accounts, protecting all control/debug endpoints behind login.

**Outcome**: Only authenticated admins can access the control console. Default admin is `admin/admin@123`. All admins can manage other admins. The `admin` account cannot be deleted.

---

## 1. Database Schema

**File**: `backend_java/bootstrap/src/main/resources/schema/init.sql`

Add at end:

```sql
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `password` VARCHAR(512) NOT NULL,
  `gmt_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Default admin seeding: Use a `@PostConstruct` initializer in `AdminService` — if no admin exists, create `admin` with `EncryptUtils.encrypt("admin@123")`.

---

## 2. API Contract (`backend_java_api.yaml`)

Add security scheme and new endpoints:

### Security Scheme
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current admin info |
| GET | `/control/admins` | Yes | List all admins |
| POST | `/control/admins` | Yes | Create admin |
| PUT | `/control/admins/{username}` | Yes | Update password |
| DELETE | `/control/admins/{username}` | Yes | Delete admin (not "admin") |

### Schemas
- `LoginRequest`: `{ username: string, password: string }`
- `LoginResponse`: `{ token: string, username: string }`
- `AdminDTO`: `{ username: string, gmtCreated: string, gmtModified: string }`
- `CreateAdminRequest`: `{ username: string, password: string }`
- `UpdateAdminRequest`: `{ password: string }`

---

## 3. Backend — New Dependencies

**File**: `backend_java/api/pom.xml`

Add jjwt 0.12.6:
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

---

## 4. Backend — Infra Layer

### New Files

| File | Content |
|------|---------|
| `infra/.../dal/dataobject/AdminUserDO.java` | `@TableName("admin_users")`, fields: id, username, password, gmtCreated, gmtModified |
| `infra/.../dal/mapper/AdminUserMapper.java` | `extends BaseMapper<AdminUserDO>` |

---

## 5. Backend — Core Layer

### New Files

| File | Content |
|------|---------|
| `core/.../domain/repository/AdminRepository.java` | Interface: `findByUsername`, `listAll`, `save`, `updatePassword`, `deleteByUsername`, `count` |
| `core/.../domain/repository/mysql/MysqlAdminRepository.java` | Implementation using AdminUserMapper + LambdaQueryWrapper |
| `core/.../domain/service/AdminService.java` | Business logic: login, CRUD, prevent delete "admin", @PostConstruct seed |

**AdminService key methods:**
- `login(username, password)` — find user, `EncryptUtils.decrypt(storedPassword)`, compare, return AdminUserDO or throw
- `createAdmin(username, password)` — check uniqueness, `EncryptUtils.encrypt(password)`, save
- `updatePassword(username, newPassword)` — encrypt and update
- `deleteAdmin(username)` — reject if "admin", otherwise delete
- `listAdmins()` — return all (no password field exposed)
- `init()` (`@PostConstruct`) — if count == 0, create default admin

---

## 6. Backend — API Layer

### New Files

| File | Content |
|------|---------|
| `api/.../api/auth/JwtUtils.java` | `@Component`, generate/parse JWT using jjwt + HMAC-SHA256, key from `tron.encrypt.key`, 24h expiry |
| `api/.../api/auth/JwtAuthInterceptor.java` | `HandlerInterceptor`, validate Bearer token, set username in request attribute |
| `api/.../api/AuthController.java` | `@RestController @RequestMapping("/auth")` — login + me endpoints |
| `api/.../api/AdminController.java` | `@RestController @RequestMapping("/control/admins")` — CRUD endpoints |
| `api/.../api/request/LoginRequest.java` | `@Data`: username, password (both `@NotBlank`) |
| `api/.../api/request/CreateAdminRequest.java` | `@Data`: username (`@NotBlank @Size(max=64)`), password (`@NotBlank`) |
| `api/.../api/request/UpdateAdminRequest.java` | `@Data`: password (`@NotBlank`) |
| `api/.../api/dto/AdminDTO.java` | `@Data @Builder`: username, gmtCreated, gmtModified |

### AuthController
- `POST /auth/login` — validate credentials via AdminService, generate token via JwtUtils, return `ControlResponse.success(LoginResponse)`
- `GET /auth/me` — read username from request attribute, return `ControlResponse.success(AdminDTO)`

### AdminController
- `GET /control/admins` — list all, return `ControlResponse.success(List<AdminDTO>)`
- `POST /control/admins` — create, return `ControlResponse.success(null)`
- `PUT /control/admins/{username}` — update password, return `ControlResponse.success(null)`
- `DELETE /control/admins/{username}` — delete (reject "admin"), return success or error

---

## 7. Backend — Interceptor Registration

**File**: `backend_java/bootstrap/src/main/java/.../config/WebMvcConfig.java`

Register `JwtAuthInterceptor`:
- **Intercept**: `/control/**`, `/debug/**`, `/auth/me`
- **Exclude**: `/auth/login`, `/health/**`, `/agents/**`, `/a2a/**`, `/file/**`, `/ws/**`

---

## 8. Frontend — Auth Utilities

### New Files

| File | Content |
|------|---------|
| `src/utils/auth.ts` | `getToken()`, `setToken(token)`, `clearToken()`, `getUsername()`, `setUsername()`, `isAuthenticated()` — all localStorage based |
| `src/services/auth.ts` | `login(data)` → POST `/auth/login`; `getMe()` → GET `/auth/me` |
| `src/services/admin.ts` | `listAdmins()`, `createAdmin(data)`, `updateAdmin(username, data)`, `deleteAdmin(username)` |
| `src/types/admin.interface.ts` | `AdminDTO`, `LoginRequest`, `LoginResponse`, `CreateAdminRequest`, `UpdateAdminRequest` |

---

## 9. Frontend — Request Interceptor Update

**File**: `frontend/packages/control/src/services/request.ts`

1. Uncomment token injection in request interceptor:
```typescript
const token = getToken();
if (token && config.headers) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

2. Add 401 handling in response error handler:
```typescript
case 401:
  message.error("未授权，请重新登录");
  clearToken();
  window.location.hash = '#/login';
  break;
```

---

## 10. Frontend — Login Page

### New Files
| File | Content |
|------|---------|
| `src/pages/Login/index.tsx` | Centered login card, Ant Design Form (username + password), submit calls auth service, on success store token and navigate to `/agents` |
| `src/pages/Login/index.module.less` | Full-height centered layout with light background |

---

## 11. Frontend — Router & Auth Guard

**File**: `frontend/packages/control/src/router/index.tsx`

1. Add `/login` route at top level (outside AppLayout)
2. Wrap AppLayout in an auth guard component that checks `isAuthenticated()` — redirect to `/login` if not
3. Add `/admins` route inside AppLayout children

```tsx
// AuthGuard: inline component
const AuthGuard = () => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Outlet />;
};

createHashRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <AuthGuard />, children: [
    { path: '/', element: <AppLayout />, children: [...existing, { path: '/admins', element: <AdminsPage /> }] }
  ]}
]);
```

---

## 12. Frontend — Admin Management Page

### New Files
| File | Content |
|------|---------|
| `src/pages/Admins/index.tsx` | Ant Design Table with columns: Username, Created Time, Actions (edit password / delete). Create modal + Edit password modal. Delete disabled for "admin" username |
| `src/pages/Admins/index.module.less` | Page styles |

---

## 13. Frontend — Layout Update

**File**: `frontend/packages/control/src/components/Layout/index.tsx`

1. Add menu item `{ key: '/admins', icon: <UserOutlined />, label: '管理员' }` after "长期记忆"
2. Add logout area in Header (right side): display current username + "退出" button
3. Import `UserOutlined`, `LogoutOutlined` from `@ant-design/icons`

---

## 14. Implementation Order

### Phase 1: API Contract (Sequential)
1. Update `backend_java_api.yaml` — add auth/admin endpoints, schemas, and security scheme

### Phase 2: Parallel Implementation (Backend + Frontend + Tests)

**Backend** (sequential within):
1. `init.sql` — add `admin_users` table DDL
2. `api/pom.xml` — add jjwt dependencies
3. Infra: `AdminUserDO.java` + `AdminUserMapper.java`
4. Core: `AdminRepository.java` + `MysqlAdminRepository.java` + `AdminService.java`
5. API: `JwtUtils.java` + `JwtAuthInterceptor.java`
6. API: Request/DTO classes + `AuthController.java` + `AdminController.java`
7. Bootstrap: Update `WebMvcConfig.java` to register interceptor

**Frontend** (sequential within):
1. `utils/auth.ts` + `types/admin.interface.ts` + `services/auth.ts` + `services/admin.ts`
2. `pages/Login/` (page + styles)
3. Update `router/index.tsx` (add AuthGuard + login route + admins route)
4. Update `services/request.ts` (token injection + 401 redirect)
5. `pages/Admins/` (page + styles)
6. Update `Layout/index.tsx` (menu item + logout button)

**Backend Tests** (sequential within):
1. Add `AdminAuthApiTest.java` — login, CRUD, 401 unauthorized tests
2. Update `BaseApiTest` helper to support authenticated requests

### Phase 3: Verification (Sequential)
1. **Backend compile**: `cd backend_java && mvn compile -q`
2. **Backend tests**: `cd backend_java && mvn clean test -pl bootstrap -am`
3. **Frontend lint**: `cd frontend && yarn workspace control lint`
4. **Frontend build**: `cd frontend && yarn build`

---

## 15. Backend Test Plan (`AdminAuthApiTest.java`)

**File**: `backend_java/bootstrap/src/test/java/com/aliyun/tam/x/tron/api/AdminAuthApiTest.java`

Test cases:
1. `POST /auth/login` with valid `admin/admin@123` → 200, returns `{token, username}`
2. `POST /auth/login` with wrong password → 400/401 error
3. `POST /auth/login` with nonexistent user → 400/401 error
4. `GET /control/admins` without token → 401
5. `GET /control/admins` with valid token → 200, returns admin list
6. `POST /control/admins` create new admin → 200
7. `PUT /control/admins/{username}` update password → 200
8. Login with new admin after password change → 200
9. `DELETE /control/admins/admin` → error (protected)
10. `DELETE /control/admins/{other}` → 200 success
11. `GET /auth/me` with valid token → 200, returns admin info
