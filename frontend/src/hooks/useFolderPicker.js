import { useState, useCallback } from 'react';
import axios from 'axios';

export const useFolderPicker = ({ updateProfileFolder, setNewProfileVideoFolder } = {}) => {
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  const selectFolderPath = useCallback(async () => {
    try {
      const res = await axios.post('/api/select-folder');
      return res.data?.path || null;
    } catch (err) {
      console.error('Folder selection cancelled or failed');
      return null;
    }
  }, []);

  const handleSelectFolder = useCallback(async (id) => {
    setIsSelectingFolder(true);
    try {
      const selectedPath = await selectFolderPath();
      if (selectedPath && typeof updateProfileFolder === 'function') {
        await updateProfileFolder(id, selectedPath);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  }, [selectFolderPath, updateProfileFolder]);

  const handleSelectFolderForCreateProfile = useCallback(async () => {
    setIsSelectingFolder(true);
    try {
      const selectedPath = await selectFolderPath();
      if (selectedPath && typeof setNewProfileVideoFolder === 'function') {
        setNewProfileVideoFolder(selectedPath);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  }, [selectFolderPath, setNewProfileVideoFolder]);

  const handleSelectFolderForConfig = useCallback(async (onSelect) => {
    setIsSelectingFolder(true);
    try {
      const selectedPath = await selectFolderPath();
      if (selectedPath && typeof onSelect === 'function') {
        onSelect(selectedPath);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  }, [selectFolderPath]);

  return {
    isSelectingFolder,
    setIsSelectingFolder,
    selectFolderPath,
    handleSelectFolder,
    handleSelectFolderForCreateProfile,
    handleSelectFolderForConfig
  };
};

export default useFolderPicker;
