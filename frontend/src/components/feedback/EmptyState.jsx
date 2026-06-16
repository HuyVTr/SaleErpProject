import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

/**
 * Reusable Empty State component for lists and tables when no data is available.
 */
export const EmptyState = ({ 
  message = "Không có dữ liệu hiển thị", 
  actionLabel, 
  onActionClick 
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
        backgroundColor: 'rgba(241, 245, 249, 0.5)',
        border: '2px dashed #e2e8f0',
        borderRadius: '1.5rem',
      }}
    >
      <Box 
        sx={{
          width: 56,
          height: 56,
          borderRadius: '1rem',
          backgroundColor: '#white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          mb: 2,
          color: '#94a3b8'
        }}
      >
        <InboxIcon sx={{ fontSize: 28 }} />
      </Box>
      <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ mb: actionLabel ? 2 : 0 }}>
        {message}
      </Typography>
      {actionLabel && onActionClick && (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={onActionClick}
          sx={{
            textTransform: 'uppercase',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            borderRadius: '0.75rem',
            borderColor: '#00288E',
            color: '#00288E',
            '&:hover': {
              borderColor: '#001D6E',
              backgroundColor: 'rgba(0, 40, 142, 0.04)'
            }
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
