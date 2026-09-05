import { useState, useRef } from 'react';
import { Save, Edit2, X, Check, Loader2, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Fields to hide from the table
const HIDDEN_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'deletedAt'];

// Fields that should render as dates
const DATE_FIELDS = ['date', 'createdAt', 'updatedAt'];

// Fields that are numeric
const isNumericVal = (val) => typeof val === 'number';

function formatCellValue(key, val) {
    if (val === null || val === undefined || val === '') return '-';
    if (DATE_FIELDS.includes(key)) {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
    }
    return String(val);
}

export default function EditableDataGrid({ data, type, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newRow, setNewRow] = useState({});
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const headers = data && data.length > 0
        ? Object.keys(data[0]).filter(k => !HIDDEN_FIELDS.includes(k))
        : [];

    const paginatedData = data ? data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];
    const totalPages = data ? Math.ceil(data.length / PAGE_SIZE) : 0;

    const handleStartEdit = (item) => {
        setEditingId(item._id);
        setEditForm({ ...item });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (id) => {
        setIsSaving(true);
        try {
            const response = await api.put(`/sync/${type}/${id}`, editForm);
            toast.success('Row updated & Excel synced');
            setEditingId(null);
            onUpdate(response.data.data, 'update');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Update failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this row? It will also be removed from the Excel file.')) return;
        try {
            await api.delete(`/sync/${type}/${id}`);
            toast.success('Row deleted from DB & Excel');
            onUpdate({ _id: id }, 'delete');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        }
    };

    const handleAddRow = async () => {
        if (!newRow || Object.values(newRow).every(v => !v)) {
            toast.error('Please fill in at least one field');
            return;
        }
        setIsSaving(true);
        try {
            const response = await api.post(`/sync/${type}`, newRow);
            toast.success('Row added to DB & Excel');
            setIsAdding(false);
            setNewRow({});
            onUpdate(response.data.data, 'create');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Create failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (formSetter, form, key, value, isNum) => {
        formSetter({ ...form, [key]: isNum ? (parseFloat(value) || 0) : value });
    };

    const renderCell = (key, val, formState, setForm) => {
        const isDate = DATE_FIELDS.includes(key);
        const isNum = isNumericVal(val) || (formState && isNumericVal(formState[key]));
        return (
            <input
                type={isDate ? 'date' : isNum ? 'number' : 'text'}
                value={isDate
                    ? (formState[key] ? new Date(formState[key]).toISOString().split('T')[0] : '')
                    : (formState[key] ?? '')}
                onChange={(e) => handleFieldChange(setForm, formState, key, e.target.value, isNum)}
                className="w-full min-w-[90px] px-2 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none text-[11px] font-medium bg-white"
                step={isNum ? 'any' : undefined}
            />
        );
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <div className="text-5xl">📂</div>
                <p className="text-sm font-medium">No data found. Import an Excel file to begin.</p>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                >
                    <Plus size={14} /> Add First Row
                </button>
                {isAdding && (
                    <div className="w-full max-w-lg p-4 bg-white border rounded-2xl shadow-xl">
                        <p className="text-xs font-black mb-3 text-blue-600 uppercase">New Row</p>
                        {headers.length === 0 ? (
                            <p className="text-xs text-gray-500">Load data first or use the import function.</p>
                        ) : (
                            <>
                                {headers.map(h => (
                                    <div key={h} className="mb-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">{h.replace(/_/g, ' ')}</label>
                                        <input
                                            type="text"
                                            value={newRow[h] || ''}
                                            onChange={e => setNewRow({ ...newRow, [h]: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-xs mt-1"
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-4">
                                    <button onClick={handleAddRow} disabled={isSaving}
                                        className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-xl">
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={() => setIsAdding(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl">
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">
                    {data.length} Records
                </span>
                <button
                    onClick={() => { setIsAdding(true); setNewRow({}); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-[10px] font-black rounded-xl hover:bg-green-600 transition uppercase tracking-widest"
                >
                    <Plus size={12} /> Add Row
                </button>
            </div>

            <div className="overflow-auto flex-1 border rounded-2xl shadow-sm bg-white">
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-gray-50/80 sticky top-0 z-10 border-b">
                        <tr>
                            <th className="px-3 py-3 font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Actions</th>
                            {headers.map(h => (
                                <th key={h} className="px-3 py-3 font-black uppercase tracking-tighter text-gray-600 whitespace-nowrap">
                                    {h.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* Add new row inline */}
                        {isAdding && (
                            <tr className="bg-green-50/60 border-l-4 border-green-400">
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex gap-1.5">
                                        <button onClick={handleAddRow} disabled={isSaving}
                                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                        </button>
                                        <button onClick={() => setIsAdding(false)}
                                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                                            <X size={13} />
                                        </button>
                                    </div>
                                </td>
                                {headers.map(h => (
                                    <td key={h} className="px-3 py-2">
                                        {renderCell(h, data[0]?.[h], newRow, setNewRow)}
                                    </td>
                                ))}
                            </tr>
                        )}

                        {paginatedData.map((item) => (
                            <tr
                                key={item._id}
                                className={`hover:bg-blue-50/20 transition-colors ${editingId === item._id ? 'bg-blue-50/50 border-l-4 border-blue-400' : ''}`}
                            >
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {editingId === item._id ? (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleSave(item._id)} disabled={isSaving}
                                                className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm">
                                                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                            </button>
                                            <button onClick={handleCancel}
                                                className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleStartEdit(item)}
                                                className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-blue-600 hover:border-blue-200 transition shadow-sm"
                                                title="Edit row">
                                                <Edit2 size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(item._id)}
                                                className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-red-600 hover:border-red-200 transition shadow-sm"
                                                title="Delete row">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                                {headers.map(h => (
                                    <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                        {editingId === item._id
                                            ? renderCell(h, item[h], editForm, setEditForm)
                                            : (
                                                <span className={isNumericVal(item[h]) ? 'font-mono text-gray-900 font-bold tabular-nums' : ''}>
                                                    {formatCellValue(h, item[h])}
                                                </span>
                                            )
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] text-gray-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            className="p-1 rounded border text-gray-500 disabled:opacity-30 hover:bg-gray-100">
                            <ChevronLeft size={14} />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="p-1 rounded border text-gray-500 disabled:opacity-30 hover:bg-gray-100">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
