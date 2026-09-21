import { toast } from 'sonner';

/**
 * Helper to display floating toast notifications without shifting the layout.
 * Supports both string messages and { type, text } objects for seamless integration.
 *
 * @param {string | { type?: 'success' | 'error' | 'warning' | 'info', text: string }} message
 * @param {object} [options]
 */
export const showToast = (message, options = {}) => {
  if (!message) return;

  if (typeof message === 'string') {
    return toast(message, options);
  }

  const { type = 'info', text } = message;
  if (!text) return;

  switch (type) {
    case 'success':
      return toast.success(text, options);
    case 'error':
      return toast.error(text, options);
    case 'warning':
      return typeof toast.warning === 'function'
        ? toast.warning(text, options)
        : toast(text, { ...options, icon: '⚠️' });
    case 'info':
    default:
      return typeof toast.info === 'function'
        ? toast.info(text, options)
        : toast(text, options);
  }
};

export { toast };
export default showToast;
