import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { PlayerFlags } from '../../../components/ui/PlayerFlags';

interface AddFlagDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: { id: string; displayName: string } | null;
}

export const AddFlagDialog: React.FC<AddFlagDialogProps> = ({ isOpen, onClose, user }) => {
    if (!user) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tags: ${user.displayName}`}
        >
            <div style={{ minWidth: '400px', padding: '0.5rem' }}>
                <PlayerFlags userId={user.id} initialShowPicker={true} />
            </div>
        </Modal>
    );
};
