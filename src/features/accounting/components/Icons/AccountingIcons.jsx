import React from 'react';

// Wrapper chung để quản lý style của icon nếu cần
const IconBase = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
    {name}
  </span>
);

export const RevenueIcon = (props) => <IconBase name="payments" {...props} />;
export const DebtIcon = (props) => <IconBase name="balance" {...props} />;
export const InvoiceIcon = (props) => <IconBase name="description" {...props} />;
export const WalletIcon = (props) => <IconBase name="wallet" {...props} />;
export const PDFIcon = (props) => <IconBase name="picture_as_pdf" {...props} />;
export const NotificationIcon = (props) => <IconBase name="notifications" {...props} />;
export const SuccessIcon = (props) => <IconBase name="check_circle" {...props} />;
export const WarningIcon = (props) => <IconBase name="error" {...props} />;
export const CustomerIcon = (props) => <IconBase name="groups" {...props} />;
export const ChartIcon = (props) => <IconBase name="analytics" {...props} />;
export const DownloadIcon = (props) => <IconBase name="download" {...props} />;
export const DashboardIcon = (props) => <IconBase name="dashboard" {...props} />;
export const ReceiptIcon = (props) => <IconBase name="receipt_long" {...props} />;
export const SettingsIcon = (props) => <IconBase name="settings" {...props} />;
export const LogoutIcon = (props) => <IconBase name="logout" {...props} />;
