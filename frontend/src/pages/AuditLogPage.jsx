import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Search, Filter, History, User as UserIcon,
    Database, Activity, ChevronLeft, ChevronRight,
    Eye, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        module: '',
        action: '',
        userId: '',
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                ...filters,
                page,
                limit: 50
            };
            const { data } = await api.get('/audit', { params });
            // Response is { success: true, data: [...], pages: ... }
            setLogs(data.data || []);
            setTotalPages(data.pages || 1);
        } catch (error) {
            toast.error('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const getActionBadge = (action) => {
        const styles = {
            create: 'bg-green-100 text-green-700',
            update: 'bg-blue-100 text-blue-700',
            delete: 'bg-red-100 text-red-700',
            export: 'bg-purple-100 text-purple-700',
            login: 'bg-gray-100 text-gray-700',
            logout: 'bg-gray-100 text-gray-700',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${styles[action] || 'bg-gray-100 text-gray-700'}`}>
                {action}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
                    <p className="text-sm text-gray-500">Track all system activities and data changes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Module</label>
                    <select
                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        value={filters.module}
                        onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                    >
                        <option value="">All Modules</option>
                        <option value="products">Products</option>
                        <option value="customers">Customers</option>
                        <option value="export">Exports</option>
                        <option value="auth">Auth</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                    <select
                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    >
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="export">Export</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Module/Action</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Info</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="5" className="px-6 py-4">
                                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                                    </td>
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">No logs found</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-900">{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                <UserIcon size={12} className="text-blue-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-500">{log.module}</span>
                                            {getActionBadge(log.action)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">{log.ipAddress}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
