import React, { Component } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';

/**
 * Reusable Error Boundary to catch render-time errors and prevent the whole app from crashing.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80vh',
              textAlign: 'center',
            }}
          >
            <ReportIcon sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
            <Typography variant="h4" fontWeight="black" gutterBottom>
              Đã Xảy Ra Sự Cố Hệ Thống
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 450 }}>
              Giao diện của tính năng này gặp lỗi bất ngờ. Chúng tôi đã ghi nhận sự cố. Vui lòng bấm làm mới lại trang hoặc liên hệ quản trị viên.
            </Typography>
            <Button 
              variant="contained" 
              size="large" 
              onClick={this.handleReload} 
              sx={{ 
                px: 4,
                borderRadius: '0.75rem',
                backgroundColor: '#00288E',
                '&:hover': {
                  backgroundColor: '#001D6E'
                }
              }}
            >
              Làm mới Trang
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
