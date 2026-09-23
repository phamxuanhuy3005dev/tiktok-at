import { Play, RefreshCw, RotateCcw, Search, Trash2, X } from 'lucide-react';
import React from 'react';

const ProfilesActionBar = React.memo(
  ({
    groups = [],
    groupFilter = 'all',
    setGroupFilter,
    searchQuery = '',
    setSearchQuery,
    resetFilters,
    filteredProfiles = [],
    allFilteredSelected = false,
    toggleSelectAllFiltered,
    hasSelection = false,
    selectedForRun = new Set(),
    deleteSelectedProfiles,
    isLoading = false,
    startAutomation,
  }) => {
    const isFiltered = groupFilter !== 'all' || searchQuery.trim() !== '';

    return (
      <>
        <div
          className="dash-filter"
          style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}
        >
          {/* Search input */}
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Tìm theo tên profile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <label className="field-label">
            <select
              className="input input-compact"
              style={{ minWidth: '160px' }}
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="all">Tất cả nhóm</option>
              <option value="ungrouped">Chưa phân nhóm</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.profile_count ?? 0})
                </option>
              ))}
            </select>
          </label>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              type="button"
              className="btn-reset-filter"
              onClick={resetFilters}
              title="Đưa bộ lọc nhóm và tìm kiếm về mặc định"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}

          {/* Select All Checkbox */}
          {filteredProfiles.length > 0 && (
            <label
              className="field-label"
              style={{ cursor: 'pointer', marginLeft: 'auto' }}
            >
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="checkbox"
              />
              Chọn tất cả ({filteredProfiles.length})
            </label>
          )}
        </div>

        <div className={`glass bulk-bar${hasSelection ? ' is-active' : ''}`}>
          <div className={`selection-count${hasSelection ? ' is-active' : ''}`}>
            {hasSelection
              ? `${selectedForRun.size} đã chọn`
              : 'Chưa chọn profile'}
          </div>

          <span className="toolbar-divider" aria-hidden="true" />

          <button
            type="button"
            className="btn-delete-bulk"
            onClick={() => deleteSelectedProfiles(selectedForRun)}
            disabled={!hasSelection}
            title={
              hasSelection
                ? `Xóa ${selectedForRun.size} profile đã chọn`
                : 'Chọn checkbox trên từng profile cần xóa'
            }
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>Xóa đã chọn</span>
          </button>

          <button
            type="button"
            className="btn-run"
            onClick={() => startAutomation()}
            disabled={isLoading || !hasSelection}
            title={
              hasSelection
                ? undefined
                : 'Chọn checkbox trên từng profile cần upload'
            }
          >
            {isLoading ? (
              <RefreshCw
                className="animate-spin"
                size={15}
                aria-hidden="true"
              />
            ) : (
              <Play fill="white" size={14} aria-hidden="true" />
            )}
            Chạy đã chọn
          </button>
        </div>
      </>
    );
  },
);

export default ProfilesActionBar;
