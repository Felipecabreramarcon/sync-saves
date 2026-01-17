/**
 * Confirmation Dialog Utility
 *
 * Uses Tauri's native dialog for confirmations in desktop app,
 * falls back to window.confirm in browser.
 */

import { isTauriRuntime } from './utils';

export interface ConfirmOptions {
  title?: string;
  message: string;
  kind?: 'info' | 'warning' | 'error';
  okLabel?: string;
  cancelLabel?: string;
}

/**
 * Shows a confirmation dialog.
 * Uses native Tauri dialog in desktop app, window.confirm in browser.
 */
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (isTauriRuntime()) {
    try {
      const { confirm } = await import('@tauri-apps/plugin-dialog');
      const result = await confirm(options.message, {
        title: options.title || 'Confirm',
        kind: options.kind || 'warning',
        okLabel: options.okLabel || 'Yes',
        cancelLabel: options.cancelLabel || 'Cancel',
      });
      console.log('[confirmAction] Dialog result:', result);
      return result === true;
    } catch (error) {
      console.error(
        '[confirmAction] Tauri dialog failed, falling back to window.confirm:',
        error
      );
      return window.confirm(options.message);
    }
  }

  // Browser fallback
  return window.confirm(options.message);
}

/**
 * Convenience function for dangerous actions (delete, overwrite, etc.)
 */
export async function confirmDangerousAction(
  message: string,
  title?: string
): Promise<boolean> {
  return confirmAction({
    title: title || 'Confirm Action',
    message,
    kind: 'warning',
    okLabel: 'Yes, proceed',
    cancelLabel: 'Cancel',
  });
}

/**
 * Convenience function for restore operations
 */
export async function confirmRestore(gameName: string): Promise<boolean> {
  return confirmAction({
    title: 'Restore Save',
    message: `Do you want to restore the latest cloud backup for ${gameName}? This will overwrite your current local saves.`,
    kind: 'warning',
    okLabel: 'Restore',
    cancelLabel: 'Cancel',
  });
}

/**
 * Convenience function for delete/remove operations
 */
export async function confirmRemove(gameName: string): Promise<boolean> {
  return confirmAction({
    title: 'Remove Game',
    message: `Are you sure you want to remove "${gameName}" from tracking? This will NOT delete your save files.`,
    kind: 'warning',
    okLabel: 'Remove',
    cancelLabel: 'Cancel',
  });
}
