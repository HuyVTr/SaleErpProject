import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Warning as WarningIcon } from '@mui/icons-material';
import tokenStorage from '../../utils/tokenStorage';
import ROLE from '../../constants/roles';

export function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    const currentUser = tokenStorage.getUser();
    const roleID = currentUser ? Number(currentUser.roleID) : null;

    if (roleID === ROLE.SALES) navigate('/sales/dashboard');
    else if (roleID === ROLE.WAREHOUSE) navigate('/warehouse/dashboard');
    else if (roleID === ROLE.ACCOUNTING) navigate('/accounting/dashboard');
    else if (roleID === ROLE.ADMIN || roleID === ROLE.SUPER_ADMIN) navigate('/admin/dashboard');
    else navigate('/login');
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <WarningIcon sx={{ fontSize: 100, color: 'warning.main', mb: 4 }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          404 - Không Tìm Thấy Trang
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển sang một liên kết khác trong hệ thống HolaGroup ERP.
        </Typography>
        <Button variant="contained" size="large" onClick={handleGoHome} sx={{ px: 4 }}>
          Quay lại Trang chủ
        </Button>
      </Box>
    </Container>
  );
}

export default NotFound;
