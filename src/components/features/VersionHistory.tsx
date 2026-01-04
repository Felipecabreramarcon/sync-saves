import { useState, useEffect, useMemo } from 'react';
import {
  CloudSaveVersion,
  fetchGameVersions,
  formatBytes,
  downloadVersionBlob,
} from '@/lib/cloudSync';
import { createWrapperScript, flattenObject } from '@/lib/script-utils';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useGamesStore } from '@/stores/gamesStore';
import { Button, Select, ListBox } from '@heroui/react';
import {
  Clock,
  Download,
  HardDrive,
  Monitor,
  Loader2,
  FileCode,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from '@/stores/toastStore';
import { formatDistanceToNow } from 'date-fns';
import { isTauriRuntime } from '@/lib/utils';

import { motion, AnimatePresence } from 'framer-motion';

interface VersionHistoryProps {
  cloudGameId?: string;
  gameId: string;
  onRestore?: () => void;
}

export default function VersionHistory({
  cloudGameId,
  gameId,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<CloudSaveVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'uploaded' | 'modified'>(
    'uploaded'
  );

  // Timeline Analysis State
  const [analysisData, setAnalysisData] = useState<Record<string, any>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const { user } = useAuthStore();
  const { performRestore } = useSyncStore();
  const game = useGamesStore((state) =>
    state.games.find((g) => g.id === gameId)
  );

  useEffect(() => {
    if (!cloudGameId || !user) return;

    setLoading(true);
    fetchGameVersions(cloudGameId)
      .then((fetchedVersions) => {
        setVersions(fetchedVersions);
      })
      .catch((err) => {
        console.error('Failed to fetch versions:', err);
        toast.error('Error', 'Failed to load version history');
      })
      .finally(() => setLoading(false));
  }, [cloudGameId, user]);

  const analyzeVersion = async (version: CloudSaveVersion) => {
    if (!game?.custom_script_path || !game?.analysis_config) {
      toast.error('Configuration Error', 'Missing analysis script or config');
      return;
    }

    const scriptPath = game.custom_script_path;
    const config = game.analysis_config;

    setAnalyzingIds((prev) => new Set(prev).add(version.id));

    try {
      let extractedData: any = null;

      if (isTauriRuntime()) {
        const { writeFile, remove, mkdir, readFile, readDir, exists } =
          await import('@tauri-apps/plugin-fs');
        const { appDataDir, join } = await import('@tauri-apps/api/path');
        const { Command } = await import('@tauri-apps/plugin-shell');

        const appData = await appDataDir();
        const tempDir = await join(appData, 'temp_timeline');
        await mkdir(tempDir, { recursive: true });

        // Ensure wrapper exists
        const wrapperPath = await createWrapperScript(scriptPath, gameId);

        try {
          const blob = await downloadVersionBlob(version.file_path);
          if (!blob) throw new Error('Failed to download blob');

          // Aggressive sanitization
          const safeTargetName = config.target_path.replace(
            /[^a-zA-Z0-9.-]/g,
            '_'
          );
          let tempFilePath = await join(
            tempDir,
            `v_${version.id}_${safeTargetName}.zip`
          );

          await writeFile(tempFilePath, new Uint8Array(blob));

          // ZIP Detection & Extraction checking header signature
          const u8Header = new Uint8Array(blob as ArrayBuffer).slice(0, 4);
          const isZip =
            blob.byteLength > 4 &&
            u8Header[0] === 0x50 &&
            u8Header[1] === 0x4b &&
            u8Header[2] === 0x03 &&
            u8Header[3] === 0x04;

          if (isZip) {
            console.log('[Analysis] ZIP header detected. Extracting...');
            const unzipScriptPath = await join(tempDir, 'unzip.ps1');
            const unzipScript = `
param($ZipPath)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Dest = "\${ZipPath}_extracted"
Write-Host "Extracting $ZipPath to $Dest"
if (!(Test-Path $ZipPath)) { Write-Error "Zip file not found"; exit 1 }
Expand-Archive -LiteralPath $ZipPath -DestinationPath $Dest -Force -ErrorAction Stop
Write-Host "Extraction complete. Contents:"
Get-ChildItem -Recurse $Dest | Select-Object FullName
`;
            await writeFile(
              unzipScriptPath,
              new TextEncoder().encode(unzipScript)
            );

            const unzipCmd = Command.create('run-powershell', [
              '-ExecutionPolicy',
              'Bypass',
              '-File',
              unzipScriptPath,
              tempFilePath,
            ]);
            const unzipOutput = await unzipCmd.execute();
            console.log('[Analysis] Unzip Output:', unzipOutput.stdout);
            if (unzipOutput.code !== 0) {
              console.error('[Analysis] Unzip failed:', unzipOutput.stderr);
              throw new Error('Failed to extract save file');
            }

            // Update path to point to the inner file
            const extractedDir = `${tempFilePath}_extracted`;
            tempFilePath = await join(extractedDir, config.target_path);

            if (!(await exists(tempFilePath))) {
              console.warn(
                '[Analysis] Exact target path not found, searching recursively...'
              );
              // Helper to find file recursively
              const findFile = async (
                dir: string,
                filename: string
              ): Promise<string | null> => {
                try {
                  const entries = await readDir(dir);
                  for (const entry of entries) {
                    if (entry.isFile && entry.name === filename) {
                      return await join(dir, entry.name);
                    }
                    if (entry.isDirectory) {
                      const found = await findFile(
                        await join(dir, entry.name),
                        filename
                      );
                      if (found) return found;
                    }
                  }
                } catch (err) {
                  console.warn('Scan ignore', err);
                }
                return null;
              };

              const targetBasename =
                config.target_path.split(/[/\\]/).pop() || config.target_path;
              const foundPath = await findFile(extractedDir, targetBasename);

              if (foundPath) {
                console.log(`[Analysis] Found file at: ${foundPath}`);
                tempFilePath = foundPath;
              } else {
                console.error(
                  `[Analysis] Could not find ${targetBasename} in extracted archive.`
                );
              }
            }
          }

          const command = Command.create('run-powershell', [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            wrapperPath,
            tempFilePath,
          ]);

          const output = await command.execute();

          if (output.code === 0) {
            const match = output.stdout.match(
              /Decoded JSON written to:\s*(.+?)\s*$/m
            );
            if (match && match[1]) {
              const jsonPath = match[1].trim();
              const fileContent = await readFile(jsonPath);
              const textDecoder = new TextDecoder();
              const jsonData = JSON.parse(textDecoder.decode(fileContent));

              // Flatten and extract only tracked keys
              const flattened = flattenObject(jsonData);
              const extracted: any = {};
              config.tracked_keys.forEach((key) => {
                if (flattened[key] !== undefined) {
                  extracted[key] = flattened[key];
                }
              });
              extractedData = extracted;
              await remove(jsonPath);
            }
          } else {
            console.warn(
              `Analysis failed with code ${output.code}`,
              output.stderr
            );
            toast.error(
              'Analysis Failed',
              `Script exited with code ${output.code}`
            );
          }
          try {
            await remove(tempFilePath);
          } catch (cleanupErr) {
            console.warn('[Analysis] Failed to cleanup temp file:', cleanupErr);
          }
        } catch (e) {
          console.error(`Analysis exception for v${version.id}`, e);
          throw e;
        }
      } else {
        // Web Mock
        await new Promise((r) => setTimeout(r, 1500));
        const mock: any = {};
        config.tracked_keys.forEach(
          (k) => (mock[k] = Math.floor(Math.random() * 100))
        );
        extractedData = mock;
      }

      if (extractedData) {
        setAnalysisData((prev) => ({
          ...prev,
          [version.id]: extractedData,
        }));
      }
    } catch (err) {
      console.error('Timeline Analysis Failed', err);
      toast.error('Analysis Error', 'Failed to analyze save version');
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(version.id);
        return next;
      });
    }
  };
  const handleRestore = async (version: CloudSaveVersion) => {
    if (!cloudGameId) return;

    // Confirm restore
    if (
      !confirm(
        `Are you sure you want to restore the save from ${new Date(
          version.created_at
        ).toLocaleString()}? This will overwrite your current local save.`
      )
    ) {
      return;
    }

    setRestoringId(version.id);
    try {
      await performRestore(gameId, { filePath: version.file_path });
      if (onRestore) onRestore();
    } catch (err: any) {
      console.error('Failed to restore version:', err);
      toast.error('Error', 'Failed to restore save version');
    } finally {
      setRestoringId(null);
    }
  };

  if (!cloudGameId) {
    return (
      <div className='p-12 text-center text-gray-500 flex flex-col items-center justify-center h-full'>
        <div className='w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4'>
          <Clock className='w-8 h-8 text-gray-600' />
        </div>
        <p className='text-lg font-medium text-gray-400'>No Sync History</p>
        <p className='text-sm'>
          This game hasn't been synced to the cloud yet.
        </p>
      </div>
    );
  }

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      if (sortOrder === 'uploaded') {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        const dateA = a.file_modified_at
          ? new Date(a.file_modified_at).getTime()
          : 0;
        const dateB = b.file_modified_at
          ? new Date(b.file_modified_at).getTime()
          : 0;
        return dateB - dateA;
      }
    });
  }, [versions, sortOrder]);

  const latestUploadedId = useMemo(() => {
    if (versions.length === 0) return null;
    return [...versions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]?.id;
  }, [versions]);

  if (loading && versions.length === 0) {
    return (
      <div className='p-8 flex justify-center items-center h-64'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-8 h-8 text-primary-500 animate-spin' />
          <span className='text-sm text-gray-500'>Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className='p-12 text-center flex flex-col items-center justify-center h-full'>
        <div className='w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5'>
          <Clock className='w-8 h-8 text-gray-500' />
        </div>
        <p className='text-gray-300 font-medium text-lg'>
          No versions available
        </p>
        <p className='text-xs text-gray-500 mt-2 max-w-xs'>
          Upload a save to start building your version history timeline.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Fixed Compact Header */}
      <div className='flex-none border-b border-white/5 py-4 px-6 z-10'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center'>
              <Clock className='w-4 h-4 text-primary-400' />
            </div>
            <div>
              <h3 className='text-xs font-black text-white uppercase tracking-wider'>
                History
              </h3>
              <p className='text-[10px] text-gray-500 font-bold'>
                {versions.length} SNAPSHOTS
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Select
              aria-label='Sort'
              selectedKey={sortOrder}
              placeholder='Sort by'
              onSelectionChange={(k) =>
                k && setSortOrder(k as 'uploaded' | 'modified')
              }
              className='w-32'
            >
              <Select.Trigger className='h-7 bg-white/5 hover:bg-white/10 border-none rounded-md px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all'>
                <div className='flex items-center gap-2'>
                  <SlidersHorizontal className='size-4 text-primary-500/50' />
                  <Select.Value className='text-[10px]' />
                </div>
              </Select.Trigger>
              <Select.Popover
                className={'bg-[#1a1a1a] border border-white/10 rounded-xl'}
              >
                <ListBox className=' p-1 shadow-2xl'>
                  <ListBox.Item
                    id='uploaded'
                    textValue='Sync Date'
                    className='rounded-lg'
                  >
                    <span className='text-[11px] font-bold'>Sync Date</span>
                  </ListBox.Item>
                  <ListBox.Item
                    id='modified'
                    textValue='File Date'
                    className='rounded-lg'
                  >
                    <span className='text-[11px] font-bold'>File Date</span>
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>

      {/* Scrollable Timeline Area */}
      <div className='flex-1 overflow-y-auto px-6 py-6 custom-scrollbar'>
        <div className='relative space-y-4'>
          {/* Continuous Timeline Line */}
          <div className='absolute left-5 top-0 bottom-0 w-px bg-linear-to-b from-primary-500/30 via-primary-500/5 to-transparent pointer-events-none' />

          <AnimatePresence>
            {sortedVersions.map((version, index) => (
              <VersionCard
                key={version.id}
                version={version}
                isLatestUpload={version.id === latestUploadedId}
                restoringId={restoringId}
                onRestore={handleRestore}
                game={game}
                analyzeVersion={analyzeVersion}
                analysisData={analysisData[version.id]}
                isAnalyzing={analyzingIds.has(version.id)}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual version card to keep main clean
const VersionCard = ({
  version,
  isLatestUpload,
  restoringId,
  onRestore,
  game,
  analyzeVersion,
  analysisData,
  isAnalyzing,
  index,
}: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className='group relative rounded-2xl bg-[#1a1a1a]/40 backdrop-blur-sm border border-white/5 hover:border-primary-500/30 transition-all duration-300 overflow-hidden shadow-lg'
    >
      {/* Timeline Dot Indicator */}
      <div className='absolute left-4 top-6 w-2 h-2 rounded-full bg-[#121212] border-2 border-primary-500 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] z-20 group-hover:scale-125 group-hover:bg-primary-500 transition-all duration-300' />

      <div className='pl-9 pr-3 py-3 flex flex-col gap-2'>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-0.5'>
              <span className='text-xs font-bold text-white'>
                {formatDistanceToNow(new Date(version.created_at), {
                  addSuffix: true,
                })}
              </span>
              {isLatestUpload && (
                <span className='px-1 py-0.5 rounded-sm bg-primary-500/10 text-primary-400 text-[8px] font-black uppercase tracking-tighter'>
                  Latest
                </span>
              )}
            </div>

            <div className='flex items-center gap-3 text-[10px] text-gray-500 font-medium'>
              <div className='flex items-center gap-1'>
                <HardDrive className='w-3 h-3 text-gray-600' />
                <span>{formatBytes(version.file_size)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Monitor className='w-3 h-3 text-gray-600' />
                <span className='truncate max-w-[60px]'>
                  {version.device_name || 'PC'}
                </span>
              </div>
            </div>

            <div className='flex gap-3 mt-1.5 opacity-60'>
              <div className='flex items-center gap-1 text-[9px] text-gray-500'>
                <Clock className='w-2.5 h-2.5 text-primary-500/40' />
                <span>
                  Sync: {new Date(version.created_at).toLocaleDateString()}
                </span>
              </div>
              {version.file_modified_at && (
                <div className='flex items-center gap-1 text-[9px] text-gray-500'>
                  <HardDrive className='w-2.5 h-2.5 text-emerald-500/40' />
                  <span>
                    File:{' '}
                    {new Date(version.file_modified_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            size='sm'
            variant='ghost'
            isIconOnly
            isDisabled={restoringId !== null}
            onPress={() => onRestore(version)}
            className='h-8 w-8 min-w-8 bg-white/5 hover:bg-primary-500/20 text-white hover:text-primary-400 rounded-lg transition-all'
          >
            {restoringId === version.id ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Download className='w-3.5 h-3.5' />
            )}
          </Button>
        </div>

        {game?.analysis_config && (
          <div className='pt-2 border-t border-white/5'>
            <AnimatePresence mode='wait'>
              {analysisData ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className='grid grid-cols-4 gap-1.5'
                >
                  {game.analysis_config.tracked_keys.map((key: string) => (
                    <div
                      key={key}
                      className='flex flex-col bg-white/3 rounded-md px-1.5 py-1 border border-white/5 overflow-hidden'
                    >
                      <span className='text-[7px] text-gray-500 uppercase font-black truncate'>
                        {key.split('.').pop()}
                      </span>
                      <span className='text-[10px] text-primary-100 font-mono font-bold truncate tracking-tighter'>
                        {String(analysisData[key] ?? '-')}
                      </span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div className='flex items-center justify-between'>
                  <span className='text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5'>
                    <FileCode className='w-2.5 h-2.5' /> Analysis
                  </span>
                  {isAnalyzing ? (
                    <Loader2 className='w-3 h-3 text-primary-500 animate-spin' />
                  ) : (
                    <Button
                      size='sm'
                      onPress={() => analyzeVersion(version)}
                      className='h-5 min-h-0 px-2 text-[9px] font-black uppercase bg-primary-500/10 text-primary-400 border-none'
                    >
                      Analyze
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};
