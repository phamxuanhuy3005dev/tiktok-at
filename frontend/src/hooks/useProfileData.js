import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toast';

export const useProfileData = ({ onProfilesFetched, selectedForRun, setSelectedForRun } = {}) => {
  const [profiles, setProfiles] = useState([]);
  const [config, setConfig] = useState({ videoFolder: '', maxConcurrency: 2 });
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [batchStatus, setBatchStatus] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');

  const processingRef = useRef(new Set());
  const message = null;

  const setMessage = useCallback((msg) => {
    if (msg) {
      showToast(msg);
    }
  }, []);

  const filteredProfiles = useMemo(() => {
    if (groupFilter === 'all') return profiles;
    if (groupFilter === 'ungrouped') {
      return profiles.filter((p) => !p.group_id);
    }
    return profiles.filter((p) => p.group_id === groupFilter);
  }, [profiles, groupFilter]);

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
        return newProfiles.map((np) => {
          if (processingRef.current.has(np.id)) {
            const current = prev.find((p) => p.id === np.id);
            return current || np;
          }
          return np;
        });
      });

      setConfig(cRes.data || { videoFolder: '', maxConcurrency: 2 });
      setGroups(gRes.data || []);
      if (bRes && bRes.data) {
        setBatchStatus(bRes.data.status !== 'idle' ? bRes.data : null);
      }

      if (typeof onProfilesFetched === 'function') {
        onProfilesFetched(newProfiles);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [onProfilesFetched]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const dismissBatchStatus = useCallback(async () => {
    setBatchStatus(null);
    try {
      await axios.post('/api/batch-dismiss');
    } catch (err) {
      console.error('Failed to dismiss batch status on server:', err);
    }
  }, []);

  const addGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await axios.post('/api/groups', { name });
      setNewGroupName('');
      await fetchData();
      setMessage({ type: 'success', text: 'Group created successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create group' });
    }
  };

  const updateGroupName = async (id, newName) => {
    if (!newName.trim()) {
      setEditingGroupId(null);
      return;
    }
    try {
      await axios.patch(`/api/groups/${id}`, { name: newName.trim() });
      setEditingGroupId(null);
      await fetchData();
      setMessage({ type: 'success', text: 'Group renamed successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to rename group' });
      setEditingGroupId(null);
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm('Delete this group? It must have no profiles assigned.')) return;
    try {
      await axios.delete(`/api/groups/${id}`);
      if (groupFilter === id) setGroupFilter('all');
      await fetchData();
      setMessage({ type: 'success', text: 'Group deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete group' });
    }
  };

  const updateProfileGroup = async (profileId, groupId) => {
    try {
      await axios.patch(`/api/profiles/${profileId}`, { group_id: groupId });
      await fetchData();
      setMessage({ type: 'success', text: 'Profile group updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile group' });
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    try {
      await axios.delete(`/api/profiles/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSelectedProfiles = async (targetSet, clearSelectionFn) => {
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
  };

  const updateConfig = async () => {
    try {
      await axios.post('/api/config', config);
      setMessage({ type: 'success', text: 'Settings updated' });
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfileFolder = async (id, folder) => {
    try {
      await axios.patch(`/api/profiles/${id}`, { video_folder: folder });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfileChannelIds = async (id, channelIds) => {
    try {
      await axios.patch(`/api/profiles/${id}`, { channel_ids: channelIds });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfileName = async (id, newName) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await axios.patch(`/api/profiles/${id}`, { name: newName });
      setEditingId(null);
      fetchData();
      setMessage({ type: 'success', text: 'Profile renamed successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to rename profile' });
      setEditingId(null);
    }
  };


  const updateProfileSetMusic = async (id, enabled) => {
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
  };

  const updateProfileRemoveTitle = async (id, enabled) => {
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
  };

  const updateProfileNeedContentCheck = async (id, enabled) => {
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
  };

  const updateProfileAutoIncrementSchedule = async (id, enabled) => {
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
  };

  const updateProfileScheduleInterval = async (id, interval) => {
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
  };

  const updateProfileUploadCount = async (id, count) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, upload_count: count } : p)));
    try {
      await axios.patch(`/api/profiles/${id}`, { upload_count: count });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchData();
    } catch (err) {
      console.error(err);
      await fetchData();
    }
  };

  const updateProfileUseFingerprint = async (profileId, useFingerprint) => {
    try {
      await axios.put(`/api/profiles/${profileId}`, { use_fingerprint: useFingerprint ? 1 : 0 });
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, use_fingerprint: useFingerprint ? 1 : 0 } : p)));
    } catch (err) {
      console.error('Error updating use_fingerprint:', err);
    }
  };

  const resetProfileFingerprint = async (profileId) => {
    try {
      const res = await axios.post(`/api/profiles/${profileId}/random-fingerprint`);
      if (res.data?.fingerprint) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, fingerprint: JSON.stringify(res.data.fingerprint), use_fingerprint: 1 } : p
          )
        );
        setMessage({ type: 'success', text: 'Đã tạo và gán vân tay trình duyệt mới thành công!' });
      }
    } catch (err) {
      console.error('Error resetting fingerprint:', err);
      setMessage({ type: 'error', text: 'Lỗi khi reset vân tay trình duyệt' });
    }
  };

  const clearTrash = async (targetSet) => {
    const target = targetSet || selectedForRun;
    if (!target || target.size === 0) {
      setMessage({ type: 'error', text: 'Chọn ít nhất một profile để Clear Trash.' });
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
  };

  const clearDebugFiles = async () => {
    if (!window.confirm('Xóa toàn bộ file debug PNG và dọn automation.log?\nHành động này không ảnh hưởng đến profile hay cookie.')) return;
    setMessage({ type: 'info', text: 'Đang xóa file debug...' });
    try {
      const res = await axios.post('/api/system/clear-debug');
      const { freedMB, deletedFiles } = res.data;
      setMessage({ type: 'success', text: `Đã xóa ${deletedFiles} file debug PNG + dọn log → giải phóng ${freedMB} MB` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi xóa debug' });
    }
  };

  const getStatusColor = (status) => {
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
  };

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
    batchStatus,
    setBatchStatus,
    dismissBatchStatus,
    groupFilter,
    setGroupFilter,
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
    updateProfileUseFingerprint,
    resetProfileFingerprint,
    clearTrash,
    clearDebugFiles,
    getStatusColor
  };
};

export default useProfileData;
