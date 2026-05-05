# Authentication & Security Documentation

## Overview

The Expense Tracker backend implements a comprehensive authentication and authorization system using:
- **JWT (JSON Web Tokens)** for stateless authentication
- **bcrypt** for secure password hashing
- **Session Management** for tracking active user sessions
- **Role-Based Access Control (RBAC)** for authorization
- **Rate Limiting** to prevent brute force attacks

---

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Authentication Flow                      │
└─────────────────────────────────────────────────────────────────┘

1. Registration
   User → POST /api/auth/register
          → Validate email & password strength
          → Hash password with bcrypt
          → Create user in database
          → Generate JWT tokens
          → Create session record
          ← Return access + refresh tokens

2. Login
   User → POST /api/auth/login
          → Find user by email
          → Verify password (bcrypt compare)
          → Generate JWT tokens
          → Create session record
          → Update lastLoginAt
          ← Return access + refresh tokens

3. Protected API Calls
   User → GET /api/expenses (with Authorization header)
          → Middleware verifies access token
          → Extract userId from JWT
          → Attach user to request
          → Check resource ownership
          ← Return data if authorized

4. Token Refresh
   User → POST /api/auth/refresh (with refresh token)
          → Verify refresh token
          → Check session is active
          → Generate new access token
          → Update session
          ← Return new access token

5. Logout
   User → POST /api/auth/logout (with access token)
          → Invalidate session
          → Update lastLogoutAt
          ← Logout success message
```

---

## API Endpoints

### Registration

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*...)

**Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing fields, weak password, passwords don't match
- `409 Conflict` - Email already registered

---

### Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid email or password
- `429 Too Many Requests` - Too many failed login attempts

**Rate Limiting:** 5 attempts per email/IP in 15-minute window

---

### Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**After Logout:**
- Access token becomes invalid
- Session marked as inactive
- Cannot use same token for API calls

---

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200 OK):**
```json
{
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token
- `401 Unauthorized` - Session is no longer active

**Usage:** Call this before access token expires to get a new one

---

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**
```json
{
  "id": "clx1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "emailVerified": true,
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - No token or invalid token
- `404 Not Found` - User not found

---

### Change Password

**Endpoint:** `POST /api/auth/change-password`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "SecurePassword123!",
  "newPassword": "NewPassword456@",
  "confirmPassword": "NewPassword456@"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Current password is incorrect
- `400 Bad Request` - New password doesn't meet requirements
- `401 Unauthorized` - Not authenticated

---

### Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "message": "If email exists, password reset link has been sent",
  "resetToken": "abc123..." // Only in development
}
```

**Notes:**
- Always returns success for security (doesn't reveal if email exists)
- Email with reset link would be sent (when email service configured)
- Token expires in 1 hour
- In development, token is returned in response for testing

---

### Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "abc123...",
  "password": "NewPassword456@",
  "confirmPassword": "NewPassword456@"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Password reset successfully",
  "note": "Please login with your new password"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
- `400 Bad Request` - New password doesn't meet requirements

**After Reset:**
- All active sessions are invalidated
- User must login again with new password

---

## JWT Token Structure

### Access Token

**Payload:**
```json
{
  "userId": "clx1234567890",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1705320600,
  "exp": 1705407000
}
```

**Details:**
- Expires in 24 hours
- Used for API authentication
- Include in `Authorization: Bearer <token>` header

### Refresh Token

**Payload:**
```json
{
  "userId": "clx1234567890",
  "sessionId": "session-id-12345",
  "iat": 1705320600,
  "exp": 1705925400
}
```

**Details:**
- Expires in 7 days
- Used only to obtain new access tokens
- More valuable - keep secure!
- Session can be invalidated (logout) to revoke refresh token

---

## Security Features

### Password Security

1. **Bcrypt Hashing**
   - 12 salt rounds (highly resistant to brute force)
   - Passwords never stored in plain text
   - Each hash is unique even for same password

2. **Password Requirements**
   ```
   ✓ Minimum 8 characters
   ✓ At least 1 uppercase letter
   ✓ At least 1 lowercase letter
   ✓ At least 1 number
   ✓ At least 1 special character
   ```

3. **Password Reset**
   - Tokens are hashed before storage
   - One-time use only
   - 1-hour expiration

### Token Security

1. **JWT Signing**
   - HS256 algorithm (HMAC SHA-256)
   - Secret key from environment (change in production!)
   - Algorithm verified during decoding

2. **Access Token**
   - Short-lived (24 hours)
   - Stateless (decoded on each request)
   - Include in Authorization header

3. **Refresh Token**
   - Long-lived (7 days)
   - Tied to session record
   - Can be revoked by invalidating session

### Rate Limiting

1. **Login Attempts**
   - Maximum 5 failed attempts per email/IP
   - 15-minute lockout after exceeding limit
   - Prevents brute force attacks

2. **Registration Attempts**
   - Same rate limiting as login
   - Prevents spam registrations

### Session Management

1. **Session Records**
   - Created on login
   - Tracks user, token, expiration, IP, user agent
   - Can be invalidated (logout)

2. **Session Tracking**
   - `lastLoginAt` - When user last logged in
   - `lastLogoutAt` - When user last logged out
   - `ipAddress` - IP of session creator
   - `userAgent` - Browser/client info

### Authorization (RBAC)

1. **Role Types**
   - `USER` - Regular user (default)
   - `ADMIN` - Administrator

2. **Resource Ownership**
   - Users can only access their own data
   - Admins can access any user's data
   - Middleware enforces this check

3. **Protected Endpoints**
   - All `/api/users/*` endpoints require authentication
   - All `/api/categories/*` endpoints require authentication
   - All `/api/expenses/*` endpoints require authentication
   - Auth endpoints (`/api/auth/*`) are public except me, change-password

---

## Usage Examples

### cURL Examples

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Use Access Token:**
```bash
curl -X GET http://localhost:5000/api/expenses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Refresh Token:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### JavaScript/Fetch Examples

**Register:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!'
  })
});
const data = await response.json();
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
```

**Login:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});
const data = await response.json();
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
```

**Protected API Call:**
```javascript
const accessToken = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:5000/api/expenses', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const expenses = await response.json();
```

**Refresh Token on Expiration:**
```javascript
const refreshToken = localStorage.getItem('refreshToken');
const response = await fetch('http://localhost:5000/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
const data = await response.json();
localStorage.setItem('accessToken', data.tokens.accessToken);
```

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
SESSION_EXPIRES_IN="24h"

# Email Configuration (for future use)
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT="587"
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"
# EMAIL_FROM="noreply@expensetracker.com"
```

**Important:** Change JWT secrets in production!

---

## Testing

### Test Credentials (After Seeding)

```
User 1:
  Email: john.doe@example.com
  Password: SecurePassword123!
  Role: USER

User 2:
  Email: jane.smith@example.com
  Password: AnotherPassword456@
  Role: USER

Admin:
  Email: admin@example.com
  Password: AdminPassword789#
  Role: ADMIN
```

### Manual Testing Checklist

- [ ] Register new user
- [ ] Login with correct password
- [ ] Login fails with wrong password
- [ ] Login fails after 5 attempts (rate limit)
- [ ] Access protected endpoint with valid token
- [ ] Access protected endpoint fails without token
- [ ] Access protected endpoint fails with invalid token
- [ ] Refresh token generates new access token
- [ ] Logout invalidates token
- [ ] Change password works
- [ ] Forgot password sends reset email (development: shows token)
- [ ] Reset password with valid token
- [ ] Reset password with expired token fails
- [ ] User can only access own data
- [ ] Admin can access any user's data

---

## Database Schema

### User Table
```sql
CREATE TABLE User (
  id             String PRIMARY KEY
  email          String UNIQUE NOT NULL
  name           String NOT NULL
  passwordHash   String NOT NULL
  role           String DEFAULT 'USER'
  emailVerified  Boolean DEFAULT false
  
  -- Reset token
  resetTokenHash String
  resetTokenExpires DateTime
  
  -- Session tracking
  lastLoginAt    DateTime
  lastLogoutAt   DateTime
  
  createdAt      DateTime DEFAULT now()
  updatedAt      DateTime
)
```

### Session Table
```sql
CREATE TABLE Session (
  id        String PRIMARY KEY
  userId    String FOREIGN KEY
  token     String UNIQUE NOT NULL
  expiresAt DateTime NOT NULL
  
  ipAddress String
  userAgent String
  isActive  Boolean DEFAULT true
  
  createdAt DateTime DEFAULT now()
  updatedAt DateTime
)
```

---

## Security Best Practices

### For Frontend Developers

1. **Token Storage**
   - Store tokens in secure, httpOnly cookies (if possible)
   - Or localStorage if httpOnly cookies not available
   - Never store in URL or local storage if sensitive

2. **Token Usage**
   - Always send in Authorization header
   - Format: `Authorization: Bearer <token>`
   - Don't send in query parameters

3. **Token Expiration**
   - Check token expiration before API calls
   - Refresh token before expiration
   - Handle 401 responses gracefully

4. **Password Handling**
   - Never log or display passwords
   - Use HTTPS in production
   - Clear password fields after use

5. **Logout**
   - Call logout endpoint
   - Clear stored tokens
   - Redirect to login page

### For Backend Developers

1. **JWT Secret**
   - Generate strong random secret
   - Use environment variable
   - Never commit to version control
   - Rotate periodically

2. **Session Management**
   - Validate session is active
   - Clean up expired sessions periodically
   - Log suspicious activity

3. **Rate Limiting**
   - Monitor failed attempts
   - Adjust thresholds based on usage
   - Log rate limit violations

4. **Error Messages**
   - Don't reveal if email exists
   - Use generic messages for auth failures
   - Log detailed errors server-side

---

## Troubleshooting

### "Invalid or expired token"
- Access token has expired
- Solution: Use refresh token to get new access token

### "Insufficient permissions"
- User role doesn't have permission
- Solution: Check user role and endpoint requirements

### "Too many login attempts"
- Exceeded rate limit
- Solution: Wait 15 minutes or reset attempt counter

### "Cannot access other user's data"
- Trying to access another user's data without admin role
- Solution: Only access own data or use admin account

### "Session is no longer active"
- Session was invalidated (logout)
- Solution: Login again to create new session

---

## Future Enhancements

- [ ] Email verification on registration
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management dashboard
- [ ] Device tracking and management
- [ ] Password breach detection
- [ ] Account recovery options
- [ ] Audit logging for security events

---

Last Updated: 2024-01-15
Authentication Module Version: 1.0.0
