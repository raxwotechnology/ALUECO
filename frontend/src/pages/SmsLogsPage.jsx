import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { Mail, CheckCircle2, XCircle, Search, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

export default function SmsLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    // Manual SMS States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualContact, setManualContact] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [sending, setSending] = useState(false);

    const fetchLogs = useCallback(async () => {
        Promise.resolve().then(() => setLoading(true));
        try {
            const res = await api.get(`/audit/sms?page=${page}&limit=20`);
            setLogs(res.data.data || []);
            setPages(res.data.pages || 1);
        } catch {
            toast.error('Failed to load SMS logs');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        Promise.resolve().then(() => fetchLogs());
    }, [fetchLogs]);

    const handleSendManualSms = async (e) => {
        e.preventDefault();
        if (!manualContact || !manualMessage) {
            toast.error('Mobile number and message are required');
            return;
        }

        setSending(true);
        try {
            const res = await api.post('/audit/sms/send-manual', {
                contact: manualContact,
                recipientName: manualName,
                message: manualMessage
            });

            if (res.data?.success) {
                toast.success('SMS sent successfully via SMSlenz!');
                setIsModalOpen(false);
                setManualContact('');
                setManualName('');
                setManualMessage('');
                fetchLogs(); // refresh logs list
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Failed to send manual SMS';
            toast.error(errMsg);
        } finally {
            setSending(false);
        }
    };

    const filtered = logs.filter(log =>
        [log.supplierName, log.supplierPhone, log.message, log.grnId?.grnNumber].some(
            field => (field || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">SMS Gateway Dispatch Logs</h2>
                    <p className="text-sm text-gray-500">Audit trail of automated SMS receipts sent to suppliers upon QA approval</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition shadow-sm"
                    >
                        <Mail size={16} />
                        Send Custom SMS
                    </button>
                    <button onClick={fetchLogs} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Refresh logs">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search supplier, mobile, message, GRN..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="px-5 py-3">Timestamp</th>
                            <th className="px-5 py-3">Supplier Name</th>
                            <th className="px-5 py-3">Mobile No.</th>
                            <th className="px-5 py-3">SMS Message Content</th>
                            <th className="px-5 py-3">Related GRN</th>
                            <th className="px-5 py-3 text-center">Gateway Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-5 py-5">
                                        <div className="h-4 bg-gray-100 rounded w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic">
                                    No SMS logs found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {format(new Date(log.date), 'yyyy-MM-dd HH:mm:ss')}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">
                                        {log.supplierName}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                                        {log.supplierPhone}
                                    </td>
                                    <td className="px-5 py-4 max-w-xs truncate" title={log.message}>
                                        {log.message}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {log.grnId ? (
                                            <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                                                {log.grnId.grnNumber}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                        }`}>
                                            {log.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            {log.status === 'sent' ? 'Sent' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex justify-end items-center gap-2 pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 border rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500 font-medium">Page {page} of {pages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        className="px-3 py-1.5 border rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Manual SMS Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    if (!sending) setIsModalOpen(false);
                }}
                title="Send Custom Manual SMS"
                size="md"
            >
                <form onSubmit={handleSendManualSms} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500 leading-normal">
                        Enter a Sri Lankan mobile number and message to manually dispatch via the SMSlenz gateway. The number will be formatted to international format automatically.
                    </p>

                    <Input
                        label="Recipient Mobile Number"
                        placeholder="e.g. 0772268608 or +94772268608"
                        required
                        value={manualContact}
                        onChange={(e) => setManualContact(e.target.value)}
                        disabled={sending}
                    />

                    <Input
                        label="Recipient Name / Description"
                        placeholder="e.g. Golden Cafe Test (Optional)"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        disabled={sending}
                    />

                    <div className="space-y-1">
                        <Textarea
                            label="Message Content"
                            placeholder="Type your message here..."
                            required
                            rows={4}
                            value={manualMessage}
                            onChange={(e) => setManualMessage(e.target.value)}
                            disabled={sending}
                            maxLength={1500}
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Max 1500 characters</span>
                            <span>{manualMessage.length} / 1500</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                            disabled={sending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                            disabled={sending}
                        >
                            {sending ? (
                                <>
                                    <RefreshCw className="animate-spin" size={14} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail size={14} />
                                    Send SMS
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
