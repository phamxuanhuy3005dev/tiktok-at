import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Manages profile selection for bulk operations.
 */
export const useProfileSelection = (profiles = [], filteredProfiles = []) => {
  const [selectedForRun, setSelectedForRun] = useState(() => new Set());

  // Sync selected set when profiles list changes (remove deleted profiles)
  useEffect(() => {
    const validIds = new Set(profiles.map((p) => p.id));
    setSelectedForRun((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [profiles]);

  const toggleProfileSelectedForRun = useCallback((id) => {
    setSelectedForRun((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allFilteredSelected = useMemo(() => {
    return (
      filteredProfiles.length > 0 &&
      filteredProfiles.every((p) => selectedForRun.has(p.id))
    );
  }, [filteredProfiles, selectedForRun]);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedForRun((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredProfiles.forEach((p) => next.delete(p.id));
      } else {
        filteredProfiles.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredProfiles]);

  return {
    selectedForRun,
    setSelectedForRun,
    toggleProfileSelectedForRun,
    allFilteredSelected,
    toggleSelectAllFiltered
  };
};

export default useProfileSelection;
