/**
 * Browser-compatible fs shim for xlsx libraries
 * This prevents "fs" module from being accessed in browser code
 */

export const writeFileSync = () => {
  throw new Error('fs.writeFileSync is not available in browser. Use XLSX.writeFile() instead.');
};

export const readFileSync = () => {
  throw new Error('fs.readFileSync is not available in browser.');
};

export const existsSync = () => false;

export default {
  writeFileSync,
  readFileSync,
  existsSync,
};
