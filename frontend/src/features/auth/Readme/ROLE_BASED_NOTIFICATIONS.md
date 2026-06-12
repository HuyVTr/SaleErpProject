# Role-Based Notifications Implementation

## Overview
Notification system supports **multi-role filtering**. Each notification can be targeted to specific roles or visible to all roles (system notifications).

## How It Works

### 1. Data Model

Each notification has a `roleIds` field:
```javascript
{
  id: 1,
  type: "order",
  title: "...",
  message: "...",
  link: "/sales/orders/103",
  createdAt: "2026-06-11T14:30:00Z",
  isRead: false,
  roleIds: [2, 3, 5]  // ← Only Sales (2), Admin (3), SuperAdmin (5) see this
}

{
  id: 4,
  type: "system",
  title: "System Maintenance",
  message: "...",
  link: null,
  createdAt: "2026-06-09T16:20:00Z",
  isRead: true,
  roleIds: null  // ← ALL roles see this (system notification)
}
```

### 2. Role IDs

| ID | Vietnamese | English | See Notifications For |
|----|------------|---------|----------------------|
| 1  | Kế toán | Accounting | Payment-related |
| 2  | Nhân viên bán hàng | Sales | Order-related |
| 3  | Quản trị viên | Admin | All operational |
| 4  | Nhân viên kho | Warehouse | Inventory-related |
| 5  | Super Admin | Super Admin | Everything |

### 3. Filtering Logic

**Frontend (notificationService.js):**
```javascript
const filterNotificationsByRole = (notifications, userRole) => {
  return notifications.filter(notif => {
    // If roleIds is null or empty → show to everyone
    if (!notif.roleIds || notif.roleIds.length === 0) return true;
    // Otherwise → show only if user's role is in the list
    return notif.roleIds.includes(userRole);
  });
};
```

**How it's used:**
1. Get current user from `authService.getMe()` → extract `roleID`
2. Filter notifications using `filterNotificationsByRole(notifications, roleID)`
3. Only show matching notifications in dropdown & modal

### 4. Mock Data Examples

**Current notifications in db.json:**

| Type | Roles | Example |
|------|-------|---------|
| order | [2,3,5] | "Order #103 approved" - Sales, Admin, SuperAdmin only |
| warehouse | [4,3,5] | "Stock alert: Product out of stock" - Warehouse, Admin, SuperAdmin |
| payment | [1,3,5] | "Invoice #1 due soon" - Accounting, Admin, SuperAdmin |
| system | null | "System maintenance at 22:00" - Visible to ALL roles |

## Example: Different Views by Role

### Sales User (roleID: 2)
Sees:
- ✅ Order notifications (roleIds includes 2)
- ❌ Warehouse alerts (roleIds is [4,3,5])
- ❌ Payment notices (roleIds is [1,3,5])
- ✅ System notifications (roleIds is null)

**Result:** Only Order + System notifications appear

### Warehouse User (roleID: 4)
Sees:
- ❌ Order notifications (roleIds is [2,3,5])
- ✅ Warehouse alerts (roleIds includes 4)
- ❌ Payment notices (roleIds is [1,3,5])
- ✅ System notifications (roleIds is null)

**Result:** Only Warehouse + System notifications appear

### Admin User (roleID: 3)
Sees:
- ✅ Order notifications (roleIds includes 3)
- ✅ Warehouse alerts (roleIds includes 3)
- ✅ Payment notices (roleIds includes 3)
- ✅ System notifications (roleIds is null)

**Result:** ALL notifications appear

## How Backend Implements This

### Option 1: Store roleIds in Notification Table
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role_ids JSON,  -- Stores [1, 2, 3] or null
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Option 2: Store in Separate Notification_Roles Table
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_roles (
  notification_id INT,
  role_id INT,
  PRIMARY KEY (notification_id, role_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- If roleIds is null (system notification), no entries in this table
-- The frontend code checks: if NO rows exist for a notification, show to all roles
```

### Backend Endpoint Logic

```javascript
// GET /api/notifications
async function getNotifications(req, res) {
  const userId = req.user.id;      // From JWT
  const userRole = req.user.roleId; // From JWT

  // Get all notifications
  const notifications = await db.query(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
  );

  // Filter by role
  const filtered = notifications.filter(notif => {
    // If no role restrictions → show to everyone
    if (!notif.role_ids || notif.role_ids.length === 0) return true;
    // Otherwise → show only if user's role is in the list
    return JSON.parse(notif.role_ids).includes(userRole);
  });

  // Add user-specific read status
  for (let notif of filtered) {
    const readStatus = await db.query(
      'SELECT is_read FROM user_notifications WHERE user_id = ? AND notification_id = ?',
      [userId, notif.id]
    );
    notif.isRead = readStatus[0]?.is_read || false;
  }

  res.json(filtered);
}
```

## Testing the Implementation

### Test Case 1: Sales User sees Order Notification
```bash
1. Login as user with roleID: 2 (Sales)
2. Open notification dropdown
3. Check: Should see "Đơn hàng #103 đã được duyệt" (roleIds: [2,3,5])
4. Check: Should NOT see "Cảnh báo tồn kho" (roleIds: [4,3,5])
5. Check: Should see "Thông báo hệ thống" (roleIds: null)
```

### Test Case 2: Warehouse User sees Warehouse Notification
```bash
1. Login as user with roleID: 4 (Warehouse)
2. Open notification dropdown
3. Check: Should NOT see "Đơn hàng #103 đã được duyệt" (roleIds: [2,3,5])
4. Check: Should see "Cảnh báo tồn kho" (roleIds: [4,3,5])
5. Check: Should see "Thông báo hệ thống" (roleIds: null)
```

### Test Case 3: Admin sees Everything
```bash
1. Login as user with roleID: 3 (Admin)
2. Open notification dropdown
3. Check: Should see ALL notifications including system
4. Count: Should see 7 notifications (all from db.json)
```

## Benefits of This Approach

✅ **Fine-grained control** - Each notification targets specific roles  
✅ **Scalable** - Easy to add new roles  
✅ **Backward compatible** - null roleIds = visible to all  
✅ **Frontend-ready** - No changes needed when Backend integrates  
✅ **Flexible** - Can target single role or multiple roles  
✅ **Audit trail** - Each user has independent read status  

## Migration Plan

1. **Phase 1 (Current):** Frontend ready with mock data
2. **Phase 2:** Backend implements endpoints (no changes to Frontend)
3. **Phase 3:** Switch `VITE_USE_MOCK=false` to use real API
4. **Phase 4:** Database stores all notifications with role filtering
