import React from 'react';
import {
  Play,
  RefreshCw,
  Trash2
} from 'lucide-react';

const ProfilesActionBar = ({
  groups = [],
  groupFilter = 'all',
  setGroupFilter,
  filteredProfiles = [],
  allFilteredSelected = false,
  toggleSelectAllFiltered,
  hasSelection = false,
  selectedForRun = new Set(),
  deleteSelectedProfiles,
  isLoading = false,
  startAutomation
}) => {
  return (
    <>
      <div className="dash-filter">
        <label className="field-label">
          Nhóm
          <select
            className="input input-compact"
            style={{ minWidth: '180px' }}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">Tất cả nhóm</option>
            <option value="ungrouped">Chưa phân nhóm</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
        {filteredProfiles.length > 0 && (
          <label className="field-label" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="checkbox"
            />
            Chọn tất cả
          </label>
        )}
      </div>

      <div className={`glass bulk-bar${hasSelection ? ' is-active' : ''}`}>
        <div className={`selection-count${hasSelection ? ' is-active' : ''}`}>
          {hasSelection ? `${selectedForRun.size} đã chọn` : 'Chưa chọn profile'}
        </div>

        <span className="toolbar-divider" aria-hidden="true" />

        <button
          type="button"
          className="btn-delete-bulk"
          onClick={() => deleteSelectedProfiles(selectedForRun)}
          disabled={!hasSelection}
          title={hasSelection ? `Xóa ${selectedForRun.size} profile đã chọn` : 'Tick checkbox trên từng profile cần xóa'}
        >
          <Trash2 size={15} aria-hidden="true" />
          <span>Xóa đã chọn</span>
        </button>

        <button
          type="button"
          className="btn-run"
          onClick={() => startAutomation()}
          disabled={isLoading || !hasSelection}
          title={hasSelection ? undefined : 'Tick checkbox trên từng profile cần upload'}
        >
          {isLoading ? (
            <RefreshCw className="animate-spin" size={15} aria-hidden="true" />
          ) : (
            <Play fill="white" size={14} aria-hidden="true" />
          )}
          Chạy đã chọn
        </button>
      </div>
    </>
  );
};

export default ProfilesActionBar;
