import FolderSelectOverlay from './components/FolderSelectOverlay';
import GroupsView from './components/GroupsView';
import ProfilesView from './components/ProfilesView';
import SettingsView from './components/SettingsView';
import Sidebar from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import useProfiles from './hooks/useProfiles';
import useTheme from './hooks/useTheme';

// Top-level layout: sidebar + active tab view. All state & data logic lives in
// the useProfiles hook; this component only composes presentational views.
const App = () => {
  const ui = useProfiles();
  const { theme, toggleTheme } = useTheme();
  const { activeTab } = ui;

  return (
    <div className="app-container">
      <ToastContainer theme={theme} />
      <div className="app-layout">
        <Sidebar
          activeTab={activeTab}
          onTabChange={ui.setActiveTab}
          profilesCount={ui.profiles?.length || 0}
          maxConcurrency={ui.config?.maxConcurrency || 2}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="content-area">
          {activeTab === 'profiles' ? (
            <ProfilesView {...ui} />
          ) : activeTab === 'groups' ? (
            <GroupsView
              groups={ui.groups}
              newGroupName={ui.newGroupName}
              setNewGroupName={ui.setNewGroupName}
              addGroup={ui.addGroup}
              editingGroupId={ui.editingGroupId}
              setEditingGroupId={ui.setEditingGroupId}
              editingGroupValue={ui.editingGroupValue}
              setEditingGroupValue={ui.setEditingGroupValue}
              updateGroupName={ui.updateGroupName}
              updateGroup={ui.updateGroup}
              deleteGroup={ui.deleteGroup}
              setMessage={ui.setMessage}
            />
          ) : (
            <SettingsView
              config={ui.config}
              setConfig={ui.setConfig}
              updateConfig={ui.updateConfig}
              isSaving={ui.isSavingConfig}
              onSelectFolder={ui.handleSelectFolderForDefaultConfig}
              setMessage={ui.setMessage}
            />
          )}
        </main>
      </div>

      {/* Folder Selection Loading Overlay */}
      <FolderSelectOverlay visible={ui.isSelectingFolder} />
    </div>
  );
};

export default App;
