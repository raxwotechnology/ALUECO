import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Printer, Eye, Trash2, CheckCircle2, Clock, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

const AluAgreementsPage = () => {
    const navigate = useNavigate();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAgreements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alu/agreements');
            if (res.data?.success) {
                setAgreements(res.data.data || []);
            }
        } catch (err) {
            toast.error('Failed to load project agreements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgreements();
    }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this project agreement?')) return;
        try {
            await api.delete(`/alu/agreements/${id}`);
            toast.success('Agreement deleted successfully');
            fetchAgreements();
        } catch (err) {
            toast.error('Failed to delete agreement');
        }
    };

    const filteredAgreements = agreements.filter(a => {
        const q = searchQuery.toLowerCase();
        return (
            a.agreementNumber?.toLowerCase().includes(q) ||
            a.quotationNumber?.toLowerCase().includes(q) ||
            a.customerDetails?.customerName?.toLowerCase().includes(q) ||
            a.customerDetails?.projectLocation?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <FileText className="text-indigo-600" size={26} /> Project Agreements Directory
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Manage client project agreements, auto-fill from quotations, configure payment stages, and export official print PDFs.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => navigate('/alu/agreements/new')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                        <Plus size={16} /> New Agreement
                    </Button>
                </div>
            </div>

            {/* Filter Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Agreement No (PA-200), Quotation No (QOT-231), or Customer Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {/* Agreements Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 text-xs italic">Loading agreements...</div>
                ) : filteredAgreements.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
                        <p>No project agreements found.</p>
                        <Button
                            onClick={() => navigate('/alu/agreements/new')}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold py-1.5 px-3 rounded-lg text-xs"
                        >
                            Create First Project Agreement
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans">
                            <thead>
                                <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] border-b">
                                    <th className="p-3">Agreement No</th>
                                    <th className="p-3">Quotation Ref</th>
                                    <th className="p-3">Customer Name</th>
                                    <th className="p-3">Project Location</th>
                                    <th className="p-3 text-right">Contract Value</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAgreements.map(a => (
                                    <tr
                                        key={a._id}
                                        onClick={() => navigate(`/alu/agreements/${a._id}`)}
                                        className="hover:bg-slate-50/80 cursor-pointer transition"
                                    >
                                        <td className="p-3 font-bold font-mono text-indigo-600">{a.agreementNumber}</td>
                                        <td className="p-3 font-mono font-bold text-slate-700">{a.quotationNumber}</td>
                                        <td className="p-3 font-bold text-slate-800">{a.customerDetails?.customerName}</td>
                                        <td className="p-3 text-slate-600 truncate max-w-[220px]">{a.customerDetails?.projectLocation}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                                            LKR {(a.projectValue || 0).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {a.status || 'draft'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/alu/agreements/${a._id}`)}
                                                    className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                                    title="View & Edit"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(a._id, e)}
                                                    className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AluAgreementsPage;
