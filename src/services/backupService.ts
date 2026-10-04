import { AutoBackupConfig, BackupSnapshot } from '../types';

const SNAPSHOTS_KEY = 'farm_feed_auto_snapshots';
const CONFIG_KEY = 'farm_feed_auto_backup_config';
const DEFAULT_MAX_SNAPSHOTS = 7;

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  frequency: 'daily',
  maxSnapshots: DEFAULT_MAX_SNAPSHOTS,
  autoDownloadFile: false,
};

/**
 * Retrieve user's auto-backup configuration from local storage
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTO_BACKUP_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_AUTO_BACKUP_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUTO_BACKUP_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_AUTO_BACKUP_CONFIG;
  }
}

/**
 * Persist user's auto-backup configuration
 */
export function saveAutoBackupConfig(config: AutoBackupConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save auto backup config:', e);
  }
}

/**
 * Get all stored snapshots (ordered newest to oldest)
 */
export function getBackupSnapshots(): BackupSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Auto-repair any snapshot whose summary was recorded with 0s due to key mismatch
    let changed = false;
    const repaired = list.map((snap) => {
      if (snap && snap.data) {
        const b = Array.isArray(snap.data['farm_feed_barns_v2'])
          ? snap.data['farm_feed_barns_v2']
          : Array.isArray(snap.data['farm_feed_barns'])
          ? snap.data['farm_feed_barns']
          : [];

        const rm = Array.isArray(snap.data['farm_feed_raw_materials_v2'])
          ? snap.data['farm_feed_raw_materials_v2']
          : Array.isArray(snap.data['farm_feed_raw_materials'])
          ? snap.data['farm_feed_raw_materials']
          : [];

        const r = Array.isArray(snap.data['farm_feed_rations_v2'])
          ? snap.data['farm_feed_rations_v2']
          : Array.isArray(snap.data['farm_feed_rations'])
          ? snap.data['farm_feed_rations']
          : [];

        const c = Array.isArray(snap.data['farm_feed_categories_v2'])
          ? snap.data['farm_feed_categories_v2']
          : Array.isArray(snap.data['farm_feed_categories'])
          ? snap.data['farm_feed_categories']
          : [];

        const m = Array.isArray(snap.data['farm_feed_mixers_v2'])
          ? snap.data['farm_feed_mixers_v2']
          : Array.isArray(snap.data['farm_feed_mixers'])
          ? snap.data['farm_feed_mixers']
          : [];

        if (
          !snap.summary ||
          (snap.summary.barnsCount === 0 && b.length > 0) ||
          (snap.summary.rawMaterialsCount === 0 && rm.length > 0)
        ) {
          changed = true;
          return {
            ...snap,
            summary: {
              barnsCount: b.length,
              rawMaterialsCount: rm.length,
              rationsCount: r.length,
              categoriesCount: c.length,
              mixersCount: m.length,
            },
          };
        }
      }
      return snap;
    });

    if (changed) {
      saveBackupSnapshots(repaired);
    }
    return repaired;
  } catch {
    return [];
  }
}

/**
 * Save snapshots list to storage
 */
function saveBackupSnapshots(snapshots: BackupSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to save backup snapshots:', e);
  }
}

/**
 * Collect all farm feed data excluding the snapshots container itself
 */
export function collectSystemBackupData(): {
  data: Record<string, any>;
  summary: BackupSnapshot['summary'];
  sizeKb: number;
} {
  const data: Record<string, any> = {};
  if (typeof window === 'undefined') {
    return {
      data,
      summary: { barnsCount: 0, rawMaterialsCount: 0, rationsCount: 0, categoriesCount: 0, mixersCount: 0 },
      sizeKb: 0,
    };
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('farm_feed_') && key !== SNAPSHOTS_KEY) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try {
          data[key] = JSON.parse(val);
        } catch {
          data[key] = val;
        }
      }
    }
  }

  // Calculate summary counts using versioned and unversioned keys
  const barns = Array.isArray(data['farm_feed_barns_v2'])
    ? data['farm_feed_barns_v2']
    : Array.isArray(data['farm_feed_barns'])
    ? data['farm_feed_barns']
    : [];

  const rawMaterials = Array.isArray(data['farm_feed_raw_materials_v2'])
    ? data['farm_feed_raw_materials_v2']
    : Array.isArray(data['farm_feed_raw_materials'])
    ? data['farm_feed_raw_materials']
    : [];

  const rations = Array.isArray(data['farm_feed_rations_v2'])
    ? data['farm_feed_rations_v2']
    : Array.isArray(data['farm_feed_rations'])
    ? data['farm_feed_rations']
    : [];

  const categories = Array.isArray(data['farm_feed_categories_v2'])
    ? data['farm_feed_categories_v2']
    : Array.isArray(data['farm_feed_categories'])
    ? data['farm_feed_categories']
    : [];

  const mixers = Array.isArray(data['farm_feed_mixers_v2'])
    ? data['farm_feed_mixers_v2']
    : Array.isArray(data['farm_feed_mixers'])
    ? data['farm_feed_mixers']
    : [];

  const jsonString = JSON.stringify(data);
  const sizeKb = Math.round((new Blob([jsonString]).size / 1024) * 10) / 10;

  return {
    data,
    summary: {
      barnsCount: barns.length,
      rawMaterialsCount: rawMaterials.length,
      rationsCount: rations.length,
      categoriesCount: categories.length,
      mixersCount: mixers.length,
    },
    sizeKb,
  };
}

/**
 * Format a timestamp into user friendly local string
 */
function formatDateFormatted(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Create a new backup snapshot and update rolling history
 */
export function createBackupSnapshot(
  label?: string,
  forceDownload = false
): BackupSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const config = getAutoBackupConfig();
    const max = config.maxSnapshots || DEFAULT_MAX_SNAPSHOTS;
    const { data, summary, sizeKb } = collectSystemBackupData();

    const now = new Date();
    const snapshot: BackupSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      dateFormatted: formatDateFormatted(now),
      label: label || (config.enabled ? 'النسخ الدوري التلقائي' : 'نقطة استعادة يدوية'),
      dataSizeKb: sizeKb,
      summary,
      data,
    };

    const currentList = getBackupSnapshots();
    // Add to front, keep max
    const updatedList = [snapshot, ...currentList].slice(0, max);
    saveBackupSnapshots(updatedList);

    // Update config with last backup time
    config.lastBackupTimestamp = now.toISOString();
    saveAutoBackupConfig(config);

    if (forceDownload || config.autoDownloadFile) {
      downloadSnapshotAsFile(snapshot);
    }

    return snapshot;
  } catch (err) {
    console.error('Failed to create backup snapshot:', err);
    return null;
  }
}

/**
 * Restore system state from a specific snapshot
 */
export function restoreBackupSnapshot(snapshotId: string): boolean {
  if (typeof window === 'undefined') return false;

  const snapshots = getBackupSnapshots();
  const target = snapshots.find((s) => s.id === snapshotId);
  if (!target || !target.data) return false;

  try {
    const farmKeys = Object.keys(target.data);
    farmKeys.forEach((key) => {
      const val = target.data[key];
      if (typeof val === 'string') {
        localStorage.setItem(key, val);
      } else {
        localStorage.setItem(key, JSON.stringify(val));
      }
    });
    return true;
  } catch (e) {
    console.error('Failed to restore backup snapshot:', e);
    return false;
  }
}

/**
 * Delete a specific snapshot from history
 */
export function deleteBackupSnapshot(snapshotId: string): void {
  if (typeof window === 'undefined') return;
  const snapshots = getBackupSnapshots();
  const filtered = snapshots.filter((s) => s.id !== snapshotId);
  saveBackupSnapshots(filtered);
}

/**
 * Download a snapshot directly as a .json file to the user's downloads folder
 */
export function downloadSnapshotAsFile(
  snapshot: BackupSnapshot,
  isEn?: boolean
): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(snapshot.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const datePart = snapshot.dateFormatted.replace(/[: ]/g, '_');
    a.download = isEn
      ? `farm_backup_${datePart}.json`
      : `نسخة_احتياطية_مزرعة_${datePart}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to download snapshot file:', e);
  }
}

/**
 * Export all current data directly as a backup .json file
 */
export function exportAllDataAsBackupFile(isEn = false): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { data } = collectSystemBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = isEn
      ? `cattle_farm_backup_${dateStr}.json`
      : `نسخة_احتياطية_مزرعة_الماشية_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Failed to export backup file:', e);
    return false;
  }
}

/**
 * Check if auto-backup is due based on schedule and run it if necessary
 */
export function checkAndTriggerAutoBackup(): {
  ran: boolean;
  snapshot?: BackupSnapshot;
} {
  if (typeof window === 'undefined') return { ran: false };

  try {
    const config = getAutoBackupConfig();
    if (!config.enabled) return { ran: false };

    const lastTime = config.lastBackupTimestamp
      ? new Date(config.lastBackupTimestamp).getTime()
      : 0;
    const nowTime = Date.now();
    const elapsedMs = nowTime - lastTime;

    let isDue = false;

    if (!lastTime) {
      isDue = true;
    } else if (config.frequency === 'every_12_hours') {
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      isDue = elapsedMs >= TWELVE_HOURS;
    } else if (config.frequency === 'weekly') {
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      isDue = elapsedMs >= ONE_WEEK;
    } else {
      // Default: daily
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const lastDate = new Date(lastTime).toISOString().split('T')[0];
      const todayDate = new Date(nowTime).toISOString().split('T')[0];
      isDue = elapsedMs >= TWENTY_FOUR_HOURS || lastDate !== todayDate;
    }

    if (isDue) {
      const isEn = localStorage.getItem('farm_system_language') === 'en';
      const label = isEn ? 'Automated Periodic Backup' : 'نسخ احتياطي دوري تلقائي';
      const snap = createBackupSnapshot(label);
      if (snap) {
        return { ran: true, snapshot: snap };
      }
    }
  } catch (e) {
    console.error('Error during auto backup check:', e);
  }

  return { ran: false };
}
