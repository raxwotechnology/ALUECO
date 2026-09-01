import React, { useState, useEffect } from 'react';
import { Layers, Search, Download, Edit, Trash2, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { downloadCSV } from '../utils/exportUtils';

const PROJECT_COLUMNS = [
    { id: 'Confirmed', label: 'Confirmed', color: 'border-t-4 border-t-blue-500 bg-blue-50/20' },
    { id: 'cutting', label: 'Cutting', color: 'border-t-4 border-t-amber-500 bg-amber-50/20' },
    { id: 'assembly', label: 'Assembly', color: 'border-t-4 border-t-blue-500 bg-blue-50/20' },
    { id: 'glazing', label: 'Glazing', color: 'border-t-4 border-t-indigo-500 bg-indigo-50/20' },
    { id: 'qa', label: 'Quality Assurance', color: 'border-t-4 border-t-purple-500 bg-purple-50/20' },
    { id: 'ready', label: 'Ready', color: 'border-t-4 border-t-emerald-500 bg-emerald-50/20' },
    { id: 'Installation', label: 'Installation', color: 'border-t-4 border-t-purple-500 bg-purple-50/20' },
    { id: 'Completed', label: 'Completed', color: 'border-t-4 border-t-emerald-500 bg-emerald-50/20' }
];

export default function AluProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Admin Delete State
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Edit Modal State
    const [editingProject, setEditingProject] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales-orders');
            const data = (res.data?.data || []).filter(o => o.businessType === 'alueco' || o.quotationId);
            setProjects(data);
        } catch (err) {
            toast.error('Failed to load project profiles');
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(p =>
        (p.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.projectName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.customerName || '').toLowerCase().includes(search.toLowerCase())
    );

    // Calculate statistics
    const stats = {
        total: projects.length,
        totalValue: projects.reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    };

    const handleDownload = () => {
        const exportData = filteredProjects.map(p => ({
            OrderNumber: p.orderNumber,
            ProjectName: p.projectName,
            CustomerName: p.customerSnapshot?.name || p.customerName || 'N/A',
            GrandTotal: p.grandTotal,
            Status: p.status,
            DeliveryDate: p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString() : ''
        }));
        downloadCSV(exportData, `Alueco_Projects_${Date.now()}.csv`);
    };

    const requestDelete = (id) => {
        setDeleteTargetId(id);
        setShowAdminModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await api.delete(`/sales-orders/${deleteTargetId}`);
            toast.success('Project deleted successfully');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete project');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const moveProject = async (projectId, newStatus) => {
        try {
            // Use PUT endpoint since ALUECO orders can be updated regardless of status
            await api.put(`/sales-orders/${projectId}`, { status: newStatus });
            toast.success(`Moved project status to ${newStatus}`);
            fetchProjects();
            if (editingProject && editingProject._id === projectId) {
                setEditingProject(null);
            }
        } catch (error) {
            console.error('Status update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update project status');
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            // For ALUECO orders, directly update fields including status
            // ALUECO orders have different workflow than standard sales orders
            const updateData = {
                projectName: editingProject.projectName,
                customerName: editingProject.customerName,
                status: editingProject.status
            };
            
            await api.put(`/sales-orders/${editingProject._id}`, updateData);
            toast.success('Project updated successfully');
            setEditingProject(null);
            fetchProjects();
        } catch (err) {
            console.error('Update error:', err);
            toast.error(err.response?.data?.message || 'Failed to update project');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <Layers size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Project Profiles & Job Tracking</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Tracking ongoing aluminium jobs, doors, windows, and custom fabrications</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <Layers size={18} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Total Projects</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Total Value</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">LKR {(stats.totalValue).toLocaleString()}</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by project name, order code, or customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-12 text-center text-slate-500 font-medium">Loading project profiles...</div>
            ) : filteredProjects.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                    No active aluminium projects found matching your search.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div key={project._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                                        {project.orderNumber}
                                    </span>
                                    <h3 className="font-bold text-slate-800 text-lg mt-2 truncate">
                                        {project.projectName || 'Aluminium Works Project'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{project.customerSnapshot?.name || project.customerName || 'Client'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setEditingProject(project)}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Edit Project"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => requestDelete(project._id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete (Requires Admin Password)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Total Value</span>
                                    <span className="font-bold text-slate-800 text-sm">
                                        LKR {(project.grandTotal || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Admin Password Modal for Security Verification */}
            <AdminPasswordModal
                isOpen={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onConfirm={confirmDelete}
                title="Delete Project Profile"
            />

            {/* Edit Project Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">Edit Project Profile</h3>
                        <form onSubmit={handleSaveEdit} className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Project Name</label>
                                <input
                                    type="text"
                                    value={editingProject.projectName || ''}
                                    onChange={(e) => setEditingProject({ ...editingProject, projectName: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    value={editingProject.customerName || ''}
                                    onChange={(e) => setEditingProject({ ...editingProject, customerName: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="pt-4 border-t">
                                <label className="text-xs font-semibold text-slate-500 block mb-2">Status</label>
                                <select
                                    value={editingProject.status || 'Confirmed'}
                                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                >
                                    {PROJECT_COLUMNS.map(col => (
                                        <option key={col.id} value={col.id}>{col.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingProject(null)}
                                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
