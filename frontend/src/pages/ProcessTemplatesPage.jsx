import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Search, Edit3, Trash2,
    ChevronRight, Info, ExternalLink,
    Factory, Clock, ShieldCheck, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const ProcessTemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        stages: [{ order: 1, name: '', type: 'drying', expectedDuration: '', instructions: '' }]
    });

    const fetchTemplates = async () => {
        try {
            const { data } = await api.get('/process-templates');
            setTemplates(data.data || []);
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const openModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setForm({
                name: template.name || '',
                stages: template.stages.length > 0 ? template.stages : [{ order: 1, name: '', type: 'drying', expectedDuration: '', instructions: '' }]
            });
        } else {
            setEditingTemplate(null);
            setForm({
                name: '',
                stages: [{ order: 1, name: '', type: 'drying', expectedDuration: '', instructions: '' }]
            });
        }
        setIsModalOpen(true);
    };

    const handleAddStage = () => {
        setForm({
            ...form,
            stages: [...form.stages, { order: form.stages.length + 1, name: '', type: 'drying', expectedDuration: '', instructions: '' }]
        });
    };

    const handleRemoveStage = (index) => {
        const newStages = form.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
        setForm({ ...form, stages: newStages });
    };

    const handleStageChange = (index, field, value) => {
        const newStages = [...form.stages];
        newStages[index][field] = value;
        setForm({ ...form, stages: newStages });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                stages: form.stages.map((s) => ({
                    ...s,
                    expectedDuration: s.expectedDuration ? Number(s.expectedDuration) : undefined
                }))
            };
            if (editingTemplate) {
                await api.put(`/process-templates/${editingTemplate._id}`, payload);
                toast.success('Template updated');
            } else {
                await api.post('/process-templates', payload);
                toast.success('Template created');
            }
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/process-templates/${id}`);
            toast.success('Template deleted');
            fetchTemplates();
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    const filtered = templates.filter(t =>
        (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Process Templates</h2>
                    <p className="text-sm text-gray-500">Define standard drying, powdering, and packing procedures</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus size={18} className="mr-1.5" />
                    Create Template
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 italic">No templates found</div>
                ) : (
                    filtered.map((template) => (
                        <div key={template._id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-lg bg-primary-50 text-primary-600">
                                        <Factory size={24} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openModal(template)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDelete(template._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{template.name}</h3>
                                <p className="text-xs text-gray-500 font-mono mb-3">{template.code}</p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Clock size={14} className="text-gray-400" />
                                        <span>{template.stages?.length || 0} stages defined</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <ShieldCheck size={14} className="text-gray-400" />
                                        <span>{template.isActive ? 'Status: Active' : 'Status: Inactive'}</span>
                                    </div>
                                </div>

                                <button onClick={() => openModal(template)} className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition">
                                    Edit Configuration
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTemplate ? 'Edit Template' : 'New Process Template'} size="lg">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template Name *</label>
                        <input required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                            <h4 className="text-sm font-black text-gray-700">PROCESS STAGES</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddStage}>
                                <Plus size={14} className="mr-1" /> Add Stage
                            </Button>
                        </div>

                        {form.stages.map((stage, index) => (
                            <div key={index} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm space-y-3 relative">
                                <button type="button" onClick={() => handleRemoveStage(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"><X size={16} /></button>
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-1 flex items-center justify-center font-black text-gray-300 text-2xl">{index + 1}</div>
                                    <div className="col-span-6">
                                        <input placeholder="Stage Name (e.g. Sorting)" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50" value={stage.name} onChange={e => handleStageChange(index, 'name', e.target.value)} />
                                    </div>
                                    <div className="col-span-5">
                                        <select className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50" value={stage.type} onChange={e => handleStageChange(index, 'type', e.target.value)}>
                                            <option value="drying">Drying</option>
                                            <option value="powdering">Powdering</option>
                                            <option value="sorting">Sorting</option>
                                            <option value="packing">Packing</option>
                                            <option value="cleaning">Cleaning</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-1"></div>
                                    <div className="col-span-11 flex gap-3">
                                        <input type="number" placeholder="Hrs" className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50" value={stage.expectedDuration} onChange={e => handleStageChange(index, 'expectedDuration', e.target.value)} />
                                        <input placeholder="Instructions..." className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50" value={stage.instructions} onChange={e => handleStageChange(index, 'instructions', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={saving}>{editingTemplate ? 'Update Template' : 'Create Template'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProcessTemplatesPage;
