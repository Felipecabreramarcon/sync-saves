import { useState, useEffect } from 'react';
import { Modal, Button } from '@heroui/react';
import { Settings, Save } from 'lucide-react';
import { isTauriRuntime } from '@/lib/utils';
import {
  type Game,
  type GamePlatform,
  useGamesStore,
} from '@/stores/gamesStore';
import { updateGame as tauriUpdateGame } from '@/lib/tauri-games';
import { toast } from '@/stores/toastStore';
import { GeneralTab, VersionsTab, AnalysisConfigTab } from './tabs';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
}

type TabType = 'general' | 'versions' | 'analysis';

/**
 * Modal for managing game settings, version history, and analysis configuration.
 * Refactored to use extracted tab components for better maintainability.
 */
export default function GameSettingsModal({
  isOpen,
  onClose,
  game,
}: GameSettingsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General tab state
  const [name, setName] = useState(game.name);
  const [localPath, setLocalPath] = useState(game.local_path);
  const [platform, setPlatform] = useState<GamePlatform>(game.platform);
  const [syncEnabled, setSyncEnabled] = useState(game.sync_enabled);

  // Analysis tab state
  const [scriptPath, setScriptPath] = useState(game.custom_script_path || '');
  const [targetAnalysisFile, setTargetAnalysisFile] = useState('');
  const [trackedKeys, setTrackedKeys] = useState<Set<string>>(new Set());

  const updateGame = useGamesStore((state) => state.updateGame);

  // Reset state when game changes
  useEffect(() => {
    if (isOpen) {
      setName(game.name);
      setLocalPath(game.local_path);
      setPlatform(game.platform);
      setSyncEnabled(game.sync_enabled);
      setScriptPath(game.custom_script_path || '');

      if (game.analysis_config) {
        setTargetAnalysisFile(game.analysis_config.target_path);
        setTrackedKeys(new Set(game.analysis_config.tracked_keys));
      } else {
        setTargetAnalysisFile('');
        setTrackedKeys(new Set());
      }
    }
  }, [isOpen, game]);

  const handleSave = async () => {
    if (!name || !localPath) {
      toast.error('Validation Error', 'Name and path are required');
      return;
    }

    setIsSaving(true);
    try {
      const gameUpdate = {
        name,
        local_path: localPath,
        platform,
        sync_enabled: syncEnabled,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        custom_script_path: scriptPath,
        analysis_config: {
          target_path: targetAnalysisFile,
          tracked_keys: Array.from(trackedKeys),
        },
      };

      if (isTauriRuntime()) {
        await tauriUpdateGame(game.id, gameUpdate);
      }

      updateGame(game.id, gameUpdate);
      toast.success('Settings Saved', `${name} settings updated`);
      onClose();
    } catch (error) {
      console.error('Failed to save game settings:', error);
      toast.error(
        'Save Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== game.name ||
    localPath !== game.local_path ||
    platform !== game.platform ||
    syncEnabled !== game.sync_enabled ||
    scriptPath !== (game.custom_script_path || '') ||
    targetAnalysisFile !== (game.analysis_config?.target_path || '') ||
    trackedKeys.size !== (game.analysis_config?.tracked_keys.length || 0) ||
    (game.analysis_config &&
      Array.from(trackedKeys).some(
        (k) => !game.analysis_config?.tracked_keys.includes(k)
      ));

  const tabs: { id: TabType; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'versions', label: 'Version History' },
    { id: 'analysis', label: 'Analysis Config' },
  ];

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container>
          <Modal.Dialog className='bg-bg-card border border-white/10 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col'>
            <Modal.CloseTrigger />

            {/* Header */}
            <Modal.Header className='border-b border-white/5 p-6 pb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20'>
                  <Settings className='w-5 h-5 text-primary-400' />
                </div>
                <div>
                  <Modal.Heading className='text-xl font-bold text-white tracking-tight'>
                    {game.name}
                  </Modal.Heading>
                  <p className='text-xs text-gray-500 mt-0.5'>
                    Manage settings and backups
                  </p>
                </div>
              </div>
            </Modal.Header>

            {/* Tab Navigation */}
            <div className='flex items-center px-6 py-3 border-b border-white/5 space-x-6'>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2 text-sm font-medium border-b-2 transition-all duration-200 outline-none focus-visible:text-primary-400 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-400'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <Modal.Body className='p-0 overflow-hidden flex-1'>
              {activeTab === 'general' && (
                <GeneralTab
                  name={name}
                  localPath={localPath}
                  platform={platform}
                  syncEnabled={syncEnabled}
                  onNameChange={setName}
                  onLocalPathChange={setLocalPath}
                  onPlatformChange={setPlatform}
                  onSyncEnabledChange={setSyncEnabled}
                />
              )}

              {activeTab === 'versions' && (
                <VersionsTab
                  cloudGameId={game.cloud_game_id}
                  gameId={game.id}
                  onRestore={onClose}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisConfigTab
                  gameId={game.id}
                  localPath={localPath}
                  scriptPath={scriptPath}
                  targetAnalysisFile={targetAnalysisFile}
                  trackedKeys={trackedKeys}
                  onScriptPathChange={setScriptPath}
                  onTargetFileChange={setTargetAnalysisFile}
                  onTrackedKeysChange={setTrackedKeys}
                />
              )}
            </Modal.Body>

            {/* Footer */}
            <Modal.Footer className='gap-3 px-6 pt-4 border-t border-white/5 bg-bg-card/50'>
              <Button variant='ghost' onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant='primary'
                onPress={handleSave}
                isDisabled={!name || !localPath || isSaving || !hasChanges}
              >
                {isSaving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save size={18} /> Save Changes
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
