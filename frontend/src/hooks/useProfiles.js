import { useAutomationActions } from './useAutomationActions';
import { useCookieActions } from './useCookieActions';
import { useCreateProfile } from './useCreateProfile';
import { useEditProfile } from './useEditProfile';
import { useFolderPicker } from './useFolderPicker';
import { useFollowerActions } from './useFollowerActions';
import { useProfileData } from './useProfileData';
import { useProfileSelection } from './useProfileSelection';

/**
 * Encapsulates core state and API handlers for the TikTok Manager dashboard.
 * Composes single-purpose hooks to keep logic clean and maintainable.
 */
const useProfiles = () => {
  // 1. Profile data & Group management
  const profileData = useProfileData();
  const {
    profiles,
    filteredProfiles,
    groups,
    config,
    activeTab,
    message,
    isLoading,
    batchStatus,
    groupFilter,
    searchQuery,
    setSearchQuery,
    resetFilters,
    updateGroup,
    editingId,
    editingValue,
    newGroupName,
    editingGroupId,
    editingGroupValue,
    setActiveTab,
    setMessage,
    setConfig,
    setGroupFilter,
    setEditingGroupId,
    setEditingGroupValue,
    setEditingId,
    setEditingValue,
    setNewGroupName,
    fetchData,
    addGroup,
    updateGroupName,
    deleteGroup,
    updateProfileGroup,
    deleteProfile,
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
    clearDebugFiles,
    getStatusColor,
    dismissBatchStatus,
  } = profileData;

  // 2. Selection
  const selection = useProfileSelection(profiles, filteredProfiles);
  const {
    selectedForRun,
    toggleProfileSelectedForRun,
    allFilteredSelected,
    toggleSelectAllFiltered,
  } = selection;

  // 3. Automation actions
  const automation = useAutomationActions({
    profiles,
    selectedForRun,
    setIsLoading: profileData.setIsLoading,
    setMessage,
    fetchData: profileData.fetchData,
  });
  const {
    loggingInProfiles,
    addingFavoriteMusicProfiles,
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
  } = automation;

  // Sync profile automation status when data updates
  profileData.onProfilesFetched = syncProfilesStatus;

  // Wrapped actions passing current selectedForRun explicitly
  const handleDeleteSelectedProfiles = (ids) => {
    return profileData.deleteSelectedProfiles(
      ids || selectedForRun,
      selection.setSelectedForRun,
    );
  };

  const handleClearTrash = (ids) => {
    return profileData.clearTrash(ids || selectedForRun);
  };

  // 4. Folder selection dialogs
  const folderPicker = useFolderPicker({
    updateProfileFolder,
    setNewProfileVideoFolder: (path) =>
      createProfile.setNewProfileVideoFolder(path),
  });
  const {
    isSelectingFolder,
    handleSelectFolder,
    handleSelectFolderForCreateProfile,
    handleSelectFolderForConfig,
  } = folderPicker;

  const handleSelectFolderForDefaultConfig = () => {
    return handleSelectFolderForConfig((selectedPath) => {
      if (selectedPath) {
        setConfig((prev) => ({ ...prev, videoFolder: selectedPath }));
      }
    });
  };

  // 5. Create profile modal
  const createProfile = useCreateProfile({
    fetchData,
    setMessage,
    isSelectingFolder,
  });
  const {
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
    closeCreateProfileModal,
    addProfile,
  } = createProfile;

  // 6. Cookies actions & JSON import/export
  const cookieActions = useCookieActions({
    fetchData,
    setMessage,
    selectedForRun,
  });
  const {
    cookieModalProfileId,
    openCookieModal,
    closeCookieModal,
    handleSaveProfileCookies,
    handleCaptureCookiesFromBrowser,
    handleLogoutProfile,
    handleExportCookiesJson,
    handleImportCookiesJson,
  } = cookieActions;

  // 7. Edit Profile Modal
  const editProfile = useEditProfile({
    profiles,
    setMusicSearchTerms,
  });
  const {
    editingProfileId,
    editingProfile,
    handleEditProfile,
    handleCloseEditProfile,
  } = editProfile;

  // 8. Follower counts & modal
  const followerActions = useFollowerActions({
    profiles,
    selectedForRun,
  });
  const {
    followersMap,
    isFollowersModalOpen,
    setIsFollowersModalOpen,
    isLoadingFollowers,
    followersModalProfiles,
    handleCheckFollowers,
  } = followerActions;

  return {
    // core data
    profiles,
    filteredProfiles,
    groups,
    config,
    activeTab,
    message,
    selectedForRun,
    allFilteredSelected,
    groupFilter,
    isLoading,
    isSelectingFolder,
    batchStatus,
    dismissBatchStatus,
    loggingInProfiles,
    addingFavoriteMusicProfiles,
    togglingBrowserProfiles,
    startingProfiles,
    cookieModalProfileId,
    musicSearchTerms,

    // followers
    followersMap,
    isFollowersModalOpen,
    setIsFollowersModalOpen,
    isLoadingFollowers,
    followersModalProfiles,
    handleCheckFollowers,

    // create profile
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
    closeCreateProfileModal,
    addProfile,
    handleSelectFolderForCreateProfile,

    // edit profile modal
    editingProfileId,
    editingProfile,
    handleEditProfile,
    handleCloseEditProfile,

    // groups editing
    newGroupName,
    editingGroupId,
    editingGroupValue,
    setNewGroupName,
    setEditingGroupId,
    setEditingGroupValue,
    addGroup,
    updateGroupName,
    deleteGroup,

    // inline name editing
    editingId,
    editingValue,
    setEditingId,
    setEditingValue,

    // setters
    setActiveTab,
    setMessage,
    setConfig,
    setGroupFilter,
    searchQuery,
    setSearchQuery,
    resetFilters,
    updateGroup,
    dismissBatchStatus,

    // actions
    fetchData,
    updateProfileGroup,
    deleteProfile,
    deleteSelectedProfiles: handleDeleteSelectedProfiles,
    updateConfig,
    isSavingConfig: profileData.isSavingConfig,
    handleSelectFolderForDefaultConfig,
    startAutomation,
    toggleProfileSelectedForRun,
    toggleSelectAllFiltered,
    openProfile,
    closeProfile,
    startLoginTikTok,
    stopLoginTikTok,
    startBulkLogin,
    clearTrash: handleClearTrash,
    clearDebugFiles,
    updateProfileFolder,
    updateProfileChannelIds,
    updateProfileName,
    updateProfileSetMusic,
    updateProfileRemoveTitle,
    updateProfileNeedContentCheck,
    updateProfileAutoIncrementSchedule,
    updateProfileScheduleInterval,
    updateProfileUploadCount,
    handleSelectFolder,
    handleAddFavoriteMusic,
    openCookieModal,
    closeCookieModal,
    handleSaveProfileCookies,
    handleCaptureCookiesFromBrowser,
    handleLogoutProfile,
    handleExportCookiesJson,
    handleImportCookiesJson,
    handleUpdateMusicSearchTerm,
    getStatusColor,
  };
};

export default useProfiles;
