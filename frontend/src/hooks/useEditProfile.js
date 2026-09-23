import { useCallback, useMemo, useState } from 'react';

/**
 * Hook for managing the single profile edit modal state.
 */
export const useEditProfile = ({ profiles = [], setMusicSearchTerms } = {}) => {
  const [editingProfileId, setEditingProfileId] = useState(null);

  const editingProfile = useMemo(() => {
    return editingProfileId
      ? profiles.find((p) => p.id === editingProfileId) || null
      : null;
  }, [editingProfileId, profiles]);

  const handleEditProfile = useCallback(
    (profileId) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile?.music_search && typeof setMusicSearchTerms === 'function') {
        setMusicSearchTerms((prev) => ({
          ...prev,
          [profileId]: profile.music_search,
        }));
      }
      setEditingProfileId(profileId);
    },
    [profiles, setMusicSearchTerms],
  );

  const handleCloseEditProfile = useCallback(() => {
    setEditingProfileId(null);
  }, []);

  return {
    editingProfileId,
    editingProfile,
    handleEditProfile,
    handleCloseEditProfile,
  };
};

export default useEditProfile;
