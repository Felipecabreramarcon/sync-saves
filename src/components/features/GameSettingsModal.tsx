import { useState, useEffect } from "react";
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
import { FolderOpen, Settings, Info, Save, AlertTriangle } from "lucide-react";
import { SaveInput } from "@/components/common/SaveInput";
import { isProtectedPath, isTauriRuntime } from "@/lib/utils";
import {
  type Game,
  type GamePlatform,
  useGamesStore,
} from "@/stores/gamesStore";
import { updateGame as tauriUpdateGame } from "@/lib/tauri-games";
import { toast } from "@/stores/toastStore";

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
}

const platforms: { value: GamePlatform; label: string }[] = [
  { value: "steam", label: "Steam" },
  { value: "epic", label: "Epic Games" },
  { value: "gog", label: "GOG" },
  { value: "other", label: "Other" },
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

  const updateGame = useGamesStore((state) => state.updateGame);

  // Reset form when game changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(game.name);
      setLocalPath(game.local_path);
      setPlatform(game.platform);
      setSyncEnabled(game.sync_enabled);
    }
  }, [isOpen, game]);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Game Save Folder",
        defaultPath: localPath || undefined,
      });

      if (selected) {
        setLocalPath(selected as string);
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error);
    }
  };

  const handleSave = async () => {
    if (!name || !localPath) {
      toast.error("Validation Error", "Name and path are required");
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
        });
      }

      // Update local store
      updateGame(game.id, {
        name,
        local_path: localPath,
        platform,
        sync_enabled: syncEnabled,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
      });

      toast.success("Settings Saved", `${name} settings updated`);
      onClose();
    } catch (error) {
      console.error("Failed to save game settings:", error);
      toast.error(
        "Save Failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== game.name ||
    localPath !== game.local_path ||
    platform !== game.platform ||
    syncEnabled !== game.sync_enabled;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container>
          <Modal.Dialog className="bg-bg-card border border-white/10 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="border-b border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20">
                  <Settings className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <Modal.Heading className="text-xl font-bold text-white tracking-tight">
                    Game Settings
                  </Modal.Heading>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure sync options for this game
                  </p>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="p-6">
              <div className="space-y-6">
                {/* Game Name */}
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-sm text-gray-400 font-medium ml-1">
                    Game Title
                  </Label>
                  <SaveInput
                    placeholder="e.g. Elden Ring"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Save Folder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-400 font-medium">
                      Save Folder Location
                    </Label>
                    <Tooltip>
                      <Tooltip.Trigger>
                        <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        The directory where the game stores its save files
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2">
                    <SaveInput
                      placeholder="C:\Users\...\Saved Games"
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onPress={handleSelectFolder}
                      className="bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center"
                    >
                      <FolderOpen className="w-5 h-5" />
                    </Button>
                  </div>
                  {localPath && isProtectedPath(localPath) && (
                    <div className="mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-warning-200 leading-relaxed">
                        This path appears to be a protected system folder.
                        Syncing might fail due to permission restrictions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-400 font-medium ml-1">
                    Platform
                  </Label>
                  <Select
                    value={platform}
                    onChange={(key) => setPlatform(key as GamePlatform)}
                  >
                    <Select.Trigger className="w-full  bg-bg-elevated border border-white/10 rounded-xl px-4 text-white hover:border-primary-500/50 transition-colors">
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
                <div className="p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white">
                      Auto-Sync Enabled
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Automatically backup saves when changes are detected
                    </p>
                  </div>
                  <Switch
                    isSelected={syncEnabled}
                    onChange={setSyncEnabled}
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
                onPress={handleSave}
                isDisabled={!name || !localPath || isSaving || !hasChanges}
              >
                {isSaving ? (
                  "Saving..."
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
