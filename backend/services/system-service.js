import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { PROFILES_DIR } from '../db.js';

export function selectFolder() {
    return new Promise((resolve, reject) => {
        let script = '';
        if (process.platform === 'darwin') {
            script = `osascript -e 'tell application (path to frontmost application as text) to POSIX path of (choose folder with prompt "Select Video Folder")'`;
        } else if (process.platform === 'win32') {
            script = `powershell -Command "$app = New-Object -ComObject Shell.Application; $folder = $app.BrowseForFolder(0, 'Select Folder', 64); if ($folder) { $folder.Self.Path }"`;
        } else {
            return reject(new Error('Folder picker not supported on this platform'));
        }

        exec(script, (error, stdout) => {
            if (error) return reject(new Error('Folder selection cancelled or failed'));
            const selectedPath = stdout.trim();
            if (!selectedPath) return reject(new Error('No folder selected'));
            resolve(selectedPath);
        });
    });
}

export function selectImageFile() {
    return new Promise((resolve, reject) => {
        let script = '';
        if (process.platform === 'darwin') {
            script = `osascript -e 'POSIX path of (choose file of type {"public.png","public.jpeg","com.compuserve.gif"} with prompt "Select Avatar Image")'`;
        } else if (process.platform === 'win32') {
            script = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Filter = 'Image Files (*.png;*.jpg;*.jpeg)|*.png;*.jpg;*.jpeg'; $dialog.Title = 'Select Avatar Image'; if ($dialog.ShowDialog() -eq 'OK') { $dialog.FileName }"`;
        } else {
            return reject(new Error('File picker not supported on this platform'));
        }

        exec(script, (error, stdout) => {
            if (error) return reject(new Error('File selection cancelled or failed'));
            const selectedPath = stdout.trim();
            if (!selectedPath) return reject(new Error('No file selected'));
            resolve(selectedPath);
        });
    });
}

export const getDirSize = (dirPath) => {
    let size = 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            try {
                if (entry.isDirectory()) {
                    size += getDirSize(fullPath);
                } else if (entry.isFile()) {
                    size += fs.statSync(fullPath).size;
                }
            } catch (e) { /* skip */ }
        }
    } catch (e) { /* skip */ }
    return size;
};

export const rmWithRetry = (targetPath) => {
    let bytes = 0;
    try {
        bytes = getDirSize(targetPath);
    } catch (e) { /* skip */ }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
            }
            break;
        } catch (e) {
            if (attempt === 2) {
                console.error(`[ClearTrash] Failed to delete ${targetPath}: ${e.message}`);
            }
        }
    }
    return bytes;
};

export const TRASH_DIRS = [
    'Cache', 'Code Cache', 'GPUCache',
    'Service Worker',
    'GraphiteDawnCache', 'DawnWebGPUCache', 'DawnGraphiteCache',
    'ShaderCache', 'GrShaderCache',
    'Session Storage',
    'component_crx_cache', 'extensions_crx_cache',
    'segmentation_platform',
    'shared_proto_db',
    'GCM Store',
    'Site Characteristics Database',
    'Sync Data',
    'Feature Engagement Tracker',
    'Extension State', 'Extension Scripts', 'Extension Rules',
    'Search Logos',
    'VideoDecodeStats',
    'PersistentOriginTrials',
    'parcel_tracking_db',
    'Safe Browsing',
    'NativeMessagingHosts',
    'IndexedDB',
    'blob_storage',
    'BrowserMetrics',
    'Crashpad',
];

export const TRASH_FILES = [
    'TransportSecurity',
    'Network Persistent State',
    'Reporting and NEL',
    'OriginTrials',
    'QuotaManager',
    'QuotaManager-journal',
    'LOCK',
];

export function clearTrashForProfiles(db, profileIds) {
    const results = [];
    let totalFreedBytes = 0;

    for (const profileId of profileIds) {
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);
        if (!profile) {
            results.push({ profileId, profileName: '(unknown)', error: 'Profile not found', freedBytes: 0 });
            continue;
        }

        const profileDir = path.join(PROFILES_DIR, profile.name);
        if (!fs.existsSync(profileDir)) {
            results.push({ profileId, profileName: profile.name, error: 'Profile folder not found', freedBytes: 0 });
            continue;
        }

        let profileFreedBytes = 0;

        for (const trashDir of TRASH_DIRS) {
            const rootPath = path.join(profileDir, trashDir);
            if (fs.existsSync(rootPath)) {
                profileFreedBytes += rmWithRetry(rootPath);
            }
            const defaultPath = path.join(profileDir, 'Default', trashDir);
            if (fs.existsSync(defaultPath)) {
                profileFreedBytes += rmWithRetry(defaultPath);
            }
        }

        for (const trashFile of TRASH_FILES) {
            const filePath = path.join(profileDir, 'Default', trashFile);
            if (fs.existsSync(filePath)) {
                try {
                    const fileSize = fs.statSync(filePath).size;
                    fs.rmSync(filePath, { force: true, maxRetries: 3, retryDelay: 100 });
                    profileFreedBytes += fileSize;
                } catch (e) {
                    console.error(`[ClearTrash] Failed to delete ${filePath}: ${e.message}`);
                }
            }
        }

        totalFreedBytes += profileFreedBytes;
        const freedMB = (profileFreedBytes / (1024 * 1024)).toFixed(1);
        console.log(`[ClearTrash] ${profile.name}: freed ${freedMB} MB`);
        results.push({
            profileId,
            profileName: profile.name,
            freedBytes: profileFreedBytes,
            freedMB: parseFloat(freedMB),
        });
    }

    const totalMB = (totalFreedBytes / (1024 * 1024)).toFixed(1);
    return {
        success: true,
        totalFreedBytes,
        totalFreedMB: parseFloat(totalMB),
        results
    };
}

export function clearDebugFiles(backendDir) {
    let freedBytes = 0;
    const entries = fs.readdirSync(backendDir);
    let deletedFiles = 0;
    for (const entry of entries) {
        if (entry.startsWith('debug_') && entry.endsWith('.png')) {
            const filePath = path.join(backendDir, entry);
            try {
                freedBytes += fs.statSync(filePath).size;
                fs.rmSync(filePath, { force: true });
                deletedFiles++;
            } catch (e) {
                console.error(`[ClearDebug] Failed to delete ${filePath}: ${e.message}`);
            }
        }
    }

    const logPath = path.join(backendDir, 'automation.log');
    let logFreedBytes = 0;
    if (fs.existsSync(logPath)) {
        try {
            logFreedBytes = fs.statSync(logPath).size;
            fs.writeFileSync(logPath, '');
            freedBytes += logFreedBytes;
        } catch (e) {
            console.error(`[ClearDebug] Failed to truncate ${logPath}: ${e.message}`);
        }
    }

    const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);
    return {
        success: true,
        deletedFiles,
        freedBytes,
        freedMB: parseFloat(freedMB),
        logCleared: logFreedBytes > 0
    };
}
