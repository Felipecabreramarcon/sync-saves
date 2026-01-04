import { useState, useRef } from 'react';
import { Tooltip, Label, Button } from '@heroui/react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  Info,
  Terminal,
  Play,
  FileCode,
  Loader2,
  Search,
} from 'lucide-react';
import { SaveInput } from '@/components/common/SaveInput';
import { isTauriRuntime } from '@/lib/utils';
import { createWrapperScript, flattenObject } from '@/lib/script-utils';
import { toast } from '@/stores/toastStore';

interface AnalysisConfigTabProps {
  gameId: string;
  localPath: string;
  scriptPath: string;
  targetAnalysisFile: string;
  trackedKeys: Set<string>;
  onScriptPathChange: (value: string) => void;
  onTargetFileChange: (value: string) => void;
  onTrackedKeysChange: (keys: Set<string>) => void;
}

/**
 * Analysis configuration tab for game save file analysis.
 */
export function AnalysisConfigTab({
  gameId,
  localPath,
  scriptPath,
  targetAnalysisFile,
  trackedKeys,
  onScriptPathChange,
  onTargetFileChange,
  onTrackedKeysChange,
}: AnalysisConfigTabProps) {
  const [scriptOutput, setScriptOutput] = useState('');
  const [discoveredProperties, setDiscoveredProperties] = useState<Record<
    string,
    any
  > | null>(null);
  const [configSearchQuery, setConfigSearchQuery] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTrackedKey = (key: string) => {
    const newSet = new Set(trackedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    onTrackedKeysChange(newSet);
  };

  const handleDiscoverProperties = async () => {
    if (!scriptPath || !localPath || !isTauriRuntime()) return;

    setIsDiscovering(true);
    setScriptOutput('DISCOVERING PROPERTIES...\n');

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const { join } = await import('@tauri-apps/api/path');
      const { remove, readFile } = await import('@tauri-apps/plugin-fs');

      // Resolve Target File (Local)
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

      // Create Wrapper
      const wrapperPath = await createWrapperScript(scriptPath, gameId);

      // Execute
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (isTauriRuntime()) {
      try {
        const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
        const { appDataDir, join } = await import('@tauri-apps/api/path');

        const appData = await appDataDir();
        const scriptsDir = await join(appData, 'scripts', gameId);
        await mkdir(scriptsDir, { recursive: true });

        const filename = file.name;
        const destPath = await join(scriptsDir, filename);

        const buffer = await file.arrayBuffer();
        await writeFile(destPath, new Uint8Array(buffer));

        onScriptPathChange(destPath);
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
      onScriptPathChange(`C:\\Fake\\Path\\${file.name}`);
      toast.success("Script 'Uploaded'", 'Simulated upload in web mode');
    }
  };

  const handleSelectTargetFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Select Target File',
        defaultPath: localPath || undefined,
      });

      if (selected && typeof selected === 'string') {
        if (localPath) {
          const normSelected = selected.replace(/\\/g, '/');
          const normLocal = localPath.replace(/\\/g, '/');

          if (normSelected.startsWith(normLocal)) {
            let relative = normSelected.substring(normLocal.length);
            if (relative.startsWith('/')) relative = relative.substring(1);
            onTargetFileChange(relative);
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
  };

  // Combine discovered keys + already tracked keys for display
  const displayProperties: Record<string, any> = discoveredProperties || {};
  Array.from(trackedKeys).forEach((k) => {
    if (!(k in displayProperties)) {
      displayProperties[k] = '(Saved)';
    }
  });

  return (
    <div className='p-6 overflow-y-auto h-[50vh]'>
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
                Upload a Python (.py) or PowerShell (.ps1) script to analyze
                save files.
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
                onChange={(e) => onScriptPathChange(e.target.value)}
                className='pl-9 grow'
              />
            </div>
            <Button
              onPress={() => fileInputRef.current?.click()}
              className='bg-white/5 border border-white/10 text-white min-w-10 px-3 rounded-xl hover:bg-white/10'
            >
              Import
            </Button>
          </div>
        </div>

        {/* Target File Input */}
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
                The specific file to analyze, relative to the Save Folder (e.g.
                SaveData.json)
              </Tooltip.Content>
            </Tooltip>
          </div>
          <div className='flex gap-2'>
            <SaveInput
              placeholder='e.g. PlayerProfile.json'
              value={targetAnalysisFile}
              onChange={(e) => onTargetFileChange(e.target.value)}
              className='flex-1'
            />
            <Button
              onPress={handleSelectTargetFile}
              className='bg-primary-900/30 text-primary-400 border border-primary-500/20 h-10 w-10 min-w-10 rounded-xl hover:bg-primary-900/50 transition-colors flex items-center justify-center'
            >
              <FolderOpen className='w-4 h-4' />
            </Button>
          </div>
          <p className='text-[10px] text-gray-500'>
            Leave empty if the script handles folder logic itself, otherwise
            select the specific file.
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
                      onChange={(e) => setConfigSearchQuery(e.target.value)}
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
    </div>
  );
}
