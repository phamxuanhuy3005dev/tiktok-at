import axios from 'axios';
import { useCallback, useState } from 'react';

export const useAutomationActions = ({
  profiles = [],
  selectedForRun = new Set(),
  setIsLoading,
  setMessage,
  fetchData,
} = {}) => {
  const [loggingInProfiles, setLoggingInProfiles] = useState(() => new Set());
  const [addingFavoriteMusicProfiles, setAddingFavoriteMusicProfiles] =
    useState(() => new Set());
  const [togglingBrowserProfiles, setTogglingBrowserProfiles] = useState(
    () => new Set(),
  );
  const [startingProfiles, setStartingProfiles] = useState(() => new Set());
  const [musicSearchTerms, setMusicSearchTerms] = useState({});

  const syncProfilesStatus = useCallback((newProfiles = []) => {
    setLoggingInProfiles((prev) => {
      const next = new Set(prev);
      newProfiles.forEach((p) => {
        if (p.status === 'logging_in') next.add(p.id);
        else next.delete(p.id);
      });
      return next;
    });

    setAddingFavoriteMusicProfiles((prev) => {
      const next = new Set(prev);
      newProfiles.forEach((p) => {
        if (p.status === 'adding_favorite_music') next.add(p.id);
        else next.delete(p.id);
      });
      return next;
    });
  }, []);

  const startAutomation = useCallback(
    async (profileId = null) => {
      if (typeof setIsLoading === 'function') setIsLoading(true);
      if (profileId) {
        setStartingProfiles((prev) => new Set([...prev, profileId]));
      }
      try {
        if (profileId) {
          const targetProfile = profiles.find((p) => p.id === profileId);
          const res = await axios.post('/api/start', { profileId });
          if (typeof setMessage === 'function') {
            setMessage({
              type: 'success',
              text: `Đã bắt đầu tự động upload cho ${targetProfile?.name || 'profile'}`,
            });
          }
        } else {
          const profileIds = [...selectedForRun];
          if (profileIds.length === 0) {
            if (typeof setMessage === 'function') {
              setMessage({
                type: 'error',
                text: 'Chọn ít nhất một profile (checkbox) để chạy hàng loạt.',
              });
            }
            if (typeof setIsLoading === 'function') setIsLoading(false);
            return;
          }
          await axios.post('/api/start', { profileIds });
          if (typeof setMessage === 'function') {
            setMessage({
              type: 'success',
              text: `Đã bật chạy tự động cho ${profileIds.length} profile đã chọn`,
            });
          }
        }
        if (typeof fetchData === 'function') await fetchData();
      } catch (err) {
        if (typeof setMessage === 'function') {
          const errText =
            err.response?.data?.error ||
            err.message ||
            'Không thể bắt đầu tự động hóa';
          setMessage({ type: 'error', text: errText });
        }
      } finally {
        if (profileId) {
          setStartingProfiles((prev) => {
            const next = new Set(prev);
            next.delete(profileId);
            return next;
          });
        }
        if (typeof setIsLoading === 'function') setIsLoading(false);
      }
    },
    [profiles, selectedForRun, setIsLoading, setMessage, fetchData],
  );

  const openProfile = useCallback(
    async (profileId) => {
      setTogglingBrowserProfiles((prev) => new Set([...prev, profileId]));
      try {
        const targetProfile = profiles.find((p) => p.id === profileId);
        const res = await axios.post('/api/open-profile', { profileId });
        if (typeof setMessage === 'function') {
          if (res.data?.status === 'already_open') {
            setMessage({
              type: 'info',
              text: `Trình duyệt cho ${targetProfile?.name || 'profile'} đã mở sẵn`,
            });
          } else {
            setMessage({
              type: 'success',
              text: `Đã mở trình duyệt cho ${targetProfile?.name || 'profile'}`,
            });
          }
        }
        if (typeof fetchData === 'function') await fetchData();
      } catch (err) {
        if (typeof setMessage === 'function') {
          const errText =
            err.response?.data?.error ||
            err.message ||
            'Không thể mở trình duyệt';
          setMessage({ type: 'error', text: errText });
        }
      } finally {
        setTogglingBrowserProfiles((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
      }
    },
    [profiles, setMessage, fetchData],
  );

  const closeProfile = useCallback(
    async (profileId) => {
      setTogglingBrowserProfiles((prev) => new Set([...prev, profileId]));
      try {
        const targetProfile = profiles.find((p) => p.id === profileId);
        await axios.post('/api/close-profile', { profileId });
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'success',
            text: `Đã đóng trình duyệt cho ${targetProfile?.name || 'profile'}`,
          });
        }
        if (typeof fetchData === 'function') await fetchData();
      } catch (err) {
        if (typeof setMessage === 'function') {
          const errText =
            err.response?.data?.error ||
            err.message ||
            'Không thể đóng trình duyệt';
          setMessage({ type: 'error', text: errText });
        }
      } finally {
        setTogglingBrowserProfiles((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
      }
    },
    [profiles, setMessage, fetchData],
  );

  const startLoginTikTok = useCallback(
    async (profileId) => {
      try {
        await axios.post('/api/login-tiktok', { profileId });
        setLoggingInProfiles((prev) => new Set([...prev, profileId]));
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'success',
            text: 'Đã bắt đầu đăng nhập TikTok! Trình duyệt sẽ mở ngay.',
          });
        }
      } catch (err) {
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'error',
            text: err.response?.data?.error || 'Không thể bắt đầu đăng nhập',
          });
        }
      }
    },
    [setMessage],
  );

  const stopLoginTikTok = useCallback(
    async (profileId) => {
      try {
        await axios.post('/api/login-tiktok/stop', { profileId });
        setLoggingInProfiles((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        if (typeof setMessage === 'function') {
          setMessage({ type: 'success', text: 'Đang dừng phiên đăng nhập...' });
        }
      } catch (err) {
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'error',
            text: err.response?.data?.error || 'Không thể dừng phiên đăng nhập',
          });
        }
      }
    },
    [setMessage],
  );

  const startBulkLogin = useCallback(async () => {
    const profileIds = [...selectedForRun];
    if (profileIds.length === 0) {
      if (typeof setMessage === 'function') {
        setMessage({
          type: 'error',
          text: 'Chọn ít nhất một profile để Login.',
        });
      }
      return;
    }
    const missing = profileIds.filter((id) => {
      const p = profiles.find((pr) => pr.id === id);
      return !p || (!p.cookies && (!p.email || !p.pass));
    });
    if (missing.length > 0) {
      if (typeof setMessage === 'function') {
        setMessage({
          type: 'error',
          text: `${missing.length} profile thiếu cookies hoặc email/password (cần Import CSV trước).`,
        });
      }
      return;
    }
    if (typeof setMessage === 'function') {
      setMessage({
        type: 'success',
        text: `Bắt đầu Login cho ${profileIds.length} profile...`,
      });
    }
    for (const pid of profileIds) {
      if (loggingInProfiles.has(pid)) continue;
      try {
        await axios.post('/api/login-tiktok', { profileId: pid });
        setLoggingInProfiles((prev) => new Set([...prev, pid]));
      } catch (err) {
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'error',
            text: `Lỗi login profile ${pid}: ${err.response?.data?.error || err.message}`,
          });
        }
      }
    }
  }, [selectedForRun, profiles, loggingInProfiles, setMessage]);

  const handleAddFavoriteMusic = useCallback(
    async (profileId, searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) {
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'error',
            text: 'Vui lòng nhập từ khóa tìm kiếm bài hát',
          });
        }
        return;
      }
      try {
        setAddingFavoriteMusicProfiles((prev) => new Set([...prev, profileId]));
        await axios.post('/api/add-favorite-music', {
          profileId,
          searchTerm: searchTerm.trim(),
        });
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'success',
            text: 'Đang thêm nhạc yêu thích! Trình duyệt sẽ mở ngay.',
          });
        }
      } catch (err) {
        setAddingFavoriteMusicProfiles((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        if (typeof setMessage === 'function') {
          setMessage({
            type: 'error',
            text: err.response?.data?.error || 'Không thể thêm nhạc yêu thích',
          });
        }
      }
    },
    [setMessage],
  );

  const handleUpdateMusicSearchTerm = useCallback(async (profileId, value) => {
    setMusicSearchTerms((prev) => ({ ...prev, [profileId]: value }));
    try {
      await axios.patch(`/api/profiles/${profileId}`, { music_search: value });
    } catch (err) {
      console.error('Failed to save music_search:', err);
    }
  }, []);

  return {
    loggingInProfiles,
    setLoggingInProfiles,
    addingFavoriteMusicProfiles,
    setAddingFavoriteMusicProfiles,
    togglingBrowserProfiles,
    startingProfiles,
    musicSearchTerms,
    setMusicSearchTerms,
    syncProfilesStatus,
    startAutomation,
    openProfile,
    closeProfile,
    startLoginTikTok,
    stopLoginTikTok,
    startBulkLogin,
    handleAddFavoriteMusic,
    handleUpdateMusicSearchTerm,
  };
};

export default useAutomationActions;
