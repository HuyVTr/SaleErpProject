/* eslint-disable react-refresh/only-export-components -- file tiện ích: cố tình gom hàm format + component hiển thị VND dùng chung; chỉ ảnh hưởng HMR lúc dev */
/**
 * Helper to format numeric values to Vietnamese Dong (VND) currency string.
 * Standardizes VND formatting across all modules.
 *
 * @param {number|string} value - The numeric value to format
 * @param {boolean} [showSymbol=true] - Whether to append the 'VND' symbol
 * @returns {string} Formatted currency string
 */
export const formatVND = (value, showSymbol = true) => {
  if (value === undefined || value === null || value === '') return showSymbol ? '0 VND' : '0';

  // Parse input to number
  let num = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[đ₫\sVND.]/g, '').replace(/,/g, '.'));

  if (isNaN(num)) return showSymbol ? '0 VND' : '0';

  const formatted = new Intl.NumberFormat('vi-VN').format(num);
  return showSymbol ? `${formatted} VND` : formatted;
};

// Tailwind class constants for currency display styling
// Note: Numbers should always use text-slate-800 font-bold (dark, bold)
// Only the VND unit should use text-gray-500 font-normal (gray)
export const CURRENCY_CLASS_PRIMARY = 'text-slate-800 font-bold'; // For stats/tooltips (dark, bold numbers)
export const CURRENCY_CLASS_SECONDARY = 'text-gray-500 font-normal'; // For VND unit display (gray)
export const CURRENCY_NUMBER_CLASS = 'text-slate-800 font-bold'; // Explicitly for number part

import React from 'react';

/**
 * Standardized VND display component
 */
export const VNDDisplay = ({ value, isStat = false, customColorClass = "", textSizeClass = "" }) => {
  const formatted = formatVND(value, false);
  if (isStat) {
    return (
      <span className={`flex items-baseline gap-1.5 whitespace-nowrap ${customColorClass}`}>
        <span className={`font-black text-inherit ${textSizeClass}`}>{formatted}</span>
        <span className="font-black text-inherit uppercase tracking-tight">VND</span>
      </span>
    );
  }
  const valueColor = customColorClass || "text-slate-800";
  const unitColor = customColorClass ? "text-inherit opacity-70" : "text-slate-400";
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${customColorClass}`}>
      <span className={`font-black ${valueColor} ${textSizeClass}`}>{formatted}</span>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${unitColor}`}>VND</span>
    </span>
  );
};

export default formatVND;
