import { useState, useEffect } from 'react';
import { Modal, Switch, Tooltip, Label, Button } from '@heroui/react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  Gamepad2,
  Info,
  Plus,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { SaveInput } from '@/components/common/SaveInput';
import { isProtectedPath, isTauriRuntime } from '@/lib/utils';
import {
  pcgwGetSaveLocations,
  // pcgwSearchGames, // Removed as we use Steam for search now or re-use if needed
  // type PcgwSearchResultDto,
  type PcgwSavePathDto,
} from '@/lib/tauri-pcgw';
import { steamSearchGames, type SteamSearchResultDto } from '@/lib/tauri-steam';
// Removed downshift import
// Since we don't have downshift interacting with HeroUI might be tricky.
// We'll implement a custom "SearchableSelect" using HeroUI or raw div.
// Actually, let's use a custom implementation with simple state since HeroUI doesn't have a dedicated async combobox in this version yet?
// If it does, we'd use it. For now, let's build a simple dropdown.

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (game: {
    name: string;
    path: string;
    autoSync: boolean;
    coverUrl?: string;
  }) => void;
}

export default function AddGameModal({
  isOpen,
  onClose,
  onAdd,
}: AddGameModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGamePath, setNewGamePath] = useState('');
  const [isFolder, setIsFolder] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  // Steam Search State
  const [steamQuery, setSteamQuery] = useState('');
  const [steamResults, setSteamResults] = useState<SteamSearchResultDto[]>([]);
  const [isSearchingSteam, setIsSearchingSteam] = useState(false);
  const [showSteamDropdown, setShowSteamDropdown] = useState(false);

  // PCGW State
  const [pcgwIsLoadingPaths, setPcgwIsLoadingPaths] = useState(false);
  const [pcgwError, setPcgwError] = useState<string | null>(null);
  const [pcgwSelectedTitle, setPcgwSelectedTitle] = useState<string>('');
  const [pcgwPaths, setPcgwPaths] = useState<PcgwSavePathDto[]>([]);
  const [pcgwCoverUrl, setPcgwCoverUrl] = useState<string | undefined>(
    undefined
  );

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (steamQuery.trim().length < 2) {
        setSteamResults([]);
        return;
      }

      setIsSearchingSteam(true);
      try {
        console.log('Searching Steam for:', steamQuery);
        const results = await steamSearchGames(steamQuery);
        console.log('Steam results:', results);
        setSteamResults(results);
        setShowSteamDropdown(true);
      } catch (e) {
        console.error('Steam search error', e);
      } finally {
        setIsSearchingSteam(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [steamQuery]);

  const selectSteamGame = async (game: SteamSearchResultDto) => {
    setNewGameName(game.name);
    setSteamQuery(game.name); // Keep the input in sync
    setShowSteamDropdown(false);

    // Set Cover
    setPcgwCoverUrl(game.cover_url);

    // Trigger PCGW Search automatically
    handlePcgwSelectGame(game.name, game.cover_url); // Pass cover in case PCGW overrides or fails
  };

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: isFolder,
        multiple: false,
        title: isFolder ? 'Select Game Save Folder' : 'Select Game Save File',
        filters: isFolder
          ? undefined
          : [{ name: 'Game Save', extensions: ['*'] }],
      });

      if (selected) {
        setNewGamePath(selected as string);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  const handleAdd = async () => {
    if (!newGameName || !newGamePath) return;

    setIsAdding(true);
    try {
      await onAdd({
        name: newGameName,
        path: newGamePath,
        autoSync,
        coverUrl: pcgwCoverUrl || undefined,
      });
      // Reset form
      setNewGameName('');
      setNewGamePath('');
      setAutoSync(true);

      setPcgwError(null);
      // setPcgwResults([]);
      setPcgwSelectedTitle('');
      setPcgwPaths([]);
      setPcgwCoverUrl(undefined);
    } catch (error) {
      console.error('Failed to add game:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Removed handlePcgwSearch manual trigger since it's automatic now via Steam selection

  const handlePcgwSelectGame = async (
    title: string,
    fallbackCover?: string
  ) => {
    if (!isTauriRuntime()) return;
    if (!title) return;

    setPcgwSelectedTitle(title);
    setPcgwError(null);
    setPcgwIsLoadingPaths(true);
    setPcgwPaths([]);
    try {
      const res = await pcgwGetSaveLocations(title);
      setPcgwPaths(res.paths);
      // Prefer PCGW cover if found (usually high quality too), else keep Steam cover
      if (res.cover_url) {
        setPcgwCoverUrl(res.cover_url);
      } else if (fallbackCover) {
        setPcgwCoverUrl(fallbackCover);
      }
      // Pre-fill name if it matches roughly? Or keep user input?
      // Maybe update the name to the official title?
      setNewGameName(res.title);
      if (res.paths.length === 0) {
        setPcgwError(
          'PCGamingWiki page found, but no Windows save paths were detected.'
        );
      }
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
          ? e
          : 'Failed to load save locations.';
      setPcgwError(message);
    } finally {
      setPcgwIsLoadingPaths(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container>
          <Modal.Dialog className='bg-bg-card border border-white/10 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto'>
            <Modal.CloseTrigger />
            <Modal.Header className='border-b border-white/5 p-6'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20'>
                  <Gamepad2 className='w-5 h-5 text-primary-400' />
                </div>
                <Modal.Heading className='text-xl font-bold text-white tracking-tight'>
                  Add New Game
                </Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className='p-6'>
              <div className='space-y-6'>
                <div className='space-y-1.5 flex flex-col relative'>
                  <Label className='text-sm text-gray-400 font-medium ml-1'>
                    Game Title
                  </Label>
                  <div className='relative'>
                    <SaveInput
                      placeholder='Start typing to search Steam...'
                      value={steamQuery}
                      onChange={(e) => {
                        setSteamQuery(e.target.value);
                        setNewGameName(e.target.value); // Allow custom names too
                        if (!showSteamDropdown) setShowSteamDropdown(true);
                      }}
                      onFocus={() => {
                        if (steamResults.length > 0) setShowSteamDropdown(true);
                      }}
                      // OnBlur handling is tricky with clicks, usually done via click outside listener or timeout
                      onBlur={() =>
                        setTimeout(() => setShowSteamDropdown(false), 200)
                      }
                    />
                    {isSearchingSteam && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        <div className='w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin' />
                      </div>
                    )}
                  </div>

                  {/* Steam Dropdown Results */}
                  {/* Steam Dropdown Results */}
                  {showSteamDropdown && steamResults.length > 0 && (
                    <div className='absolute z-50 top-full left-0 right-0 mt-2 bg-bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden flex flex-col divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-100'>
                      <div className='sticky top-0 bg-bg-card/95 backdrop-blur-xl px-3 py-2 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider z-10'>
                        Steam Results
                      </div>
                      {steamResults.map((game) => (
                        <button
                          key={game.id}
                          className='flex items-start gap-3 p-3 hover:bg-white/5 transition-all text-left w-full group'
                          onClick={() => selectSteamGame(game)}
                        >
                          <div className='w-12 h-16 bg-black/50 rounded-md shrink-0 overflow-hidden shadow-lg border border-white/5 group-hover:border-primary-500/30 transition-colors'>
                            {game.cover_url ? (
                              <img
                                src={game.cover_url}
                                alt=''
                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                              />
                            ) : (
                              <div className='w-full h-full flex items-center justify-center text-[8px] text-gray-500'>
                                ?
                              </div>
                            )}
                          </div>
                          <div className='min-w-0 flex-1 py-1'>
                            <p className='text-sm text-gray-200 font-medium truncate group-hover:text-primary-400 transition-colors'>
                              {game.name}
                            </p>
                            {game.price && (
                              <p className='text-[11px] text-gray-500 mt-0.5'>
                                {game.price}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-sm text-gray-400 font-medium'>
                      Save Location ({isFolder ? 'Folder' : 'File'})
                    </Label>
                    <div className='flex items-center gap-2'>
                      <div className='flex items-center gap-1.5 bg-bg-elevated/30 p-0.5 rounded-lg border border-white/5'>
                        <Button
                          onPress={() => setIsFolder(true)}
                          size='sm'
                          className={`px-2 h-6 min-w-0 text-[10px] rounded-md transition-all ${
                            isFolder
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <FolderOpen size={12} className='mr-1' /> Folder
                        </Button>
                        <Button
                          onPress={() => setIsFolder(false)}
                          size='sm'
                          className={`px-2 h-6 min-w-0 text-[10px] rounded-md transition-all ${
                            !isFolder
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <FileText size={12} className='mr-1' /> File
                        </Button>
                      </div>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Info className='w-3.5 h-3.5 text-gray-600 cursor-help' />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          Select whether the game uses a folder or a single file
                          for saves.
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <SaveInput
                      placeholder='C:\Users\...\Saved Games'
                      value={newGamePath}
                      onChange={(e) => setNewGamePath(e.target.value)}
                      readOnly
                      className='flex-1'
                    />
                    <Button
                      onPress={handleSelectPath}
                      className='bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center'
                    >
                      {isFolder ? (
                        <FolderOpen className='w-5 h-5' />
                      ) : (
                        <FileText className='w-5 h-5' />
                      )}
                    </Button>
                  </div>

                  {pcgwError && (
                    <div className='mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-2'>
                      <AlertTriangle className='w-4 h-4 text-warning-500 shrink-0 mt-0.5' />
                      <p className='text-[11px] text-warning-200 leading-relaxed break-all'>
                        {pcgwError}
                      </p>
                    </div>
                  )}

                  {/* Removed PCGW Results Dropdown - Automated via Steam selection */}

                  {pcgwSelectedTitle && (
                    <div className='mt-6 grid grid-cols-[auto_1fr] gap-6 p-4 rounded-xl bg-bg-elevated/20 border border-white/5'>
                      {pcgwCoverUrl && (
                        <div className='shrink-0'>
                          <div className='w-24 h-36 rounded-lg overflow-hidden shadow-lg border border-white/10 bg-black/50 relative group'>
                            <img
                              src={pcgwCoverUrl}
                              alt='Cover'
                              className='w-full h-full object-cover'
                            />
                            <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
                          </div>
                        </div>
                      )}
                      <div className='flex-1 space-y-3'>
                        <div className='flex items-center justify-between border-b border-white/5 pb-2'>
                          <Label className='text-xs text-gray-400 font-medium uppercase tracking-wider'>
                            Recommended Paths
                          </Label>
                          <span className='text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20'>
                            PCGamingWiki
                          </span>
                        </div>

                        {pcgwIsLoadingPaths ? (
                          <div className='flex items-center gap-2 text-gray-500 py-2'>
                            <div className='w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin' />
                            <p className='text-xs font-medium'>
                              Fetching save locations...
                            </p>
                          </div>
                        ) : pcgwPaths.length > 0 ? (
                          <div className='grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar'>
                            {pcgwPaths.slice(0, 8).map((p, idx) => {
                              const value = (p.expanded || p.raw) ?? '';
                              const caption = p.expanded ? p.raw : undefined;
                              return (
                                <Button
                                  key={`${p.os}-${idx}-${p.raw}`}
                                  variant='ghost'
                                  onPress={() => setNewGamePath(value)}
                                  className='justify-start text-left h-auto py-2.5 px-3 bg-bg-card hover:bg-white/5 border border-white/5 hover:border-primary-500/30 rounded-lg group transition-all'
                                >
                                  <div className='flex flex-col items-start gap-1 w-full'>
                                    <span className='text-xs text-gray-300 font-mono break-all group-hover:text-primary-300 transition-colors'>
                                      {value}
                                    </span>
                                    {caption && (
                                      <span className='text-[10px] text-gray-600 break-all'>
                                        {caption}
                                      </span>
                                    )}
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className='text-xs text-gray-500 italic py-2'>
                            No paths found.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {newGamePath && isProtectedPath(newGamePath) && (
                    <div className='mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3'>
                      <AlertTriangle className='w-4 h-4 text-warning-500 shrink-0 mt-0.5' />
                      <p className='text-[11px] text-warning-200 leading-relaxed'>
                        This path appears to be a protected system folder.
                        Syncing might fail due to permission restrictions.
                      </p>
                    </div>
                  )}
                </div>

                <div className='p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <p className='text-sm font-semibold text-white'>
                      Enable Auto-Sync
                    </p>
                    <p className='text-[11px] text-gray-500 font-medium'>
                      Automatically backup saves on change
                    </p>
                  </div>
                  <Switch
                    isSelected={autoSync}
                    onChange={setAutoSync}
                    size='sm'
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className='gap-3 px-6 pt-4 border-t border-white/5'>
              <Button variant='ghost' onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant='primary'
                onPress={handleAdd}
                isDisabled={!newGameName || !newGamePath || isAdding}
              >
                {isAdding ? (
                  'Adding...'
                ) : (
                  <>
                    <Plus size={18} /> Add Game
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
