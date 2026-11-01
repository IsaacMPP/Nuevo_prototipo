// JA Proyecciones 2 does not consume FreeShow releases. Own update channel pending.
interface UpdateData { latestVersion: string; changelog: string; hasUpdate: boolean }
export async function getUpdateData(_currentVersion: string, _includeBeta: boolean): Promise<UpdateData> { return { latestVersion: "", changelog: "", hasUpdate: false } }
export function checkForUpdates(_currentVersion: string): void { /* Deliberately disabled until JA releases are configured. */ }
