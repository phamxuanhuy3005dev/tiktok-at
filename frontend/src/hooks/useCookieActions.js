import axios from 'axios';
import { useCallback, useState } from 'react';

export const useCookieActions = ({
  fetchData,
  setMessage,
  selectedForRun,
} = {}) => {
  const [cookieModalProfileId, setCookieModalProfileId] = useState(null);

  const openCookieModal = useCallback((profileId) => {
    setCookieModalProfileId(profileId);
  }, []);

  const closeCookieModal = useCallback(() => {
    setCookieModalProfileId(null);
  }, []);

  const handleSaveProfileCookies = useCallback(
    async (profileId, cookiesString) => {
      const res = await axios.post(`/api/profiles/${profileId}/cookie`, {
        cookies: cookiesString,
      });
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      return res.data;
    },
    [fetchData],
  );

  const handleCaptureCookiesFromBrowser = useCallback(
    async (profileId) => {
      const res = await axios.post(
        `/api/profiles/${profileId}/save-session-cookies`,
      );
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      return res.data;
    },
    [fetchData],
  );

  const handleLogoutProfile = useCallback(
    async (profileId) => {
      const res = await axios.post(`/api/profiles/${profileId}/logout`);
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      if (typeof setMessage === 'function') {
        setMessage({
          type: 'success',
          text: 'Đã đăng xuất và xóa phiên tài khoản.',
        });
      }
      return res.data;
    },
    [fetchData, setMessage],
  );

  const handleExportCookiesJson = useCallback(async () => {
    try {
      const idsParam =
        selectedForRun && selectedForRun.size > 0
          ? `?ids=${Array.from(selectedForRun).join(',')}`
          : '';
      const res = await axios.get(
        `/api/profiles/export-cookies-json${idsParam}`,
      );
      const data = res.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `tiktok_cookies_export_${data.length}profiles_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof setMessage === 'function') {
        setMessage({
          type: 'success',
          text: `Đã xuất cookie của ${data.length} profile thành công!`,
        });
      }
    } catch (err) {
      if (typeof setMessage === 'function') {
        setMessage({
          type: 'error',
          text: err.response?.data?.error || 'Lỗi khi xuất cookies',
        });
      }
    }
  }, [selectedForRun, setMessage]);

  const handleImportCookiesJson = useCallback(
    async (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result);
          const res = await axios.post(
            '/api/profiles/import-cookies-json',
            json,
          );
          if (typeof fetchData === 'function') {
            await fetchData();
          }
          if (typeof setMessage === 'function') {
            setMessage({
              type: 'success',
              text: `Nhập cookie thành công! Cập nhật: ${res.data.updated}, Tạo mới: ${res.data.created}`,
            });
          }
        } catch (err) {
          if (typeof setMessage === 'function') {
            setMessage({
              type: 'error',
              text: err.response?.data?.error || 'Lỗi khi đọc file JSON cookie',
            });
          }
        }
      };
      reader.readAsText(file);
    },
    [fetchData, setMessage],
  );

  return {
    cookieModalProfileId,
    setCookieModalProfileId,
    openCookieModal,
    closeCookieModal,
    handleSaveProfileCookies,
    handleCaptureCookiesFromBrowser,
    handleLogoutProfile,
    handleExportCookiesJson,
    handleImportCookiesJson,
  };
};

export default useCookieActions;
