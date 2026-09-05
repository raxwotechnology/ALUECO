import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="p-4 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                    <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                        <AlertTriangle size={18} className={variant === 'danger' ? 'text-red-600' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-700">{message}</p>
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5 sm:mt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading} fullWidth className="sm:w-auto">
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading} fullWidth className="sm:w-auto">
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}