import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toast';

const isProfileEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.status === b.status &&
    a.video_folder === b.video_folder &&
    a.channel_ids === b.channel_ids &&
    a.group_id === b.group_id &&
    a.set_music === b.set_music &&
    a.remove_title === b.remove_title &&
    a.need_content_check === b.need_content_check &&
    a.auto_increment_schedule === b.auto_increment_schedule &&
    a.schedule_interval === b.schedule_interval &&
    a.upload_count === b.upload_count &&
    a.last_run === b.last_run &&
    a.is_browser_open === b.is_browser_open &&
    a.cookies === b.cookies
  );
};

export const useProfileData = ({ onProfilesFetched, selectedForRun, setSelectedForRun } = {}) => {
  const [profiles, setProfiles] = useState([]);
  const [config, setConfig] = useState({ videoFolder: '', maxConcurrency: 2 });
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [groupSortBy, setGroupSortBy] = useState('created_desc');
  const [activeTab, setActiveTab] = useState('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [batchStatus, setBatchStatus] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');

  const processingRef = useRef(new Set());
  const hookRef = useRef({ onProfilesFetched });
  hookRef.current.onProfilesFetched = onProfilesFetched;

  const activeRef = useRef({ hasActiveJob: false });
  useEffect(() => {
    activeRef.current.hasActiveJob =
      profiles.some(
        (p) =>
          p.status === 'uploading' ||
          p.status === 'logging_in' ||
          p.status === 'changing_avatar' ||
          p.status === 'adding_favorite_music'
      ) || Boolean(batchStatus);
  }, [profiles, batchStatus]);

  const message = null;

  const setMessage = useCallback((msg) => {
    if (msg) {
      showToast(msg);
    }
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { all: profiles.length, idle: 0, running: 0, success: 0, error: 0, no_videos: 0 };
    profiles.forEach((p) => {
      const s = p.status || 'idle';
      if (s === 'uploading' || s === 'logging_in' || s === 'adding_favorite_music') {
        counts.running = (counts.running || 0) + 1;
      } else if (counts[s] !== undefined) {
        counts[s]++;
      } else {
        counts[s] = 1;
      }
    });
    return counts;
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    let list = [...profiles];

    // 1. Group filter
    if (groupFilter === 'ungrouped') {
      list = list.filter((p) => !p.group_id);
    } else if (groupFilter !== 'all') {
      list = list.filter((p) => p.group_id === groupFilter);
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => (p.name && p.name.toLowerCase().includes(q)) || (p.channel_ids && p.channel_ids.toLowerCase().includes(q)));
    }

    return list;
  }, [profiles, groupFilter, searchQuery]);

  const sortedGroups = useMemo(() => {
    const list = [...groups];
    list.sort((a, b) => {
      if (groupSortBy === 'created_desc') {
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      if (groupSortBy === 'created_asc') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      if (groupSortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (groupSortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (groupSortBy === 'count_desc') {
        return (b.profile_count || 0) - (a.profile_count || 0);
      }
      if (groupSortBy === 'count_asc') {
        return (a.profile_count || 0) - (b.profile_count || 0);
      }
      return 0;
    });
    return list;
  }, [groups, groupSortBy]);

  const resetFilters = useCallback(() => {
    setGroupFilter('all');
    setSearchQuery('');
  }, []);

  // Lightweight profile-only polling fetch (avoids re-fetching static config & groups)
  const fetchProfilesOnly = useCallback(async () => {
    try {
      const promises = [axios.get('/api/profiles')];
      if (activeRef.current.hasActiveJob) {
        promises.push(axios.get('/api/batch-status').catch(() => ({ data: null })));
      }

      const [pRes, bRes] = await Promise.all(promises);
      const newProfiles = pRes.data || [];

      setProfiles((prev) => {
        let hasAnyChange = false;
        if (prev.length !== newProfiles.length) {
          hasAnyChange = true;
        }

        const merged = newProfiles.map((np, idx) => {
          if (processingRef.current.has(np.id)) {
            const current = prev.find((p) => p.id === np.id);
            return current || np;
          }
          const existing = prev[idx]?.id === np.id ? prev[idx] : prev.find((p) => p.id === np.id);
          if (existing && isProfileEqual(existing, np)) {
            return existing;
          }
          hasAnyChange = true;
          return np;
        });

        if (!hasAnyChange && prev.length === merged.length) {
          return prev;
        }
        return merged;
      });

      if (bRes && bRes.data) {
        const newStatus = bRes.data.status !== 'idle' ? bRes.data : null;
        setBatchStatus((prev) => {
          if (prev === null && newStatus === null) return null;
          if (prev && newStatus && JSON.stringify(prev) === JSON.stringify(newStatus)) return prev;
          return newStatus;
        });
      }

      if (typeof hookRef.current.onProfilesFetched === 'function') {
        hookRef.current.onProfilesFetched(newProfiles);
      }
    } catch (err) {
      console.error('fetchProfilesOnly error:', err);
    }
  }, []);

  // Comprehensive fetch for initial load or after mutations
  const fetchData = useCallback(async () => {
    try {
      const [pRes, cRes, gRes, bRes] = await Promise.all([
        axios.get('/api/profiles'),
        axios.get('/api/config'),
        axios.get('/api/groups'),
        axios.get('/api/batch-status').catch(() => ({ data: null }))
      ]);

      const newProfiles = pRes.data || [];
      setProfiles((prev) => {
        let hasAnyChange = false;
        if (prev.length !== newProfiles.length) {
          hasAnyChange = true;
        }

        const merged = newProfiles.map((np, idx) => {
          if (processingRef.current.has(np.id)) {
            const current = prev.find((p) => p.id === np.id);
            return current || np;
          }
          const existing = prev[idx]?.id === np.id ? prev[idx] : prev.find((p) => p.id === np.id);
          if (existing && isProfileEqual(existing, np)) {
            return existing;
          }
          hasAnyChange = true;
          return np;
        });

        if (!hasAnyChange && prev.length === merged.length) {
          return prev;
        }
        return merged;
      });

      setConfig((prev) => {
        const next = cRes.data || { videoFolder: '', maxConcurrency: 2 };
        if (prev.videoFolder === next.videoFolder && prev.maxConcurrency === next.maxConcurrency) {
          return prev;
        }
        return next;
      });

      setGroups((prev) => {
        const next = gRes.data || [];
        if (
          prev.length === next.length &&
          prev.every(
            (g, i) =>
              g.id === next[i]?.id &&
              g.name === next[i]?.name &&
              g.video_folder === next[i]?.video_folder &&
              g.profile_count === next[i]?.profile_count
          )
        ) {
          return prev;
        }
        return next;
      });

      const newStatus = bRes && bRes.data && bRes.data.status !== 'idle' ? bRes.data : null;
      setBatchStatus((prev) => {
        if (prev === null && newStatus === null) return null;
        if (prev && newStatus && JSON.stringify(prev) === JSON.stringify(newStatus)) return prev;
        return newStatus;
      });

      if (typeof hookRef.current.onProfilesFetched === 'function') {
        hookRef.current.onProfilesFetched(newProfiles);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  // Adaptive background polling with visibility listener
  useEffect(() => {
    let timerId = null;
    let isCancelled = false;

    // Initial full fetch
    fetchData();

    const runPoll = async () => {
      if (isCancelled) return;

      if (!document.hidden) {
        await fetchProfilesOnly();
      }

      if (isCancelled) return;

      const delay = document.hidden
        ? 20000
        : (activeRef.current.hasActiveJob ? 2500 : 5000);

      timerId = setTimeout(runPoll, delay);
    };

    timerId = setTimeout(runPoll, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearTimeout(timerId);
        fetchProfilesOnly().then(() => {
          if (!isCancelled) {
            timerId = setTimeout(runPoll, activeRef.current.hasActiveJob ? 2500 : 5000);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, fetchProfilesOnly]);

  const dismissBatchStatus = useCallback(async (sessionId = null) => {
    if (sessionId) {
      setBatchStatus((prev) => {
        if (!prev) return null;
        if (prev.id === sessionId) return null;
        if (prev.sessions) {
          const nextSessions = prev.sessions.filter((s) => s.id !== sessionId);
          if (nextSessions.length === 0) return null;
          return { ...prev, sessions: nextSessions };
        }
        return prev;
      });
    } else {
      setBatchStatus(null);
    }
    try {
      await axios.post('/api/batch-dismiss', { sessionId });
    } catch (err) {
      console.error('Failed to dismiss batch status on server:', err);
    }
  }, []);

  const addGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await axios.post('/api/groups', { name });
      setNewGroupName('');
      await fetchData();
      setMessage({ type: 'success', text: 'Tạo nhóm thành công' });
    } catch (err) {
      const errText = err.response?.data?.error || 'Không thể tạo nhóm';
      setMessage({ type: 'error', text: errText });
    }
  }, [newGroupName, fetchData, setMessage]);

  const updateGroup = useCallback(async (id, updates) => {
    try {
      const res = await axios.patch(`/api/groups/${id}`, updates);
      if (res.data) {
        setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...res.data } : g)));
      }
      await fetchData();
      setMessage({ type: 'success', text: 'Cập nhật nhóm thành công' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Không thể cập nhật nhóm' });
    }
  }, [fetchData, setMessage]);

  const updateGroupName = useCallback(async (id, newName) => {
    if (!newName.trim()) {
      setEditingGroupId(null);
      return;
    }
    try {
      await axios.patch(`/api/groups/${id}`, { name: newName.trim() });
      setEditingGroupId(null);
      await fetchData();
      setMessage({ type: 'success', text: 'Đổi tên nhóm thành công' });
    } catch (err) {
      const errText = err.response?.data?.error || 'Không thể đổi tên nhóm';
      setMessage({ type: 'error', text: errText });
      setEditingGroupId(null);
    }
  }, [fetchData, setMessage]);

  const deleteGroup = useCallback(async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhóm này? Nhóm phải không còn profile nào gán bên trong.')) return;
    try {
      await axios.delete(`/api/groups/${id}`);
      setGroupFilter((prev) => (prev === id ? 'all' : prev));
      await fetchData();
      setMessage({ type: 'success', text: 'Đã xóa nhóm thành công' });
    } catch (err) {
      const errText = err.response?.data?.error || 'Không thể xóa nhóm';
      setMessage({ type: 'error', text: errText });
    }
  }, [fetchData, setMessage]);

  const updateProfileGroup = useCallback(async (profileId, groupId) => {
    try {
      await axios.patch(`/api/profiles/${profileId}`, { group_id: groupId });
      await fetchData();
      setMessage({ type: 'success', text: 'Đã cập nhật nhóm cho profile' });
    } catch (err) {
      const errText = err.response?.data?.error || 'Không thể cập nhật nhóm cho profile';
      setMessage({ type: 'error', text: errText });
    }
  }, [fetchData, setMessage]);

  const deleteProfile = useCallback(async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa profile này? Dữ liệu profile sẽ được đưa vào thùng rác.')) return;
    try {
      await axios.delete(`/api/profiles/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }, [fetchData]);

  const deleteSelectedProfiles = useCallback(async (targetSet, clearSelectionFn) => {
    const target = targetSet || selectedForRun;
    if (!target || target.size === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một profile để xóa.' });
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa ${target.size} profile đã chọn? Việc này cũng sẽ chuyển thư mục profile vào thùng rác.`)) return;
    try {
      await axios.post('/api/profiles/delete-multiple', { profileIds: Array.from(target) });
      const clearFn = clearSelectionFn || setSelectedForRun;
      if (typeof clearFn === 'function') {
        clearFn(new Set());
      }
      await fetchData();
      setMessage({ type: 'success', text: `Đã xóa thành công ${target.size} profile đã chọn.` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Có lỗi khi xóa profile.' });
    }
  }, [selectedForRun, setSelectedForRun, fetchData, setMessage]);

  const updateConfig = useCallback(async () => {
    setIsSavingConfig(true);
    try {
      await axios.post('/api/config', config);
      setMessage({ type: 'success', text: 'Đã lưu cấu hình hệ thống thành công!' });
    } catch (err) {
      console.error('Error updating config:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi lưu cấu hình hệ thống' });
    } finally {
      setIsSavingConfig(false);
    }
  }, [config, setMessage]);

  const updateProfileFolder = useCallback(async (id, folder) => {
    try {
      await axios.patch(`/api/profiles/${id}`, { video_folder: folder });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }, [fetchData]);

  const updateProfileChannelIds = useCallback(async (id, channelIds) => {
    try {
      await axios.patch(`/api/profiles/${id}`, { channel_ids: channelIds });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }, [fetchData]);

  const updateProfileName = useCallback(async (id, newName) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await axios.patch(`/api/profiles/${id}`, { name: newName });
      setEditingId(null);
      fetchData();
      setMessage({ type: 'success', text: 'Đã đổi tên profile thành công' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Không thể đổi tên profile' });
      setEditingId(null);
    }
  }, [fetchData, setMessage]);

  const updateProfileSetMusic = useCallback(async (id, enabled) => {
    if (processingRef.current.has(id)) return;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, set_music: enabled ? 1 : 0 } : p)));
    processingRef.current.add(id);
    try {
      await axios.patch(`/api/profiles/${id}`, { set_music: enabled });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      processingRef.current.delete(id);
    }
  }, [fetchData]);

  const updateProfileRemoveTitle = useCallback(async (id, enabled) => {
    if (processingRef.current.has(id)) return;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, remove_title: enabled ? 1 : 0 } : p)));
    processingRef.current.add(id);
    try {
      await axios.patch(`/api/profiles/${id}`, { remove_title: enabled });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      processingRef.current.delete(id);
    }
  }, [fetchData]);

  const updateProfileNeedContentCheck = useCallback(async (id, enabled) => {
    if (processingRef.current.has(id)) return;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, need_content_check: enabled ? 1 : 0 } : p)));
    processingRef.current.add(id);
    try {
      await axios.patch(`/api/profiles/${id}`, { need_content_check: enabled });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      processingRef.current.delete(id);
    }
  }, [fetchData]);

  const updateProfileAutoIncrementSchedule = useCallback(async (id, enabled) => {
    if (processingRef.current.has(id)) return;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, auto_increment_schedule: enabled ? 1 : 0 } : p)));
    processingRef.current.add(id);
    try {
      await axios.patch(`/api/profiles/${id}`, { auto_increment_schedule: enabled });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      processingRef.current.delete(id);
    }
  }, [fetchData]);

  const updateProfileScheduleInterval = useCallback(async (id, interval) => {
    if (processingRef.current.has(id)) return;
    const intervalNum = Number(interval);
    const intervalVal = [5, 10, 15, 20].includes(intervalNum) ? intervalNum : 5;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, schedule_interval: intervalVal } : p)));
    processingRef.current.add(id);
    try {
      await axios.patch(`/api/profiles/${id}`, { schedule_interval: intervalVal });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      processingRef.current.delete(id);
    }
  }, [fetchData]);

  const updateProfileUploadCount = useCallback(async (id, count) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, upload_count: count } : p)));
    try {
      await axios.patch(`/api/profiles/${id}`, { upload_count: count });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    }
  }, [fetchData]);

  const clearTrash = useCallback(async (targetSet) => {
    const target = targetSet || selectedForRun;
    if (!target || target.size === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một profile để dọn dẹp rác.' });
      return;
    }
    const profileIds = [...target];
    setMessage({ type: 'info', text: `Đang dọn rác cho ${profileIds.length} profile...` });
    try {
      const res = await axios.post('/api/profiles/clear-trash', { profileIds });
      const { totalFreedMB } = res.data;
      if (totalFreedMB > 0) {
        setMessage({ type: 'success', text: `Đã giải phóng ${totalFreedMB} MB từ ${profileIds.length} profile.` });
      } else {
        setMessage({ type: 'info', text: 'Không có file rác nào cần dọn.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi dọn rác' });
    }
  }, [selectedForRun, setMessage]);

  const clearDebugFiles = useCallback(async () => {
    if (!window.confirm('Xóa toàn bộ file debug PNG và dọn automation.log?\nHành động này không ảnh hưởng đến profile hay cookie.')) return;
    setMessage({ type: 'info', text: 'Đang xóa file debug...' });
    try {
      const res = await axios.post('/api/system/clear-debug');
      const { freedMB, deletedFiles } = res.data;
      setMessage({ type: 'success', text: `Đã xóa ${deletedFiles} file debug PNG + dọn log → giải phóng ${freedMB} MB` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi xóa debug' });
    }
  }, [setMessage]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'uploading': return 'var(--accent)';
      case 'logging_in': return '#10B981';
      case 'changing_avatar': return '#3B82F6';
      case 'adding_favorite_music': return '#A855F7';
      case 'success': return 'var(--success)';
      case 'error': return 'var(--error)';
      case 'no_videos': return '#EAB308';
      default: return 'var(--text-muted)';
    }
  }, []);

  return {
    profiles,
    setProfiles,
    filteredProfiles,
    groups,
    setGroups,
    config,
    setConfig,
    activeTab,
    setActiveTab,
    message,
    setMessage,
    isLoading,
    setIsLoading,
    isSavingConfig,
    batchStatus,
    setBatchStatus,
    dismissBatchStatus,
    groupFilter,
    setGroupFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    groupSortBy,
    setGroupSortBy,
    sortedGroups,
    statusCounts,
    resetFilters,
    updateGroup,
    editingId,
    setEditingId,
    editingValue,
    setEditingValue,
    newGroupName,
    setNewGroupName,
    editingGroupId,
    setEditingGroupId,
    editingGroupValue,
    setEditingGroupValue,
    fetchData,
    fetchProfilesOnly,
    addGroup,
    updateGroupName,
    deleteGroup,
    updateProfileGroup,
    deleteProfile,
    deleteSelectedProfiles,
    updateConfig,
    updateProfileFolder,
    updateProfileChannelIds,
    updateProfileName,
    updateProfileSetMusic,
    updateProfileRemoveTitle,
    updateProfileNeedContentCheck,
    updateProfileAutoIncrementSchedule,
    updateProfileScheduleInterval,
    updateProfileUploadCount,
    clearTrash,
    clearDebugFiles,
    getStatusColor,
    get onProfilesFetched() {
      return hookRef.current.onProfilesFetched;
    },
    set onProfilesFetched(fn) {
      hookRef.current.onProfilesFetched = fn;
    }
  };
};

export default useProfileData;
