import { isTauriRuntime } from "@/lib/utils";

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 * e.g. { a: { b: 1 } } -> { "a.b": 1 }
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  return Object.keys(obj).reduce((acc: any, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

/**
 * Creates a PowerShell wrapper script to execute the user's Python or PowerShell script.
 * This ensures output encoding is UTF-8 and handles argument passing.
 */
export const createWrapperScript = async (userScriptPath: string, gameId: string) => {
  if (!isTauriRuntime()) return userScriptPath;

  try {
    const { writeFile, remove, mkdir } = await import('@tauri-apps/plugin-fs');
    const { appDataDir, join } = await import('@tauri-apps/api/path');

    const appData = await appDataDir();
    const scriptsDir = await join(appData, 'scripts', gameId);
    
    // Ensure directory exists
    await mkdir(scriptsDir, { recursive: true });
    
    const wrapperPath = await join(scriptsDir, 'wrapper.ps1');

    // Clean up old wrapper
    try { await remove(wrapperPath); } catch { }

    // Determine execution command based on extension
    let execCommand = '';
    if (userScriptPath.endsWith('.py')) {
      execCommand = `& "python" "${userScriptPath}" $TargetFile`;
    } else if (userScriptPath.endsWith('.ps1')) {
      execCommand = `& "${userScriptPath}" $TargetFile`;
    } else {
      // Fallback for .bat, .cmd, .exe
      execCommand = `& "${userScriptPath}" $TargetFile`;
    }

    const wrapperContent = `
param($TargetFile)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
${execCommand}
`;

    const encoder = new TextEncoder();
    await writeFile(wrapperPath, encoder.encode(wrapperContent));

    return wrapperPath;
  } catch (error) {
    console.error("Failed to create wrapper:", error);
    throw error;
  }
};
