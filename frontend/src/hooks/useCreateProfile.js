import { useState, useCallback } from 'react';
import axios from 'axios';

export const useCreateProfile = ({ fetchData, setMessage, isSelectingFolder } = {}) => {
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileGroupId, setNewProfileGroupId] = useState('');
  const [newProfileVideoFolder, setNewProfileVideoFolder] = useState('');
  const [newProfileMusicSearch, setNewProfileMusicSearch] = useState('');
  const [newProfileAutoIncrementSchedule, setNewProfileAutoIncrementSchedule] = useState(true);
  const [newProfileScheduleInterval, setNewProfileScheduleInterval] = useState(10);
  const [newProfileRemoveTitle, setNewProfileRemoveTitle] = useState(true);
  const [newProfileSetMusic, setNewProfileSetMusic] = useState(true);
  const [newProfileNeedContentCheck, setNewProfileNeedContentCheck] = useState(false);

  const resetCreateProfileForm = useCallback(() => {
    setNewProfileName('');
    setNewProfileGroupId('');
    setNewProfileVideoFolder('');
    setNewProfileMusicSearch('');
    setNewProfileAutoIncrementSchedule(true);
    setNewProfileScheduleInterval(10);
    setNewProfileRemoveTitle(true);
    setNewProfileSetMusic(true);
    setNewProfileNeedContentCheck(false);
  }, []);

  const closeCreateProfileModal = useCallback(({ force } = {}) => {
    if ((isCreatingProfile || isSelectingFolder) && !force) return;
    setIsCreateProfileModalOpen(false);
    resetCreateProfileForm();
  }, [isCreatingProfile, isSelectingFolder, resetCreateProfileForm]);

  const addProfile = useCallback(async () => {
    if (isCreatingProfile) return;
    const name = newProfileName.trim();
    if (!name) return;

    setIsCreatingProfile(true);
    try {
      await axios.post('/api/profiles', {
        name,
        group_id: newProfileGroupId || null,
        video_folder: newProfileVideoFolder.trim() || null,
        music_search: newProfileMusicSearch.trim() || null,
        auto_increment_schedule: newProfileAutoIncrementSchedule ? 1 : 0,
        schedule_interval: newProfileScheduleInterval || 10,
        remove_title: newProfileRemoveTitle ? 1 : 0,
        set_music: newProfileSetMusic ? 1 : 0,
        need_content_check: newProfileNeedContentCheck ? 1 : 0
      });
      closeCreateProfileModal({ force: true });
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      if (typeof setMessage === 'function') {
        setMessage({ type: 'success', text: 'Profile added successfully' });
      }
    } catch (err) {
      if (typeof setMessage === 'function') {
        setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to add profile' });
      }
    } finally {
      setIsCreatingProfile(false);
    }
  }, [
    isCreatingProfile,
    newProfileName,
    newProfileGroupId,
    newProfileVideoFolder,
    newProfileMusicSearch,
    newProfileAutoIncrementSchedule,
    newProfileScheduleInterval,
    newProfileRemoveTitle,
    newProfileSetMusic,
    newProfileNeedContentCheck,
    closeCreateProfileModal,
    fetchData,
    setMessage
  ]);

  return {
    isCreateProfileModalOpen,
    setIsCreateProfileModalOpen,
    isCreatingProfile,
    newProfileName,
    setNewProfileName,
    newProfileGroupId,
    setNewProfileGroupId,
    newProfileVideoFolder,
    setNewProfileVideoFolder,
    newProfileMusicSearch,
    setNewProfileMusicSearch,
    newProfileAutoIncrementSchedule,
    setNewProfileAutoIncrementSchedule,
    newProfileScheduleInterval,
    setNewProfileScheduleInterval,
    newProfileRemoveTitle,
    setNewProfileRemoveTitle,
    newProfileSetMusic,
    setNewProfileSetMusic,
    newProfileNeedContentCheck,
    setNewProfileNeedContentCheck,
    resetCreateProfileForm,
    closeCreateProfileModal,
    addProfile
  };
};

export default useCreateProfile;
