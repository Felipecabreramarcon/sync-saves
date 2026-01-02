import { useState } from 'react'
import {
    Modal,
    Switch,
    Tooltip,
    Label,
    Button
} from '@heroui/react'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, Gamepad2, Info, Plus, AlertTriangle } from 'lucide-react'
import { SaveInput } from '@/components/common/SaveInput'
import { isProtectedPath } from '@/lib/utils'

interface AddGameModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (game: { name: string; path: string; autoSync: boolean }) => void
}

export default function AddGameModal({ isOpen, onClose, onAdd }: AddGameModalProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [newGameName, setNewGameName] = useState('')
    const [newGamePath, setNewGamePath] = useState('')
    const [autoSync, setAutoSync] = useState(true)

    const handleSelectFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Game Save Folder'
            })

            if (selected) {
                setNewGamePath(selected as string)
            }
        } catch (error) {
            console.error('Failed to open folder picker:', error)
        }
    }

    const handleAdd = async () => {
        if (!newGameName || !newGamePath) return

        setIsAdding(true)
        try {
            await onAdd({
                name: newGameName,
                path: newGamePath,
                autoSync
            })
            // Reset form
            setNewGameName('')
            setNewGamePath('')
            setAutoSync(true)
        } catch (error) {
            console.error('Failed to add game:', error)
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Modal.Backdrop variant="blur">
                <Modal.Container>
                    <Modal.Dialog className="bg-bg-card border border-white/10 shadow-2xl rounded-2xl">
                        <Modal.CloseTrigger />
                        <Modal.Header className="border-b border-white/5 p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20">
                                    <Gamepad2 className="w-5 h-5 text-primary-400" />
                                </div>
                                <Modal.Heading className="text-xl font-bold text-white tracking-tight">Add New Game</Modal.Heading>
                            </div>
                        </Modal.Header>
                        <Modal.Body className="p-6">
                            <div className="space-y-6">
                                <div className="space-y-1.5 flex flex-col">
                                    <Label className="text-sm text-gray-400 font-medium ml-1">Game Title</Label>
                                    <SaveInput
                                        placeholder="e.g. Elden Ring"
                                        value={newGameName}
                                        onChange={(e) => setNewGameName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm text-gray-400 font-medium">Save Folder Location</Label>
                                        <Tooltip>
                                            <Tooltip.Trigger>
                                                <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                                            </Tooltip.Trigger>
                                            <Tooltip.Content>
                                                Select the directory where the game stores its .sl2, .sav or .dat files
                                            </Tooltip.Content>
                                        </Tooltip>
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
                                            onPress={handleSelectFolder}
                                            className="bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center"
                                        >
                                            <FolderOpen className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    {newGamePath && isProtectedPath(newGamePath) && (
                                        <div className="mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3">
                                            <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-warning-200 leading-relaxed">
                                                This path appears to be a protected system folder. Syncing might fail due to permission restrictions.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold text-white">Enable Auto-Sync</p>
                                        <p className="text-[11px] text-gray-500 font-medium">Automatically backup saves on change</p>
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
                            <Button
                                variant="ghost"
                                onPress={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onPress={handleAdd}
                                isDisabled={!newGameName || !newGamePath || isAdding}
                            >
                                {isAdding ? 'Adding...' : <><Plus size={18} /> Add Game</>}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    )
}
