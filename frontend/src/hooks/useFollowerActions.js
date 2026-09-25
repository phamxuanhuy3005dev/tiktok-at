import axios from 'axios';
import { useCallback, useState } from 'react';
import { showToast } from '../utils/toast';

export const useFollowerActions = ({ profiles = [], selectedForRun = new Set() }) => {
  const [followersMap, setFollowersMap] = useState({});
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [followersModalProfiles, setFollowersModalProfiles] = useState([]);

  const handleCheckFollowers = useCallback(
    async (customIds = null) => {
      let ids = [];
      if (Array.isArray(customIds)) {
        ids = customIds;
      } else if (customIds instanceof Set) {
        ids = Array.from(customIds);
      } else if (selectedForRun && selectedForRun.size > 0) {
        ids = Array.from(selectedForRun);
      }

      if (ids.length === 0) {
        showToast.warning('Vui lòng chọn ít nhất 1 profile để xem followers');
        return;
      }

      // Filter profiles matching these ids
      const targetProfiles = profiles.filter((p) => ids.includes(p.id));
      if (targetProfiles.length === 0) {
        showToast.warning('Không tìm thấy profile tương ứng');
        return;
      }

      setFollowersModalProfiles(targetProfiles);
      setIsFollowersModalOpen(true);
      setIsLoadingFollowers(true);

      try {
        const response = await axios.post('/api/profiles/followers', {
          profileIds: ids,
        });

        const results = response.data?.results || [];
        setFollowersMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            next[r.id] = r.followers;
          });
          return next;
        });

        const successCount = results.filter(
          (r) => r.success && r.followers !== null,
        ).length;
        if (successCount > 0) {
          showToast.success(
            `Đã lấy số followers cho ${successCount}/${results.length} profile`,
          );
        } else {
          showToast.info('Không lấy được dữ liệu followers cho các profile đã chọn');
        }
      } catch (err) {
        console.error('Error fetching followers:', err);
        showToast.error(
          err.response?.data?.error || 'Có lỗi xảy ra khi lấy số followers',
        );
      } finally {
        setIsLoadingFollowers(false);
      }
    },
    [profiles, selectedForRun],
  );

  return {
    followersMap,
    isFollowersModalOpen,
    setIsFollowersModalOpen,
    isLoadingFollowers,
    followersModalProfiles,
    handleCheckFollowers,
  };
};
