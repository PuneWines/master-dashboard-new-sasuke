/**
 * Centralized configuration for all Google Apps Script URLs
 * Accessible throughout the application.
 */

const getScriptURL = (id) => import.meta.env.DEV ? `/macros/s/${id}/exec` : `https://script.google.com/macros/s/${id}/exec`;

export const SCRIPT_URLS = {
  MASTER_LOGIN: getScriptURL(import.meta.env.VITE_MASTER_LOGIN_ID),
  HR_JOINING: getScriptURL(import.meta.env.VITE_HR_JOINING_LEAVING_ID),
  HR_MIS: getScriptURL(import.meta.env.VITE_HR_MIS_REPORT_ID),
  HR_PAYROLL: getScriptURL(import.meta.env.VITE_HR_PAYROLL_ATTENDANCE_ID),
  PURCHASE: getScriptURL(import.meta.env.VITE_PURCHASE_MANAGEMENT_ID),
  HR_ATTENDANCE_SYNC: getScriptURL(import.meta.env.VITE_HR_ATTENDANCE_SYNC_ID),
};

// Device Logs API URL - uses proxy in dev, direct URL in production
export const DEVICE_LOGS_BASE_URL = import.meta.env.DEV 
  ? '/api/device-logs' 
  : `${import.meta.env.VITE_DEVICE_LOGS_API_URL}/api/v2/WebAPI/GetDeviceLogs`;

// Also export raw IDs if needed for proxies or specific logic
export const SCRIPT_IDS = {
  MASTER_LOGIN: import.meta.env.VITE_MASTER_LOGIN_ID,
  HR_JOINING: import.meta.env.VITE_HR_JOINING_LEAVING_ID,
  HR_MIS: import.meta.env.VITE_HR_MIS_REPORT_ID,
  HR_PAYROLL: import.meta.env.VITE_HR_PAYROLL_ATTENDANCE_ID,
  PURCHASE: import.meta.env.VITE_PURCHASE_MANAGEMENT_ID,
  HR_ATTENDANCE_SYNC: import.meta.env.VITE_HR_ATTENDANCE_SYNC_ID,
};
