import VersionHistory from '@/components/features/VersionHistory';

interface VersionsTabProps {
  cloudGameId?: string;
  gameId: string;
  onRestore: () => void;
}

/**
 * Version history tab wrapper for game settings modal.
 */
export function VersionsTab({
  cloudGameId,
  gameId,
  onRestore,
}: VersionsTabProps) {
  return (
    <div className='p-0 overflow-hidden h-[60vh]'>
      <VersionHistory
        cloudGameId={cloudGameId}
        gameId={gameId}
        onRestore={onRestore}
      />
    </div>
  );
}
