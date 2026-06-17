import XLSX from 'xlsx-js-style';

/**
 * Styling constants and cell styling helpers for xlsx-js-style.
 */

export const ExcelStyles = {
  colors: {
    primary: '002E8E',      // Hizo Blue
    secondary: 'FF9500',    // Hizo Orange
    dark: '0F172A',         // Dark text (Slate 900)
    light: 'F8FAFC',        // Light bg (Slate 50)
    border: 'CBD5E1',       // Border color (Slate 300)
    success: '10B981',      // Success green
    warning: 'FBBF24',      // Warning yellow
    danger: 'EF4444',       // Danger red
    white: 'FFFFFF',
    zebra: 'F1F5F9'         // Zebra row color (Slate 100)
  },

  fonts: {
    title: { name: 'Arial', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    subtitle: { name: 'Arial', sz: 10, italic: true, color: { rgb: 'E2E8F0' } },
    sectionHeader: { name: 'Arial', sz: 12, bold: true, color: { rgb: '002E8E' } },
    header: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    body: { name: 'Arial', sz: 10, color: { rgb: '0F172A' } },
    bodyBold: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } },
    footer: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }
  },

  alignment: {
    center: { horizontal: 'center', vertical: 'center' },
    left: { horizontal: 'left', vertical: 'center' },
    right: { horizontal: 'right', vertical: 'center' },
    wrapCenter: { horizontal: 'center', vertical: 'center', wrapText: true },
    wrapLeft: { horizontal: 'left', vertical: 'center', wrapText: true },
    wrapRight: { horizontal: 'right', vertical: 'center', wrapText: true }
  },

  borders: {
    thin: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    },
    header: {
      top: { style: 'thin', color: { rgb: '002E8E' } },
      bottom: { style: 'medium', color: { rgb: '002E8E' } },
      left: { style: 'thin', color: { rgb: '002E8E' } },
      right: { style: 'thin', color: { rgb: '002E8E' } }
    },
    total: {
      top: { style: 'thin', color: { rgb: '002E8E' } },
      bottom: { style: 'double', color: { rgb: '002E8E' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  }
};

/**
 * Utility to convert column index to Excel letter (e.g. 0 -> 'A', 27 -> 'AB')
 */
export const colIndexToLabel = (index) => {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

/**
 * Apply styles to a specific cell in worksheet.
 */
export const styleCell = (worksheet, cellRef, styleConfig) => {
  if (!worksheet[cellRef]) {
    worksheet[cellRef] = { v: '', t: 's' };
  }
  worksheet[cellRef].s = {
    ...worksheet[cellRef].s,
    ...styleConfig
  };
};

/**
 * Apply borders to a range of cells.
 */
export const applyBordersToRange = (worksheet, startCol, startRow, endCol, endRow, borderStyle = ExcelStyles.borders.thin) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = `${colIndexToLabel(c)}${r}`;
      styleCell(worksheet, cellRef, { border: borderStyle });
    }
  }
};

/**
 * Set custom widths or auto-calculate widths for worksheet columns.
 */
export const setColumnWidths = (worksheet, data, customWidths = {}) => {
  const cols = [];

  // Safely decode range with error handling
  const wsRef = worksheet['!ref'] || 'A1:A1';
  let range;

  try {
    range = XLSX.utils.decode_range(wsRef);
  } catch (error) {
    console.warn('Warning: Could not decode worksheet range:', error);
    range = { s: { r: 0, c: 0 }, e: { r: 100, c: 10 } }; // Fallback default
  }

  const maxCol = range.e.c;

  for (let c = 0; c <= maxCol; c++) {
    const colLetter = colIndexToLabel(c);
    if (customWidths[colLetter]) {
      cols.push({ wch: customWidths[colLetter] });
    } else {
      // Auto-width logic based on cell content length
      let maxLen = 10; // default minimum width
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cellRef = `${colLetter}${r}`;
        const cell = worksheet[cellRef];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const len = cell.v.toString().length;
          if (len > maxLen) {
            maxLen = len;
          }
        }
      }
      cols.push({ wch: Math.min(maxLen + 4, 40) }); // max width cap at 40
    }
  }

  worksheet['!cols'] = cols;
};

export default {
  ExcelStyles,
  colIndexToLabel,
  styleCell,
  applyBordersToRange,
  setColumnWidths
};
