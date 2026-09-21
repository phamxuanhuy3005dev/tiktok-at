import React from 'react';
import { Layout } from 'lucide-react';
import ProfileCard from './ProfileCard';
import CreateProfileModal from './CreateProfileModal';
import EditProfileModal from './EditProfileModal';
import CookieModal from './CookieModal';
import BatchStatusBanner from './BatchStatusBanner';
import ProfilesToolbar from './ProfilesToolbar';
import ProfilesActionBar from './ProfilesActionBar';

// The "Profiles Dashboard" tab: filters, bulk actions, profile card grid,
// empty states and all profile-related modals (create, import, export, edit).
const ProfilesView = ({
  profiles = [],
  filteredProfiles = [],
  groups = [],
  groupFilter = 'all',
  setGroupFilter,
  allFilteredSelected = false,
  toggleSelectAllFiltered,
  selectedForRun = new Set(),
  isLoading = false,
  startAutomation,
  batchStatus = null,
  dismissBatchStatus,
  startBulkLogin,
  clearTrash,
  clearDebugFiles,
  deleteSelectedProfiles,
  setIsCreateProfileModalOpen,
  // per-card
  toggleProfileSelectedForRun,
  deleteProfile,
  openProfile,
  closeProfile,
  startLoginTikTok,
  stopLoginTikTok,
  loggingInProfiles = new Set(),
  updateProfileName,
  cookieModalProfileId,
  openCookieModal,
  closeCookieModal,
  handleSaveProfileCookies,
  handleCaptureCookiesFromBrowser,
  handleLogoutProfile,
  handleExportCookiesJson,
  handleImportCookiesJson,
  handleAddFavoriteMusic,
  addingFavoriteMusicProfiles = new Set(),
  musicSearchTerms = {},
  editingId,
  setEditingId,
  editingValue,
  setEditingValue,
  handleEditProfile,
  // create modal
  isCreateProfileModalOpen,
  isCreatingProfile,
  isSelectingFolder,
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
  // edit modal
  editingProfileId,
  editingProfile,
  handleCloseEditProfile,
  updateProfileGroup,
  updateProfileFolder,
  handleSelectFolder,
  updateProfileChannelIds,
  updateProfileSetMusic,
  updateProfileAutoIncrementSchedule,
  updateProfileScheduleInterval,
  updateProfileUploadCount,
  updateProfileRemoveTitle,
  updateProfileNeedContentCheck,
  handleUpdateMusicSearchTerm
}) => {
  const hasSelection = (selectedForRun?.size || 0) > 0;

  return (
    <section>
      <BatchStatusBanner batchStatus={batchStatus} onDismiss={dismissBatchStatus} />

      <div className="page-header page-header--dash">
        <ProfilesToolbar
          hasSelection={hasSelection}
          setIsCreateProfileModalOpen={setIsCreateProfileModalOpen}
          handleExportCookiesJson={handleExportCookiesJson}
          handleImportCookiesJson={handleImportCookiesJson}
          clearTrash={clearTrash}
        />

        <ProfilesActionBar
          groups={groups}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          filteredProfiles={filteredProfiles}
          allFilteredSelected={allFilteredSelected}
          toggleSelectAllFiltered={toggleSelectAllFiltered}
          hasSelection={hasSelection}
          selectedForRun={selectedForRun}
          deleteSelectedProfiles={deleteSelectedProfiles}
          isLoading={isLoading}
          startAutomation={startAutomation}
        />
      </div>

      {filteredProfiles.length > 0 && (
        <div className="glass profile-table">
          <div className="profile-table-head">
            <div />
            <span>Profile</span>
            <span>Status</span>
            <span style={{ textAlign: 'right', paddingRight: '8px' }}>Actions</span>
            <div />
          </div>
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedForRun.has(profile.id)}
              onToggleSelected={toggleProfileSelectedForRun}
              onDelete={deleteProfile}
              onOpen={openProfile}
              onClose={closeProfile}
              onStart={startAutomation}
              onUpdateName={updateProfileName}
              onOpenCookieModal={openCookieModal}
              editingId={editingId}
              setEditingId={setEditingId}
              editingValue={editingValue}
              setEditingValue={setEditingValue}
              onEdit={handleEditProfile}
            />
          ))}
        </div>
      )}

      {profiles.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Layout size={32} opacity={0.3} />
          </div>
          <h3 className="empty-state-title">No profiles yet</h3>
          <p>Add your first TikTok account profile to start automation.</p>
        </div>
      )}

      {profiles.length > 0 && filteredProfiles.length === 0 && (
        <div className="empty-state empty-state--compact">
          <p style={{ color: 'var(--text)', marginBottom: '8px', fontWeight: '600' }}>No profiles match this filter</p>
          <p style={{ fontSize: '0.9rem' }}>Change the group filter above to see profiles.</p>
        </div>
      )}

      <CreateProfileModal
        open={isCreateProfileModalOpen}
        newProfileName={newProfileName}
        setNewProfileName={setNewProfileName}
        newProfileGroupId={newProfileGroupId}
        setNewProfileGroupId={setNewProfileGroupId}
        newProfileVideoFolder={newProfileVideoFolder}
        setNewProfileVideoFolder={setNewProfileVideoFolder}
        newProfileMusicSearch={newProfileMusicSearch}
        setNewProfileMusicSearch={setNewProfileMusicSearch}
        newProfileAutoIncrementSchedule={newProfileAutoIncrementSchedule}
        setNewProfileAutoIncrementSchedule={setNewProfileAutoIncrementSchedule}
        newProfileScheduleInterval={newProfileScheduleInterval}
        setNewProfileScheduleInterval={setNewProfileScheduleInterval}
        newProfileRemoveTitle={newProfileRemoveTitle}
        setNewProfileRemoveTitle={setNewProfileRemoveTitle}
        newProfileSetMusic={newProfileSetMusic}
        setNewProfileSetMusic={setNewProfileSetMusic}
        newProfileNeedContentCheck={newProfileNeedContentCheck}
        setNewProfileNeedContentCheck={setNewProfileNeedContentCheck}
        groups={groups}
        isCreatingProfile={isCreatingProfile}
        isSelectingFolder={isSelectingFolder}
        closeCreateProfileModal={closeCreateProfileModal}
        addProfile={addProfile}
        handleSelectFolderForCreateProfile={handleSelectFolderForCreateProfile}
      />

      <EditProfileModal
        isOpen={editingProfileId !== null}
        onClose={handleCloseEditProfile}
        profile={editingProfile}
        groups={groups}
        onUpdateGroup={updateProfileGroup}
        onUpdateFolder={updateProfileFolder}
        onSelectFolder={handleSelectFolder}
        onUpdateChannelIds={updateProfileChannelIds}
        onUpdateSetMusic={updateProfileSetMusic}
        onUpdateAutoIncrementSchedule={updateProfileAutoIncrementSchedule}
        onUpdateScheduleInterval={updateProfileScheduleInterval}
        onUpdateUploadCount={updateProfileUploadCount}
        onUpdateRemoveTitle={updateProfileRemoveTitle}
        onUpdateNeedContentCheck={updateProfileNeedContentCheck}
        musicSearchTerm={editingProfileId ? (musicSearchTerms[editingProfileId] || '') : ''}
        onUpdateMusicSearchTerm={handleUpdateMusicSearchTerm}
      />

      <CookieModal
        open={Boolean(cookieModalProfileId)}
        onClose={closeCookieModal}
        profile={profiles.find((p) => p.id === cookieModalProfileId)}
        onSaveCookies={handleSaveProfileCookies}
        onCaptureFromBrowser={handleCaptureCookiesFromBrowser}
        onLogout={handleLogoutProfile}
      />
    </section>
  );
};

export default ProfilesView;
