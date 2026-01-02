import { useState } from 'react'
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
    Button,
    Switch
} from '@heroui/react'
import { FolderOpen } from 'lucide-react'

interface AddGameModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (game: { name: string; path: string; autoSync: boolean }) => void
}

export default function AddGameModal({ isOpen, onClose, onAdd }: AddGameModalProps) {
    const [newGameName, setNewGameName] = useState('')
    const [newGamePath, setNewGamePath] = useState('')
    const [autoSync, setAutoSync] = useState(true)

    const handleSelectFolder = async () => {
        // TODO: Implement Tauri folder picker
        console.log('Opening folder picker...')
        setNewGamePath('C:/Users/Alex/Saved Games/Example')
    }

    const handleAdd = () => {
        onAdd({
            name: newGameName,
            path: newGamePath,
            autoSync
        })
        // Reset form
        setNewGameName('')
        setNewGamePath('')
        setAutoSync(true)
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            classNames={{
                base: "bg-bg-card border border-white/10",
                header: "border-b border-white/5",
                footer: "border-t border-white/5",
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <h2 className="text-xl font-semibold text-white">Add New Game</h2>
                </ModalHeader>
                <ModalBody className="py-6">
                    <div className="space-y-4">
                        <Input
                            label="Game Name"
                            placeholder="Enter game name..."
                            value={newGameName}
                            onValueChange={setNewGameName}
                            classNames={{
                                inputWrapper: "bg-bg-elevated border-white/10",
                            }}
                        />
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Save Folder Location</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Select folder..."
                                    value={newGamePath}
                                    onValueChange={setNewGamePath}
                                    classNames={{
                                        base: "flex-1",
                                        inputWrapper: "bg-bg-elevated border-white/10",
                                    }}
                                    readOnly
                                />
                                <Button
                                    isIconOnly
                                    variant="bordered"
                                    className="border-white/10 flex flex-row items-center justify-center"
                                    onPress={handleSelectFolder}
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-gray-300">Enable auto-sync</span>
                            <Switch
                                isSelected={autoSync}
                                onValueChange={setAutoSync}
                                color="primary"
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        className="flex flex-row items-center gap-2"
                        onPress={handleAdd}
                        isDisabled={!newGameName || !newGamePath}
                    >
                        Add Game
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
