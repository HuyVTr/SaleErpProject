# Notification System - API Specifications for Backend

## Overview
Frontend has full notification UI implementation ready. Backend needs to implement these endpoints to integrate the system.

## Database Schema

### Notifications Table
```javascript
{
  id: Number,                    // Auto-increment
  type: String,                  // 'order', 'warehouse', 'payment', 'system'
  title: String,                 // Notification title
  message: String,               // Detailed message
  link: String | null,           // Navigation link (e.g., '/sales/orders/103')
  createdAt: ISO8601Timestamp,   // Creation timestamp
  isRead: Boolean,               // Read status per user (store in user_notifications junction table)
  roleIds: Array<Number> | null  // Target role IDs [1=Accounting, 2=Sales, 3=Admin, 4=Warehouse, 5=SuperAdmin]
                                 // null = visible to all roles (system notifications)
}
```

### User Notifications Junction Table (for tracking read status)
```javascript
{
  id: Number,
  userId: Number,
  notificationId: Number,
  isRead: Boolean,
  readAt: ISO8601Timestamp | null,
  createdAt: ISO8601Timestamp
}
```

### Role IDs Reference
- `1`: Kế toán (Accounting)
- `2`: Nhân viên bán hàng (Sales)
- `3`: Quản trị viên (Admin)
- `4`: Nhân viên kho (Warehouse)
- `5`: Super Admin

## API Endpoints

### 1. GET /api/notifications
**Description:** Retrieve all notifications for the current user (filtered by role)

**Query Parameters:**
- `limit` (optional, default: 50) - Number of notifications to return
- `offset` (optional, default: 0) - Pagination offset
- `type` (optional) - Filter by type: 'order', 'warehouse', 'payment', 'system'

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```javascript
[
  {
    "id": 1,
    "type": "order",
    "title": "Đơn hàng #103 đã được duyệt",
    "message": "Đơn hàng của Công ty CP Kiến Trúc Việt có giá trị 450 triệu đã được phê duyệt.",
    "link": "/sales/orders/103",
    "createdAt": "2026-06-11T14:30:00Z",
    "isRead": false,
    "roleIds": [2, 3, 5]
  }
]
```

**Logic:**
- Extract `userId` and `roleId` from JWT
- Filter notifications where `roleIds` is null OR contains the user's `roleId`
- Include user's personal `isRead` status from user_notifications table
- Sort by `createdAt` DESC (newest first)

---

### 2. GET /api/notifications/unread-count
**Description:** Get count of unread notifications for current user

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```javascript
{
  "count": 3,
  "unreadNotifications": [
    { "id": 1, "type": "order", ... },
    { "id": 2, "type": "warehouse", ... },
    { "id": 6, "type": "warehouse", ... }
  ]
}
```

**Logic:**
- Filter notifications by user's role (same as GET /api/notifications)
- Count where `isRead = false` in user_notifications table
- Return total unread count

---

### 3. PATCH /api/notifications/:id/read
**Description:** Mark a single notification as read for the current user

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```javascript
{
  // Empty body or can include metadata
}
```

**Response (200 OK):**
```javascript
{
  "success": true,
  "notification": {
    "id": 1,
    "isRead": true,
    "readAt": "2026-06-12T10:30:00Z"
  }
}
```

**Logic:**
- Extract `userId` from JWT
- Find or create row in user_notifications table
- Update `isRead = true` and `readAt = NOW()`
- Return updated notification with read status

**Error (404):**
```javascript
{
  "success": false,
  "message": "Notification not found or access denied"
}
```

---

### 4. PATCH /api/notifications/read-all
**Description:** Mark all notifications as read for the current user

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```javascript
{
  "success": true,
  "markedCount": 3,
  "message": "3 notifications marked as read"
}
```

**Logic:**
- Extract `userId` from JWT
- Update all rows in user_notifications where userId matches and isRead = false
- Set `isRead = true` and `readAt = NOW()`
- Return count of updated rows

---

### 5. PUT /api/notifications/settings
**Description:** Save notification preferences for the current user

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```javascript
{
  "orders": true,        // Receive order notifications
  "warehouse": true,     // Receive warehouse notifications
  "payments": true,      // Receive payment notifications
  "system": true         // Receive system notifications
}
```

**Response (200 OK):**
```javascript
{
  "success": true,
  "settings": {
    "orders": true,
    "warehouse": true,
    "payments": true,
    "system": true
  }
}
```

**Logic:**
- Extract `userId` from JWT
- Create or update notification_settings table row for user
- Store preferences as JSON or individual boolean columns
- Return saved settings

---

## Mock Data (Current Implementation)

Frontend uses `db.json` with these notifications for testing:

| ID | Type | Role IDs | Description |
|----|------|----------|-------------|
| 1 | order | [2,3,5] | Order approved - Sales, Admin, SuperAdmin |
| 2 | warehouse | [4,3,5] | Stock alert - Warehouse, Admin, SuperAdmin |
| 3 | payment | [1,3,5] | Payment due - Accounting, Admin, SuperAdmin |
| 4 | system | null | System maintenance - All roles |
| 5 | order | [2,3,5] | Order delivered - Sales, Admin, SuperAdmin |
| 6 | warehouse | [4,3,5] | Import request - Warehouse, Admin, SuperAdmin |
| 7 | payment | [1,3,5] | Payment received - Accounting, Admin, SuperAdmin |

## Frontend Configuration

### Mock Mode (Development)
When `VITE_USE_MOCK=true`:
- Reads from `db.json` notifications array
- Filters by user's current role automatically
- Stores read status in `localStorage.app_notifications`
- Uses `localStorage.notification_settings` for preferences

### API Mode (Production)
When `VITE_USE_MOCK=false`:
- Calls real API endpoints above
- Backend handles all filtering and authorization
- Full persistence with database

### How to Switch
```bash
# Development (with mock data)
VITE_USE_MOCK=true npm run dev

# Production (with real API)
VITE_API_BASE_URL=http://your-api.com VITE_USE_MOCK=false npm run build
```

## Integration Checklist for Backend

- [ ] Create `notifications` table with schema above
- [ ] Create `user_notifications` junction table
- [ ] Create `notification_settings` table
- [ ] Implement GET /api/notifications (with role filtering)
- [ ] Implement GET /api/notifications/unread-count
- [ ] Implement PATCH /api/notifications/:id/read
- [ ] Implement PATCH /api/notifications/read-all
- [ ] Implement PUT /api/notifications/settings
- [ ] Add JWT authentication middleware to verify user role
- [ ] Test with different user roles to verify filtering works
- [ ] Create admin endpoint to create/broadcast notifications to specific roles

## Example: Creating a Notification (Admin Only)

```javascript
// POST /api/notifications (admin endpoint)
{
  "type": "order",
  "title": "Đơn hàng #200 đã được tạo",
  "message": "Đơn hàng mới từ khách hàng...",
  "link": "/sales/orders/200",
  "roleIds": [2, 3, 5]  // Only Sales, Admin, SuperAdmin see this
}
```

## Notes

- All timestamps must be ISO 8601 format (UTC)
- User's `roleId` comes from JWT token
- `isRead` status is per-user, stored separately from notification
- System notifications (roleIds: null) are visible to all roles
- Frontend automatically retries failed requests
