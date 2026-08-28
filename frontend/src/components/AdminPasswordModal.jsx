import React, { useState } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AdminPasswordModal({ isOpen, onClose, onConfirm, title = "Confirm Admin Security Password" }) {
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) {
            toast.error('Admin password is required');
            return;
        }

        setVerifying(true);
        try {
            await api.post('/auth/verify-admin-password', { password });
            toast.success('Admin authorization verified');
            setPassword('');
            onConfirm();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid Admin Password. Delete request denied.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
                        <ShieldAlert size={22} />
                        <span>Admin Authorization Required</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">{title}</p>
                    <p>To delete or modify this critical record, please enter your system <strong>Admin Password</strong>.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Admin Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="password"
                                required
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Admin Password..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={verifying}
                            className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                        >
                            {verifying ? 'Verifying...' : 'Authorize & Delete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
