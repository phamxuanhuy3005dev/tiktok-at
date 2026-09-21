import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { showToast, toast } from '../utils/toast';

/**
 * Modern floating Toast Container using Sonner.
 * Placed at the root layout so notifications never shift the DOM page flow.
 */
export const ToastContainer = ({ theme = 'dark' }) => (
  <Toaster
    position="top-right"
    richColors
    theme={theme === 'light' ? 'light' : 'dark'}
    closeButton
    duration={3500}
    toastOptions={{
      style: {
        borderRadius: '12px',
        backdropFilter: 'blur(12px)',
        fontSize: '0.875rem',
      }
    }}
  />
);

/**
 * Backwards-compatible Toast component.
 * If passed a `message` prop, it delegates to Sonner floating toast
 * and renders null so it never causes layout shifts.
 */
const Toast = ({ message }) => {
  useEffect(() => {
    if (message) {
      showToast(message);
    }
  }, [message]);

  return null;
};

export { showToast, toast };
export default Toast;
