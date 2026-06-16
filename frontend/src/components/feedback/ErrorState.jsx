import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Reusable Error State component when API calls fail or components throw errors.
 */
export const ErrorState = ({ 
  message = "Đã xảy ra lỗi khi tải dữ liệu", 
  onRetry 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(254, 242, 242, 0.4)',
        border: '1.5px solid #fee2e2',
        borderRadius: '1.5rem',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
      <Typography variant="body2" fontWeight="bold" color="error.main" sx={{ mb: onRetry ? 2 : 0 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button 
          variant="contained" 
          color="error"
          size="small" 
          onClick={onRetry}
          sx={{
            textTransform: 'uppercase',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            borderRadius: '0.75rem',
            px: 3,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}
        >
          Thử lại
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
