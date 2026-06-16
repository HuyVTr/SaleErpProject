import React from 'react';
import { Box, Skeleton } from '@mui/material';

/**
 * Reusable Loading Skeleton for data tables.
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <Box sx={{ width: '100%', py: 2 }}>
      {/* Header Skeleton */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton 
            key={`h-${i}`} 
            variant="rectangular" 
            height={24} 
            sx={{ flex: 1, borderRadius: '0.5rem' }} 
          />
        ))}
      </Box>
      {/* Row Skeletons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <Box key={`r-${r}`} sx={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton 
                key={`c-${r}-${c}`} 
                variant="text" 
                height={20} 
                sx={{ flex: 1, borderRadius: '0.25rem' }} 
              />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TableSkeleton;
