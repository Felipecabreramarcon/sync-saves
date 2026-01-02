import { useState } from 'react'
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Switch,
    Tooltip
} from '@heroui/react'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, Gamepad2, Info, Plus } from 'lucide-react'
import { SaveInput } from '@/components/common/SaveInput'
import { SaveButton } from '@/components/common/SaveButton'

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            backdrop="blur"
            classNames={{
                base: "bg-bg-card border border-white/10 shadow-2xl rounded-2xl",
                header: "border-b border-white/5 p-6",
                body: "p-6",
                footer: "border-t border-white/5 p-6",
                closeButton: "hover:bg-white/10 active:scale-95 transition-all"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20">
                            <Gamepad2 className="w-5 h-5 text-primary-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Add New Game</h2>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm text-gray-400 font-medium ml-1">Game Title</label>
                            <SaveInput
                                placeholder="e.g. Elden Ring"
                                value={newGameName}
                                onValueChange={setNewGameName}
                                labelPlacement="outside"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-400 font-medium">Save Folder Location</label>
                                <Tooltip content="Select the directory where the game stores its .sl2, .sav or .dat files">
                                    <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                                </Tooltip>
                            </div>
                            <div className="flex gap-2">
                                <SaveInput
                                    placeholder="C:\Users\...\Saved Games"
                                    value={newGamePath}
                                    onValueChange={setNewGamePath}
                                    isReadOnly
                                    classNames={{
                                        base: "flex-1",
                                        inputWrapper: "bg-bg-elevated border-white/10 h-12 rounded-xl",
                                        input: "text-gray-400 font-mono text-xs"
                                    }}
                                />
                                <SaveButton
                                    isIconOnly
                                    variant="flat"
                                    className="bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center"
                                    onPress={handleSelectFolder}
                                >
                                    <FolderOpen className="w-5 h-5" />
                                </SaveButton>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-white">Enable Auto-Sync</p>
                                <p className="text-[11px] text-gray-500 font-medium">Automatically backup saves on change</p>
                            </div>
                            <Switch
                                isSelected={autoSync}
                                onValueChange={setAutoSync}
                                color="primary"
                                size="sm"
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="gap-3 px-6 pb-8">
                    <SaveButton
                        variant="flat"
                        onPress={onClose}
                        radius="lg"
                        className="bg-transparent text-gray-400 hover:text-white font-medium"
                    >
                        Cancel
                    </SaveButton>
                    <SaveButton
                        color="primary"
                        radius="lg"
                        className="bg-primary-500 text-white shadow-xl shadow-primary-500/30 font-bold px-8"
                        onPress={handleAdd}
                        isLoading={isAdding}
                        isDisabled={!newGameName || !newGamePath || isAdding}
                        startContent={!isAdding && <Plus size={18} className="mr-0.5" />}
                    >
                        Add Game
                    </SaveButton>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
