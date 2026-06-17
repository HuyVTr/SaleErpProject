import tokenStorage from '../../../utils/tokenStorage';

export const getCurrentUser = () => {
  const user = tokenStorage.getUser();
  
  if (!user) {
    return {
      id: 'mock-id-123',
      fullName: 'Võ Trường Huy',
      email: 'votruonghuy25@gmail.com',
      phone: '(028) 1234-5678',
      department: 'Phòng Kế Toán',
      role: 'Kế toán trưởng'
    };
  }

  const getRoleName = (roleID) => {
    switch (Number(roleID)) {
      case 1: return 'Kế toán';
      case 2: return 'Nhân viên Sales';
      case 3: return 'Quản trị viên';
      case 4: return 'Nhân viên kho';
      case 5: return 'Super Admin';
      default: return 'Nhân viên';
    }
  };

  const lastName = user.lastName || '';
  const firstName = user.firstName || '';
  const fullName = `${lastName} ${firstName}`.trim() || 'Người dùng Hizo';

  return {
    id: user.id || user.userID || 'user-id',
    fullName: fullName,
    email: user.email || 'user@hizo.com.vn',
    phone: user.phone || 'N/A',
    department: user.department || 'Phòng Kế Toán',
    role: user.roleName || getRoleName(user.roleID)
  };
};

export default {
  getCurrentUser
};
