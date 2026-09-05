import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Search, Layers,
    CheckCircle2, Clock, MoreHorizontal, AlertCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';

const BatchesPage = () => {
    const [batches, setBatches] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);

    useEffect(() => {
        const closeMenu = () => setActiveMenuId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const [formData, setFormData] = useState({
        templateId: '',
        batchNo: '',
        product: '',
        inputWeight_total: '',
        date: new Date().toISOString().split('T')[0],
        staff_total: '',
        remark: ''
    });

    const [assignedMachines, setAssignedMachines] = useState([]);

    const productionSchema = [
        { name: 'date', label: 'Date', type: 'date', required: false },
        { name: 'batchNo', label: 'Batch Number', type: 'text', required: false },
        { name: 'product', label: 'Product Name', type: 'text' },
        {
            name: 'templateId',
            label: 'Process Template',
            type: 'select',
            options: templates.map(t => ({ value: t._id, label: `${t.name} (${t.code})` }))
        },
        { name: 'inputWeight_total', label: 'Total Input Weight (kg)', type: 'number', required: false },
        { name: 'staff_total', label: 'Total StaffCount', type: 'number' },
        { name: 'remark', label: 'Remarks', type: 'textarea' }
    ];

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const { data } = await api.get('/production-batches', { params });
            setBatches(data.data || []);
        } catch (error) {
            toast.error('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const { data } = await api.get('/process-templates');
            setTemplates(data.data || []);
        } catch (error) {
            toast.error('Failed to load process templates');
        }
    };

    const fetchMachines = async () => {
        try {
            const { data } = await api.get('/production/machines');
            setMachines(data.data || []);
        } catch (error) {
            toast.error('Failed to load machines');
        }
    };

    useEffect(() => {
        fetchBatches();
        fetchTemplates();
        fetchMachines();
    }, [statusFilter]);

    const openModal = () => {
        setFormData({
            templateId: '',
            batchNo: '',
            product: '',
            inputWeight_total: '',
            date: new Date().toISOString().split('T')[0],
            staff_total: '',
            remark: ''
        });
        setAssignedMachines([{ machineId: '', hours: '' }]);
        setIsModalOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                machineAssignments: assignedMachines
                    .filter(am => am.machineId && am.hours > 0)
                    .map(am => ({ machineId: am.machineId, hours: Number(am.hours) || 0 }))
            };
            await api.post('/production-batches', payload);
            toast.success('Batch created successfully');
            setIsModalOpen(false);
            fetchBatches();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create batch');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.put(`/production-batches/${id}/status`, { status });
            toast.success(`Batch moved to ${status}`);
            fetchBatches();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            planned: 'bg-gray-100 text-gray-600',
            in_progress: 'bg-blue-100 text-blue-700',
            qc_pending: 'bg-yellow-100 text-yellow-700',
            qc_passed: 'bg-green-100 text-green-700',
            qc_failed: 'bg-red-100 text-red-700',
            completed: 'bg-purple-100 text-purple-700',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
                {status?.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Production Batches</h2>
                    <p className="text-sm text-gray-500">Track real-time factory processing and yield</p>
                </div>
                <Button variant="primary" onClick={openModal}>
                    <Plus size={18} className="mr-1.5" />
                    New Batch
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Batches', value: batches.filter(b => b.status === 'in_progress').length, color: 'blue', icon: Clock },
                    { label: 'Pending QC', value: batches.filter(b => b.status === 'qc_pending').length, color: 'yellow', icon: AlertCircle },
                    { label: 'Total Batches', value: batches.length, color: 'green', icon: CheckCircle2 },
                    { label: 'Efficiency', value: '94.2%', color: 'purple', icon: Layers },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                            <stat.icon size={20} className={`text-${stat.color}-500`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search batch #..."
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none w-64"
                        />
                    </div>
                    <select
                        className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="qc_pending">Pending QC</option>
                        <option value="qc_passed">QC Passed</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))
                ) : batches.length === 0 ? (
                    <div className="py-12 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-500 italic">
                        No production batches found for the current filter.
                    </div>
                ) : (
                    batches.map((batch) => (
                        <div key={batch._id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex items-center gap-6">
                            <div className="w-12 h-12 bg-slate-50 border border-gray-100 rounded-lg flex items-center justify-center text-slate-400">
                                <Layers size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-bold text-gray-900 truncate uppercase tracking-tight">{batch.batchNo || batch.batchNumber}</h4>
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            let nextStatus = '';
                                            if (batch.status === 'planned') nextStatus = 'in_progress';
                                            else if (batch.status === 'in_progress') nextStatus = 'qc_pending';
                                            else if (batch.status === 'qc_pending') nextStatus = 'qc_passed';
                                            else if (batch.status === 'qc_passed') nextStatus = 'completed';
                                            
                                            if (nextStatus) {
                                                handleUpdateStatus(batch._id, nextStatus);
                                            }
                                        }}
                                        className="cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
                                        title="Click to transition status"
                                    >
                                        {getStatusBadge(batch.status)}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {batch.product || 'Standard Product'} ·
                                    Input: <span className="font-semibold text-gray-700">{batch.inputWeight_total || batch.inputWeight || 0} kg</span>
                                </p>
                            </div>

                            <div className="hidden md:block">
                                <p className="text-xs text-gray-400 mb-1">Date</p>
                                <p className="text-sm font-medium text-gray-700">
                                    {batch.date ? format(new Date(batch.date), 'MMM dd, yyyy') : '--'}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {batch.status === 'planned' && (
                                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(batch._id, 'in_progress')}>
                                        Start Batch
                                    </Button>
                                )}
                                {batch.status === 'in_progress' && (
                                    <Button size="sm" variant="primary" onClick={() => handleUpdateStatus(batch._id, 'qc_pending')}>
                                        Move to QC
                                    </Button>
                                )}
                                {batch.status === 'qc_pending' && (
                                    <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Awaiting QC Output</span>
                                )}
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === batch._id ? null : batch._id);
                                        }}
                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                        title="Batch Actions"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>
                                    
                                    {activeMenuId === batch._id && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-150 py-1 z-50">
                                            {batch.status === 'planned' && (
                                                <button
                                                    onClick={() => {
                                                        handleUpdateStatus(batch._id, 'in_progress');
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    Start Batch
                                                </button>
                                            )}
                                            {batch.status === 'in_progress' && (
                                                <button
                                                    onClick={() => {
                                                        handleUpdateStatus(batch._id, 'qc_pending');
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    Move to QC
                                                </button>
                                            )}
                                            {batch.status === 'qc_pending' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            handleUpdateStatus(batch._id, 'qc_passed');
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                    >
                                                        Mark QC Passed
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleUpdateStatus(batch._id, 'qc_failed');
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        Mark QC Failed
                                                    </button>
                                                </>
                                            )}
                                            {batch.status === 'qc_passed' && (
                                                <button
                                                    onClick={() => {
                                                        handleUpdateStatus(batch._id, 'completed');
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                                                >
                                                    Complete Batch
                                                </button>
                                            )}
                                            {batch.status === 'planned' && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Are you sure you want to cancel this planned batch?')) {
                                                            try {
                                                                await api.delete(`/production-batches/${batch._id}`);
                                                                toast.success('Batch cancelled successfully');
                                                                fetchBatches();
                                                            } catch (err) {
                                                                toast.error('Failed to cancel batch');
                                                            }
                                                        }
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    Cancel Batch
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsOpen(false)} title="Create New Production Batch" size="lg">
                <div className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
                    <DynamicForm
                        schema={productionSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel="Initialize Batch"
                    />
                    
                    {/* Machine Assignments Section */}
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-700">Machine Assignments</h4>
                            <button
                                type="button"
                                onClick={() => setAssignedMachines(prev => [...prev, { machineId: '', hours: '' }])}
                                className="text-xs text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1"
                            >
                                <Plus size={14} className="mr-0.5" /> Add Machine
                            </button>
                        </div>
                        
                        <div className="space-y-2.5">
                            {assignedMachines.map((am, idx) => {
                                const machineCost = (() => {
                                    const m = machines.find(mach => mach._id === am.machineId);
                                    return m ? (m.hourlyCost || 0) * (Number(am.hours) || 0) : 0;
                                })();

                                return (
                                    <div key={idx} className="flex gap-3 items-end bg-gray-50 p-2.5 border border-gray-150 rounded-xl relative group">
                                        <div className="flex-1">
                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Machine</label>
                                            <select
                                                value={am.machineId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAssignedMachines(prev => prev.map((item, i) => i === idx ? { ...item, machineId: val } : item));
                                                }}
                                                className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                                            >
                                                <option value="">Select Machine</option>
                                                {machines.map(m => (
                                                    <option key={m._id} value={m._id}>{m.name} ({m.code}) - LKR {m.hourlyCost}/hr</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-28">
                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Running Hours</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={am.hours}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAssignedMachines(prev => prev.map((item, i) => i === idx ? { ...item, hours: val } : item));
                                                }}
                                                placeholder="Hours"
                                                className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                                            />
                                        </div>

                                        <div className="w-32 text-right pb-2">
                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cost</label>
                                            <span className="text-sm font-semibold text-gray-800">LKR {machineCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setAssignedMachines(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors mb-0.5"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {assignedMachines.length > 0 && (() => {
                            const totalMachineCost = assignedMachines.reduce((sum, am) => {
                                const m = machines.find(mach => mach._id === am.machineId);
                                return sum + (m ? (m.hourlyCost || 0) * (Number(am.hours) || 0) : 0);
                            }, 0);
                            if (totalMachineCost > 0) {
                                return (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex justify-between items-center font-bold mt-2">
                                        <span>Total Machine Operation Cost:</span>
                                        <span className="text-base text-blue-900">LKR {totalMachineCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BatchesPage;
