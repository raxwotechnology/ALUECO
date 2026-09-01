import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { ClipboardList, ArrowRight, User, Folder, Download, RefreshCw, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const COLUMNS = [
    { id: 'cutting', label: 'Cutting Stage', color: 'border-t-4 border-t-amber-500 bg-amber-50/20' },
    { id: 'assembly', label: 'Frame Assembly', color: 'border-t-4 border-t-blue-500 bg-blue-50/20' },
    { id: 'glazing', label: 'Glass Glazing', color: 'border-t-4 border-t-indigo-500 bg-indigo-50/20' },
    { id: 'qa', label: 'Quality Assurance', color: 'border-t-4 border-t-purple-500 bg-purple-50/20' },
    { id: 'ready', label: 'Ready / Dispatch', color: 'border-t-4 border-t-emerald-500 bg-emerald-50/20' }
];

// Project color sequence for visual distinction
const PROJECT_COLORS = [
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', header: 'bg-rose-100' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', header: 'bg-orange-100' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', header: 'bg-amber-100' },
    { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', header: 'bg-lime-100' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', header: 'bg-emerald-100' },
    { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', header: 'bg-teal-100' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', header: 'bg-cyan-100' },
    { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', header: 'bg-sky-100' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', header: 'bg-blue-100' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', header: 'bg-indigo-100' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', header: 'bg-violet-100' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', header: 'bg-purple-100' },
    { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', header: 'bg-fuchsia-100' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', header: 'bg-pink-100' },
];

// Get consistent color for a project based on its name
const getProjectColor = (projectName) => {
    const hash = projectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PROJECT_COLORS[hash % PROJECT_COLORS.length];
};

const AluKanbanPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [quantityToMove, setQuantityToMove] = useState(1);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alu/job-cards');
            setJobs(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load Kanban production board');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Group items by project and stage
    const getKanbanData = () => {
        const kanbanData = {};
        
        COLUMNS.forEach(col => {
            kanbanData[col.id] = {};
        });

        jobs.forEach(job => {
            job.items.forEach((item, itemIndex) => {
                COLUMNS.forEach(col => {
                    const qty = item[`${col.id}Qty`] || 0;
                    if (qty > 0) {
                        if (!kanbanData[col.id][job.projectName]) {
                            kanbanData[col.id][job.projectName] = {
                                projectName: job.projectName,
                                customerName: job.customerName,
                                jobCardNumber: job.jobCardNumber,
                                jobCardId: job._id, // Include MongoDB _id
                                quotationId: job.quotationId,
                                items: []
                            };
                        }
                        
                        const existingItem = kanbanData[col.id][job.projectName].items.find(
                            i => i.applicationType === item.applicationType && 
                                i.configuration === item.configuration &&
                                i.width === item.width &&
                                i.height === item.height
                        );
                        
                        if (existingItem) {
                            existingItem.quantity += qty;
                            existingItem.itemIndex = itemIndex;
                        } else {
                            kanbanData[col.id][job.projectName].items.push({
                                applicationType: item.applicationType,
                                configuration: item.configuration,
                                width: item.width,
                                height: item.height,
                                quantity: qty,
                                itemIndex: itemIndex,
                                totalQuantity: item.totalQuantity
                            });
                        }
                    }
                });
            });
        });

        return kanbanData;
    };

    const kanbanData = getKanbanData();

    const updateItemQuantity = async (jobCardId, itemIndex, stage, newQuantity) => {
        try {
            await api.put('/alu/job-cards/item-quantity', {
                jobCardId,
                itemIndex,
                stage,
                quantity: newQuantity
            });
            toast.success(`Updated ${stage} quantity to ${newQuantity}`);
            fetchJobs();
        } catch (error) {
            toast.error('Failed to update quantity');
        }
    };

    const moveQuantityInternal = async (jobCardId, itemIndex, fromStage, toStage, quantity) => {
        try {
            const job = jobs.find(j => j._id === jobCardId);
            if (!job) return;

            const fromQty = job.items[itemIndex][`${fromStage}Qty`] || 0;
            const toQty = job.items[itemIndex][`${toStage}Qty`] || 0;

            if (quantity > fromQty) {
                toast.error(`Cannot move ${quantity}. Only ${fromQty} available in ${fromStage}`);
                return;
            }

            if (quantity <= 0) {
                toast.error('Quantity must be greater than 0');
                return;
            }

            await api.put('/alu/job-cards/item-quantity', {
                jobCardId,
                itemIndex,
                stage: fromStage,
                quantity: fromQty - quantity
            });

            await api.put('/alu/job-cards/item-quantity', {
                jobCardId,
                itemIndex,
                stage: toStage,
                quantity: toQty + quantity
            });

            toast.success(`Moved ${quantity} from ${fromStage} to ${toStage}`);
            fetchJobs();
            setDetailModalOpen(false);
        } catch (error) {
            toast.error('Failed to move quantity');
        }
    };

    // Phase 4: CNC saw machine integration export trigger
    const exportCncSawGCode = async (quotationId) => {
        try {
            toast.loading('Generating G-Code cutting instructions...', { id: 'cnc' });
            const res = await api.post(`/alu/quotations/${quotationId}/cnc-export`);
            
            // Trigger file download
            const blob = new Blob([res.data.gcode], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CUT-${quotationId.slice(-6).toUpperCase()}.saw`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            toast.success('CNC G-Code export successful!', { id: 'cnc' });
        } catch (error) {
            toast.error('Failed to export CNC G-code', { id: 'cnc' });
        }
    };

    return (
        <div className="p-6 max-w-full mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <ClipboardList className="text-indigo-600" /> Production Kanban Board
                    </h1>
                    <p className="text-slate-500 mt-1">Track fabrication progress, manage job cards, and export CNC cutting saw data.</p>
                </div>
                <button onClick={fetchJobs} className="p-2 border rounded-xl hover:bg-slate-100 bg-white text-slate-600 shadow-sm transition">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Kanban columns grid */}
            {loading ? (
                <div className="text-center py-40 text-slate-500 text-sm">Loading production cards...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                    {COLUMNS.map(col => {
                        const columnProjects = kanbanData[col.id];
                        const projectNames = Object.keys(columnProjects);
                        
                        return (
                            <div key={col.id} className={`rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3 ${col.color} min-h-[500px]`}>
                                <div className="flex justify-between items-center border-b pb-2">
                                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">{col.label}</span>
                                    <span className="w-5 h-5 bg-slate-200/80 text-slate-700 text-[10px] font-black rounded-full flex items-center justify-center">
                                        {projectNames.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {projectNames.map(projectName => {
                                        const project = columnProjects[projectName];
                                        const projectColor = getProjectColor(projectName);
                                        return (
                                            <div key={projectName} className="space-y-2">
                                                {/* Project Header */}
                                                <div className={`${projectColor.header} p-2 rounded-lg border ${projectColor.border}`}>
                                                    <div className={`text-[10px] font-bold ${projectColor.text}`}>{project.jobCardNumber}</div>
                                                    <div className="text-xs font-extrabold text-slate-800">{projectName}</div>
                                                    <div className="text-[10px] text-slate-600">{project.customerName}</div>
                                                </div>

                                                {/* Product Items */}
                                                {project.items.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => { 
                                                            setSelectedItem({ ...item, project, stage: col.id, jobCardId: project.jobCardId }); 
                                                            setQuantityToMove(1); // Reset quantity to 1
                                                            setDetailModalOpen(true); 
                                                        }}
                                                        className={`${projectColor.bg} p-3 rounded-xl border ${projectColor.border} shadow-sm hover:shadow-md cursor-pointer transition`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className={`text-[10px] font-bold ${projectColor.text}`}>{item.applicationType}</span>
                                                                <div className="text-[9px] text-slate-500">{item.configuration}</div>
                                                                <div className="text-[9px] text-slate-500">{item.width}x{item.height}mm</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`text-xs font-bold ${projectColor.text}`}>{item.quantity}</div>
                                                                <div className="text-[9px] text-slate-500">units</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`${selectedItem.applicationType} - ${selectedItem.project.projectName}`}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Project</span>
                                <span className="font-bold text-slate-800">{selectedItem.project.projectName}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Customer</span>
                                <span className="font-bold text-slate-800">{selectedItem.project.customerName}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Current Stage</span>
                                <span className="font-bold text-indigo-600 capitalize">{selectedItem.stage}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Quantity Here</span>
                                <span className="font-bold text-slate-800">{selectedItem.quantity}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700">Move Quantity to Another Stage</h4>
                            <div className="flex items-center gap-2 mb-3">
                                <label className="text-xs text-slate-600">Quantity:</label>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setQuantityToMove(Math.max(1, quantityToMove - 1))}
                                        className="p-1 rounded border hover:bg-slate-100"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.quantity}
                                        value={quantityToMove}
                                        onChange={(e) => setQuantityToMove(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                                        className="w-16 px-2 py-1 border rounded-lg text-xs text-center"
                                    />
                                    <button
                                        onClick={() => setQuantityToMove(Math.min(selectedItem.quantity, quantityToMove + 1))}
                                        className="p-1 rounded border hover:bg-slate-100"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <span className="text-xs text-slate-400">(Max: {selectedItem.quantity})</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {COLUMNS.filter(col => col.id !== selectedItem.stage).map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => moveQuantityInternal(
                                            selectedItem.jobCardId,
                                            selectedItem.itemIndex,
                                            selectedItem.stage,
                                            col.id,
                                            quantityToMove
                                        )}
                                        className="px-3 py-2 rounded-lg text-xs font-medium border bg-white hover:bg-indigo-50 border-slate-200 text-slate-700 hover:text-indigo-600 transition flex items-center gap-1"
                                    >
                                        <ArrowRight size={12} /> Move {quantityToMove} to {col.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t gap-3">
                            <Button
                                onClick={() => exportCncSawGCode(selectedItem.project.quotationId)}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl shadow-sm text-xs transition"
                            >
                                <Download size={14} /> Export CNC Saw G-Code (.saw)
                            </Button>
                            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AluKanbanPage;
