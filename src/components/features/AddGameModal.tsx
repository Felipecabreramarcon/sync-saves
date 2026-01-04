import { useState } from "react";
import {
  Modal,
  Switch,
  Tooltip,
  Label,
  Button,
  Select,
  ListBox,
} from "@heroui/react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderOpen,
  Gamepad2,
  Info,
  Plus,
  AlertTriangle,
  Search,
  FileText,
} from "lucide-react";
import { SaveInput } from "@/components/common/SaveInput";
import { isProtectedPath, isTauriRuntime } from "@/lib/utils";
import {
  pcgwGetSaveLocations,
  pcgwSearchGames,
  type PcgwSearchResultDto,
  type PcgwSavePathDto,
} from "@/lib/tauri-pcgw";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (game: { name: string; path: string; autoSync: boolean }) => void;
}

export default function AddGameModal({
  isOpen,
  onClose,
  onAdd,
}: AddGameModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGamePath, setNewGamePath] = useState("");
  const [isFolder, setIsFolder] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const [pcgwIsSearching, setPcgwIsSearching] = useState(false);
  const [pcgwIsLoadingPaths, setPcgwIsLoadingPaths] = useState(false);
  const [pcgwError, setPcgwError] = useState<string | null>(null);
  const [pcgwResults, setPcgwResults] = useState<PcgwSearchResultDto[]>([]);
  const [pcgwSelectedTitle, setPcgwSelectedTitle] = useState<string>("");
  const [pcgwPaths, setPcgwPaths] = useState<PcgwSavePathDto[]>([]);

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: isFolder,
        multiple: false,
        title: isFolder ? "Select Game Save Folder" : "Select Game Save File",
        filters: isFolder ? undefined : [{ name: 'Game Save', extensions: ['*'] }]
      });

      if (selected) {
        setNewGamePath(selected as string);
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error);
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
      });
      // Reset form
      setNewGameName("");
      setNewGamePath("");
      setAutoSync(true);

      setPcgwError(null);
      setPcgwResults([]);
      setPcgwSelectedTitle("");
      setPcgwPaths([]);
    } catch (error) {
      console.error("Failed to add game:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handlePcgwSearch = async () => {
    if (!isTauriRuntime()) {
      setPcgwError(
        "PCGamingWiki suggestions are available only in the desktop (Tauri) app."
      );
      return;
    }

    const q = newGameName.trim();
    if (!q) return;

    setPcgwError(null);
    setPcgwIsSearching(true);
    setPcgwSelectedTitle("");
    setPcgwPaths([]);
    try {
      const results = await pcgwSearchGames(q, 8);
      setPcgwResults(results);
      if (results.length === 0) {
        setPcgwError("No matches found on PCGamingWiki.");
      }
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Failed to query PCGamingWiki.";
      setPcgwError(message);
    } finally {
      setPcgwIsSearching(false);
    }
  };

  const handlePcgwSelectGame = async (title: string) => {
    if (!isTauriRuntime()) return;
    if (!title) return;

    setPcgwSelectedTitle(title);
    setPcgwError(null);
    setPcgwIsLoadingPaths(true);
    setPcgwPaths([]);
    try {
      const res = await pcgwGetSaveLocations(title);
      setPcgwPaths(res.paths);
      if (res.paths.length === 0) {
        setPcgwError(
          "PCGamingWiki page found, but no Windows save paths were detected."
        );
      }
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Failed to load save locations.";
      setPcgwError(message);
    } finally {
      setPcgwIsLoadingPaths(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container>
          <Modal.Dialog className="bg-bg-card border border-white/10 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="border-b border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20">
                  <Gamepad2 className="w-5 h-5 text-primary-400" />
                </div>
                <Modal.Heading className="text-xl font-bold text-white tracking-tight">
                  Add New Game
                </Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="p-6">
              <div className="space-y-6">
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-sm text-gray-400 font-medium ml-1">
                    Game Title
                  </Label>
                  <SaveInput
                    placeholder="e.g. Elden Ring"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-400 font-medium">
                      Save Location ({isFolder ? "Folder" : "File"})
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-bg-elevated/30 p-0.5 rounded-lg border border-white/5">
                        <Button
                          onPress={() => setIsFolder(true)}
                          size="sm"
                          className={`px-2 h-6 min-w-0 text-[10px] rounded-md transition-all ${isFolder ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                          <FolderOpen size={12} className="mr-1" /> Folder
                        </Button>
                        <Button
                          onPress={() => setIsFolder(false)}
                          size="sm"
                          className={`px-2 h-6 min-w-0 text-[10px] rounded-md transition-all ${!isFolder ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                          <FileText size={12} className="mr-1" /> File
                        </Button>
                      </div>
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          Select whether the game uses a folder or a single file for saves.
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <SaveInput
                      placeholder="C:\Users\...\Saved Games"
                      value={newGamePath}
                      onChange={(e) => setNewGamePath(e.target.value)}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onPress={handleSelectPath}
                      className="bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center"
                    >
                      {isFolder ? <FolderOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </Button>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-bg-elevated/20 border border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-white">
                          Suggestions (PCGamingWiki)
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Search by the title above and pick a suggested save
                          path
                        </p>
                      </div>
                      <Button
                        onPress={handlePcgwSearch}
                        isDisabled={
                          !newGameName.trim() ||
                          pcgwIsSearching ||
                          !isTauriRuntime()
                        }
                        className="bg-primary-900/30 text-primary-400 border border-primary-500/20 rounded-xl hover:bg-primary-900/50 transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        {pcgwIsSearching ? "Searching..." : "Search"}
                      </Button>
                    </div>

                    {pcgwError && (
                      <p className="mt-2 text-[11px] text-warning-200 leading-relaxed">
                        {pcgwError}
                      </p>
                    )}

                    {pcgwResults.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-[11px] text-gray-400 font-medium ml-1">
                          Game
                        </Label>
                        <Select
                          value={pcgwSelectedTitle}
                          onChange={(key) =>
                            handlePcgwSelectGame(key as string)
                          }
                        >
                          <Select.Trigger className="w-full bg-bg-elevated border border-white/10 rounded-xl px-4 text-white hover:border-primary-500/50 transition-colors">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {pcgwResults.map((r) => (
                                <ListBox.Item
                                  key={r.title}
                                  id={r.title}
                                  textValue={r.title}
                                >
                                  {r.title}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    )}

                    {pcgwSelectedTitle && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-[11px] text-gray-400 font-medium ml-1">
                          Save paths (Windows)
                        </Label>
                        {pcgwIsLoadingPaths ? (
                          <p className="text-[11px] text-gray-500 font-medium">
                            Loading paths...
                          </p>
                        ) : pcgwPaths.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {pcgwPaths.slice(0, 8).map((p, idx) => {
                              const value = (p.expanded || p.raw) ?? "";
                              const caption = p.expanded ? p.raw : undefined;
                              return (
                                <Button
                                  key={`${p.os}-${idx}-${p.raw}`}
                                  variant="ghost"
                                  onPress={() => setNewGamePath(value)}
                                  className="justify-start text-left bg-bg-elevated/30 border border-white/10 hover:border-primary-500/30 rounded-xl"
                                >
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-xs text-white break-all">
                                      {value}
                                    </span>
                                    {caption && (
                                      <span className="text-[10px] text-gray-500 break-all">
                                        {caption}
                                      </span>
                                    )}
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {newGamePath && isProtectedPath(newGamePath) && (
                    <div className="mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-warning-200 leading-relaxed">
                        This path appears to be a protected system folder.
                        Syncing might fail due to permission restrictions.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white">
                      Enable Auto-Sync
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Automatically backup saves on change
                    </p>
                  </div>
                  <Switch
                    isSelected={autoSync}
                    onChange={setAutoSync}
                    size="sm"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="gap-3 px-6 pt-4 border-t border-white/5">
              <Button variant="ghost" onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleAdd}
                isDisabled={!newGameName || !newGamePath || isAdding}
              >
                {isAdding ? (
                  "Adding..."
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
