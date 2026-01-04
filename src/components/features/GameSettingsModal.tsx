import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Switch,
  Tooltip,
  Label,
  Button,
  Select,
  ListBox,
} from '@heroui/react';
import VersionHistory from '@/components/features/VersionHistory';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  Settings,
  Info,
  Save,
  AlertTriangle,
  Terminal,
  Play,
  FileCode,
  Loader2,
  Search,
} from 'lucide-react';
import { SaveInput } from '@/components/common/SaveInput';
import { isProtectedPath, isTauriRuntime } from '@/lib/utils';
import { createWrapperScript, flattenObject } from '@/lib/script-utils';
import {
  type Game,
  type GamePlatform,
  useGamesStore,
} from '@/stores/gamesStore';
import { updateGame as tauriUpdateGame } from '@/lib/tauri-games';
import { toast } from '@/stores/toastStore';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
}

const platforms: { value: GamePlatform; label: string }[] = [
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic Games' },
  { value: 'gog', label: 'GOG' },
  { value: 'other', label: 'Other' },
];

export default function GameSettingsModal({
  isOpen,
  onClose,
  game,
}: GameSettingsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(game.name);
  const [localPath, setLocalPath] = useState(game.local_path);
  const [platform, setPlatform] = useState<GamePlatform>(game.platform);
  const [syncEnabled, setSyncEnabled] = useState(game.sync_enabled);
  const [scriptPath, setScriptPath] = useState(game.custom_script_path || '');
  const [activeTab, setActiveTab] = useState<
    'general' | 'versions' | 'analysis'
  >('general');
  const [scriptOutput, setScriptOutput] = useState<string>('');

  // Analysis Config State
  const [targetAnalysisFile, setTargetAnalysisFile] = useState('');
  const [discoveredProperties, setDiscoveredProperties] = useState<Record<
    string,
    any
  > | null>(null);
  const [trackedKeys, setTrackedKeys] = useState<Set<string>>(new Set());
  const [configSearchQuery, setConfigSearchQuery] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  const updateGame = useGamesStore((state) => state.updateGame);

  // Reset state when game changes
  useEffect(() => {
    if (isOpen) {
      setName(game.name);
      setLocalPath(game.local_path);
      setPlatform(game.platform);
      setSyncEnabled(game.sync_enabled);
      setScriptPath(game.custom_script_path || '');
      setScriptOutput('');

      // Load Analysis Config
      if (game.analysis_config) {
        setTargetAnalysisFile(game.analysis_config.target_path);
        setTrackedKeys(new Set(game.analysis_config.tracked_keys));
      } else {
        setTargetAnalysisFile('');
        setTrackedKeys(new Set());
      }
      setDiscoveredProperties(null);
      setIsDiscovering(false);
      setConfigSearchQuery('');
    }
  }, [isOpen, game]);

  const toggleTrackedKey = (key: string) => {
    const newSet = new Set(trackedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setTrackedKeys(newSet);
  };

  const handleDiscoverProperties = async () => {
    if (!scriptPath || !localPath || !isTauriRuntime()) return;

    setIsDiscovering(true);
    setScriptOutput('DISCOVERING PROPERTIES...\n');

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const { join } = await import('@tauri-apps/api/path');
      const { remove, readFile } = await import('@tauri-apps/plugin-fs');

      // 1. Resolve Target File (Local)
      let fullTargetLocalPath = localPath;
      if (targetAnalysisFile) {
        try {
          fullTargetLocalPath = await join(localPath, targetAnalysisFile);
        } catch (err) {
          setScriptOutput(
            (prev) => prev + `[Error] Invalid target path: ${err}\n`
          );
          setIsDiscovering(false);
          return;
        }
      } else {
        setScriptOutput(
          (prev) =>
            prev +
            '[Error] Please specify a Target File (relative path) to analyze.\n'
        );
        toast.error(
          'Target Missing',
          'Please specify a target file (e.g. SaveData.json)'
        );
        setIsDiscovering(false);
        return;
      }

      setScriptOutput((prev) => prev + `Target: ${fullTargetLocalPath}\n`);

      // 2. Create Wrapper
      const wrapperPath = await createWrapperScript(scriptPath, game.id);

      // 3. Execute
      const command = Command.create('run-powershell', [
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        wrapperPath,
        fullTargetLocalPath,
      ]);

      const output = await command.execute();

      if (output.stdout)
        setScriptOutput((prev) => `${prev}\n[STDOUT]:\n${output.stdout}`);
      if (output.stderr)
        setScriptOutput((prev) => `${prev}\n[STDERR]:\n${output.stderr}`);

      if (output.code === 0) {
        // Parse Output
        const match = output.stdout.match(
          /Decoded JSON written to:\s*(.+?)\s*$/m
        );
        if (match && match[1]) {
          const jsonPath = match[1].trim();
          const fileContent = await readFile(jsonPath);
          const textDecoder = new TextDecoder();
          const jsonData = JSON.parse(textDecoder.decode(fileContent));

          const flattened = flattenObject(jsonData);
          setDiscoveredProperties(flattened);

          try {
            await remove(jsonPath);
          } catch {}
          setScriptOutput(
            (prev) => prev + '\n[Success] Properties Discovered.'
          );
        } else {
          setScriptOutput(
            (prev) =>
              prev +
              "\n[Warning] No JSON output found. Ensure script prints 'Decoded JSON written to: ...'"
          );
        }
      } else {
        setScriptOutput(
          (prev) => prev + `\n[Error] Script exited with code ${output.code}`
        );
      }
    } catch (error: any) {
      console.error('Discovery Failed', error);
      setScriptOutput((prev) => prev + `\n[Error] ${error.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Game Save Folder',
        defaultPath: localPath || undefined,
      });

      if (selected) {
        setLocalPath(selected as string);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (isTauriRuntime()) {
      try {
        const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
        const { appDataDir, join } = await import('@tauri-apps/api/path');

        const appData = await appDataDir();
        const scriptsDir = await join(appData, 'scripts', game.id);
        await mkdir(scriptsDir, { recursive: true });

        const filename = file.name;
        const destPath = await join(scriptsDir, filename);

        const buffer = await file.arrayBuffer();
        await writeFile(destPath, new Uint8Array(buffer));

        setScriptPath(destPath);
        toast.success('Script Imported', 'File uploaded successfully');
      } catch (fsError: any) {
        console.error('Upload Error Details:', fsError);
        toast.error(
          'Upload Failed',
          typeof fsError === 'object'
            ? JSON.stringify(fsError)
            : String(fsError)
        );
      }
    } else {
      setScriptPath(`C:\\Fake\\Path\\${file.name}`);
      toast.success("Script 'Uploaded'", 'Simulated upload in web mode');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!name || !localPath) {
      toast.error('Validation Error', 'Name and path are required');
      return;
    }

    setIsSaving(true);
    try {
      if (isTauriRuntime()) {
        await tauriUpdateGame(game.id, {
          name,
          local_path: localPath,
          platform,
          sync_enabled: syncEnabled,
          custom_script_path: scriptPath,
          analysis_config: {
            target_path: targetAnalysisFile,
            tracked_keys: Array.from(trackedKeys),
          },
        });
      }

      // Update local store with ALL config
      updateGame(game.id, {
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
      });

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

  // Combine discovered keys + already tracked keys for display
  const displayProperties: Record<string, any> = discoveredProperties || {};
  // If we have tracked keys but no discovery result yet, show them as active items (maybe with '?' value)
  Array.from(trackedKeys).forEach((k) => {
    if (!(k in displayProperties)) {
      displayProperties[k] = '(Saved)';
    }
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container>
          <Modal.Dialog className='bg-bg-card border border-white/10 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col'>
            <Modal.CloseTrigger />
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

            <div className='flex items-center px-6 py-3 border-b border-white/5 space-x-6'>
              <button
                onClick={() => setActiveTab('general')}
                className={` px-2 text-sm font-medium border-b-2 transition-all duration-200 outline-none focus-visible:text-primary-400 ${
                  activeTab === 'general'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={` px-2 text-sm font-medium border-b-2 transition-all duration-200 outline-none focus-visible:text-primary-400 ${
                  activeTab === 'versions'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                Version History
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={` px-2 text-sm font-medium border-b-2 transition-all duration-200 outline-none focus-visible:text-primary-400 ${
                  activeTab === 'analysis'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                Analysis Config
              </button>
            </div>

            {activeTab === 'general' && (
              <Modal.Body className='p-6 overflow-y-auto'>
                <div className='space-y-6'>
                  {/* Game Name */}
                  <div className='space-y-1.5 flex flex-col'>
                    <Label className='text-sm text-gray-400 font-medium ml-1'>
                      Game Title
                    </Label>
                    <SaveInput
                      placeholder='e.g. Elden Ring'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Save Folder */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-sm text-gray-400 font-medium'>
                        Save Folder Location
                      </Label>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Info className='w-3.5 h-3.5 text-gray-600 cursor-help' />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          The directory where the game stores its save files
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                    <div className='flex gap-2'>
                      <SaveInput
                        placeholder='C:\Users\...\Saved Games'
                        value={localPath}
                        onChange={(e) => setLocalPath(e.target.value)}
                        readOnly
                        className='flex-1'
                      />
                      <Button
                        onPress={handleSelectFolder}
                        className='bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center'
                      >
                        <FolderOpen className='w-5 h-5' />
                      </Button>
                    </div>
                    {localPath && isProtectedPath(localPath) && (
                      <div className='mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3'>
                        <AlertTriangle className='w-4 h-4 text-warning-500 shrink-0 mt-0.5' />
                        <p className='text-[11px] text-warning-200 leading-relaxed'>
                          This path appears to be a protected system folder.
                          Syncing might fail due to permission restrictions.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Platform */}
                  <div className='space-y-1.5'>
                    <Label className='text-sm text-gray-400 font-medium ml-1'>
                      Platform
                    </Label>
                    <Select
                      aria-label='Platform Source'
                      selectedKey={platform}
                      onSelectionChange={(key) =>
                        setPlatform(key as GamePlatform)
                      }
                    >
                      <Select.Trigger className='w-full  bg-bg-elevated border border-white/10 rounded-xl px-4 text-white hover:border-primary-500/50 transition-colors'>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {platforms.map((p) => (
                            <ListBox.Item
                              key={p.value}
                              id={p.value}
                              textValue={p.label}
                            >
                              {p.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className='p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <p className='text-sm font-semibold text-white'>
                        Auto-Sync Enabled
                      </p>
                      <p className='text-[11px] text-gray-500 font-medium'>
                        Automatically backup saves when changes are detected
                      </p>
                    </div>
                    <Switch
                      aria-label='Toggle Auto-Sync'
                      isSelected={syncEnabled}
                      onChange={setSyncEnabled}
                      size='sm'
                    >
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch>
                  </div>
                </div>
              </Modal.Body>
            )}

            {activeTab === 'versions' && (
              <Modal.Body className='p-0 overflow-hidden h-[60vh]'>
                <VersionHistory
                  cloudGameId={game.cloud_game_id}
                  gameId={game.id}
                  onRestore={onClose}
                />
              </Modal.Body>
            )}

            {activeTab === 'analysis' && (
              <Modal.Body className='p-6 overflow-y-auto h-[60vh]'>
                <div className='space-y-6'>
                  {/* Custom Script Input */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-sm text-gray-400 font-medium'>
                        Analysis Script
                      </Label>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Info className='w-3.5 h-3.5 text-gray-600 cursor-help' />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          Upload a Python (.py) or PowerShell (.ps1) script to
                          analyze save files.
                        </Tooltip.Content>
                      </Tooltip>
                    </div>

                    <div className='flex gap-2'>
                      <input
                        type='file'
                        ref={fileInputRef}
                        className='hidden'
                        accept='.ps1,.bat,.cmd,.py,.sh'
                        onChange={handleFileSelect}
                      />
                      <div className='relative flex flex-1'>
                        <FileCode className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                        <SaveInput
                          placeholder='Import a script...'
                          value={scriptPath}
                          onChange={(e) => setScriptPath(e.target.value)}
                          className='pl-9 grow'
                        />
                      </div>
                      <Button
                        onPress={triggerFileUpload}
                        className='bg-white/5 border border-white/10 text-white min-w-10 px-3 rounded-xl hover:bg-white/10'
                      >
                        Import
                      </Button>
                    </div>
                  </div>

                  {/* Target File Input (Relative to Save Path) */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-sm text-gray-400 font-medium'>
                        Target File (Relative)
                      </Label>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Info className='w-3.5 h-3.5 text-gray-600 cursor-help' />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          The specific file to analyze, relative to the Save
                          Folder (e.g. SaveData.json)
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                    <div className='flex gap-2'>
                      <SaveInput
                        placeholder='e.g. PlayerProfile.json'
                        value={targetAnalysisFile}
                        onChange={(e) => setTargetAnalysisFile(e.target.value)}
                        className='flex-1'
                      />
                      <Button
                        onPress={async () => {
                          try {
                            const selected = await open({
                              multiple: false,
                              title: 'Select Target File',
                              defaultPath: localPath || undefined,
                            });

                            if (selected && typeof selected === 'string') {
                              let relative = selected;
                              if (localPath) {
                                // Normalize paths to forward slashes for comparison
                                const normSelected = selected.replace(
                                  /\\/g,
                                  '/'
                                );
                                const normLocal = localPath.replace(/\\/g, '/');

                                if (normSelected.startsWith(normLocal)) {
                                  relative = normSelected.substring(
                                    normLocal.length
                                  );
                                  if (relative.startsWith('/'))
                                    relative = relative.substring(1);
                                  setTargetAnalysisFile(relative);
                                  return;
                                }
                              }

                              toast.error(
                                'File Outside Save Folder',
                                'Please select a file inside the save folder.'
                              );
                            }
                          } catch (err) {
                            console.error('Failed to select file', err);
                          }
                        }}
                        className='bg-primary-900/30 text-primary-400 border border-primary-500/20 h-10 w-10 min-w-10 rounded-xl hover:bg-primary-900/50 transition-colors flex items-center justify-center'
                      >
                        <FolderOpen className='w-4 h-4' />
                      </Button>
                    </div>
                    <p className='text-[10px] text-gray-500'>
                      Leave empty if the script handles folder logic itself,
                      otherwise select the specific file.
                    </p>
                  </div>

                  {scriptPath && (
                    <div className='space-y-4'>
                      <Button
                        onPress={handleDiscoverProperties}
                        isDisabled={isDiscovering}
                        className='w-full bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20 h-10'
                      >
                        {isDiscovering ? (
                          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        ) : (
                          <Play className='w-4 h-4 mr-2' />
                        )}
                        Discover Properties
                      </Button>

                      {/* Discovered Properties Selection */}
                      {(discoveredProperties || trackedKeys.size > 0) && (
                        <div className='space-y-4 border-t border-white/5 pt-4'>
                          <div className='flex items-center justify-between pb-2 mb-2'>
                            <div className='flex items-center gap-2 text-green-400'>
                              <FileCode className='w-4 h-4' />
                              <span className='font-semibold text-sm'>
                                Select Properties to Track
                              </span>
                            </div>
                            <div className='relative w-48'>
                              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500' />
                              <input
                                type='text'
                                placeholder='Filter...'
                                value={configSearchQuery}
                                onChange={(e) =>
                                  setConfigSearchQuery(e.target.value)
                                }
                                className='w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500/30 transition-colors'
                              />
                            </div>
                          </div>

                          <div className='grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1'>
                            {Object.entries(displayProperties)
                              .filter(([key]) =>
                                key
                                  .toLowerCase()
                                  .includes(configSearchQuery.toLowerCase())
                              )
                              .map(([key, value]) => (
                                <div
                                  key={key}
                                  className='flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg bg-bg-elevated/40 border border-white/5'
                                >
                                  <div className='flex truncate items-center gap-3'>
                                    <input
                                      type='checkbox'
                                      className='w-4 h-4 rounded border-gray-600 bg-black/20 text-primary-500 focus:ring-primary-500/50'
                                      checked={trackedKeys.has(key)}
                                      onChange={() => toggleTrackedKey(key)}
                                      id={`prop-${key}`}
                                    />
                                    <label
                                      htmlFor={`prop-${key}`}
                                      title={key}
                                      className='text-gray-400 text-xs truncate uppercase tracking-wider font-semibold cursor-pointer select-none'
                                    >
                                      {key}
                                    </label>
                                  </div>
                                  <span
                                    title={
                                      typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value)
                                    }
                                    className='text-white font-mono text-sm truncate text-right mt-1 sm:mt-0 opacity-60'
                                  >
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Console Log */}
                      {scriptOutput && (
                        <div className='mt-4'>
                          <details className='group'>
                            <summary className='flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors select-none'>
                              <Terminal className='w-3 h-3' />
                              <span>Debug Console Output</span>
                            </summary>
                            <div className='mt-2 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto'>
                              {scriptOutput}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Modal.Body>
            )}

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
