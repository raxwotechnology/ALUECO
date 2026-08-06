import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { Plus, Eye, Edit, FileText, Trash2, ArrowRightLeft, GitBranch, ShieldCheck, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

const AluQuotationsPage = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/alu/quotations');
            setQuotations(data.data || []);
        } catch (error) {
            toast.error('Failed to load aluminium quotations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, []);

    const handleDelete = async () => {
        try {
            await api.delete(`/alu/quotations/${deletingId}`);
            toast.success('Quotation deleted successfully');
            setDeletingId(null);
            fetchQuotations();
        } catch (error) {
            toast.error('Failed to delete quotation');
        }
    };

    const handleCreateRevision = async (id) => {
        try {
            const { data } = await api.post(`/alu/quotations/${id}/revise`);
            toast.success(`Created Revision Rev ${data.data.version}`);
            navigate(`/alu/quotations/${data.data._id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create revision');
        }
    };

    const handleDuplicateQuotation = async (id) => {
        try {
            await api.post(`/alu/quotations/${id}/duplicate`);
            toast.success('Quotation duplicated successfully!');
            fetchQuotations();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to duplicate quotation');
        }
    };

    // Filter quotations
    const filteredQuotations = quotations.filter(q => {
        const matchesSearch = 
            q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter ? q.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    // Summary counts
    const totalCount = quotations.length;
    const activeValue = quotations
        .filter(q => q.status !== 'rejected')
        .reduce((sum, q) => sum + q.finalSellingPrice, 0);
    const pendingCount = quotations.filter(q => q.status === 'draft').length;
    const acceptedCount = quotations.filter(q => q.status === 'accepted' || q.status === 'converted').length;

    const getStatusStyle = (status) => {
        const styles = {
            draft: 'text-amber-700 bg-amber-50 border-amber-200',
            sent: 'text-blue-700 bg-blue-50 border-blue-200',
            accepted: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            rejected: 'text-rose-700 bg-rose-50 border-rose-200',
            expired: 'text-slate-500 bg-slate-100 border-slate-200',
            converted: 'text-purple-700 bg-purple-50 border-purple-200'
        };
        return styles[status] || 'text-slate-500 bg-slate-50';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ALUECO Aluminium Quotations</h1>
                    <p className="text-slate-500 mt-1">Design, estimate, optimize, and generate dynamic fabrication BOMs and customer quotations.</p>
                </div>
                <Button onClick={() => navigate('/alu/quotations/new')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200">
                    <Plus size={18} /> New Quotation
                </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total active quotations', val: totalCount, desc: 'Revisions grouped', color: 'border-slate-100' },
                    { label: 'Total quotation value', val: `LKR ${activeValue.toLocaleString()}`, desc: 'Excluding rejected', color: 'border-indigo-100 bg-indigo-50/20' },
                    { label: 'Draft / pending quotes', val: pendingCount, desc: 'Awaiting submission', color: 'border-amber-100 bg-amber-50/10' },
                    { label: 'Accepted / converted', val: acceptedCount, desc: 'Conversion rate tracking', color: 'border-emerald-100 bg-emerald-50/10' }
                ].map((m, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm flex flex-col justify-between ${m.color}`}>
                        <span className="text-sm font-semibold text-slate-500">{m.label}</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-800">{m.val}</span>
                        </div>
                        <span className="text-xs text-slate-400 mt-1">{m.desc}</span>
                    </div>
                ))}
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <input
                    type="text"
                    placeholder="Search quote #, project or client name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full sm:flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-600"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full sm:w-48 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 bg-white"
                >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="converted">Converted to Order</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Table Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredQuotations.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm">No aluminium quotations found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quote Number</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quote Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Selling Price</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredQuotations.map(q => (
                                    <tr key={q._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <span onClick={() => navigate(`/alu/quotations/${q._id}`)} className="font-extrabold text-indigo-600 hover:underline cursor-pointer">{q.quoteNumber}</span>
                                                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                    Rev {String(q.version).padStart(2, '0')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{q.projectName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{q.customerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {format(new Date(q.date), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(q.status)}`}>
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-800">LKR {q.finalSellingPrice.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1.5">
                                            <button onClick={() => navigate(`/alu/quotations/${q._id}`)} title="View costing details" className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><Eye size={16} /></button>
                                            
                                            {q.status === 'draft' && (
                                                <button onClick={() => navigate(`/alu/quotations/${q._id}/edit`)} title="Edit quote details" className="text-slate-600 hover:text-amber-600 p-1.5 rounded-lg hover:bg-slate-100"><Edit size={16} /></button>
                                            )}
                                            
                                            <button onClick={() => handleCreateRevision(q._id)} title="Create a new revision copy using current rates" className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><GitBranch size={16} /></button>
                                            <button onClick={() => handleDuplicateQuotation(q._id)} title="Duplicate quotation (Create copy)" className="text-slate-600 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100"><Copy size={16} /></button>
                                            
                                            {q.status !== 'converted' && (
                                                <button onClick={() => handleConvertToOrder(q._id)} title="Convert quote to Sales Order" className="text-slate-600 hover:text-purple-600 p-1.5 rounded-lg hover:bg-slate-100"><ArrowRightLeft size={16} /></button>
                                            )}
                                            
                                            <button onClick={() => setDeletingId(q._id)} title="Delete quote" className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingId}
                title="Delete Quotation"
                message="Are you sure you want to delete this quotation? All revision history for this specific copy will be removed from latest list."
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />
        </div>
    );
};

export default AluQuotationsPage;
