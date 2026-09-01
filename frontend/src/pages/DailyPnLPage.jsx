import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Search, DollarSign,
    TrendingUp, TrendingDown, Edit, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { getBackendUrl } from '../api/config';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DailyPnLPage = () => {
    const queryClient = useQueryClient();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        rawMaterial: 0, labourSalary: 0, supervisorQC: 0,
        electricity: 0, firewood: 0, packing: 0,
        transport: 0, communication: 0, other: 0,
        totalRevenue: 0, notes: ''
    });

    const pnlSchema = [
        { name: 'date', label: 'Date', type: 'date', required: false },
        { name: 'totalRevenue', label: 'Total Revenue', type: 'number' },
        { name: 'rawMaterial', label: 'Raw Material Cost', type: 'number' },
        { name: 'labourSalary', label: 'Labour / Salary', type: 'number' },
        { name: 'supervisorQC', label: 'Supervisor / QC', type: 'number' },
        { name: 'electricity', label: 'Electricity Cost', type: 'number' },
        { name: 'firewood', label: 'Firewood Cost', type: 'number' },
        { name: 'packing', label: 'Packing Cost', type: 'number' },
        { name: 'transport', label: 'Transport Cost', type: 'number' },
        { name: 'communication', label: 'Communication Cost', type: 'number' },
        { name: 'other', label: 'Other Expenses', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
    ];

    const fetchPnL = async () => {
        try {
            const { data } = await api.get('/reports/pnl/records'); // I'll need to create this endpoint
            setRecords(data.data || []);
        } catch (error) {
            toast.error('Failed to load P&L records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPnL();
        const socket = io(getBackendUrl(), {
            withCredentials: true,
        });
        const handleUpdate = () => {
            fetchPnL();
        };
        socket.on('cheque_cleared', handleUpdate);
        socket.on('bank_balance_update', handleUpdate);
        socket.on('financial_update', handleUpdate);
        return () => socket.disconnect();
    }, []);

    const openModal = (record = null) => {
        if (record) {
            setSelectedRecord(record);
            setFormData({
                date: record.date ? new Date(record.date).toISOString().split('T')[0] : '',
                rawMaterial: record.rawMaterial || 0,
                labourSalary: record.labourSalary || 0,
                supervisorQC: record.supervisorQC || 0,
                electricity: record.electricity || 0,
                firewood: record.firewood || 0,
                packing: record.packing || 0,
                transport: record.transport || 0,
                communication: record.communication || 0,
                other: record.other || 0,
                totalRevenue: record.totalRevenue || 0,
                notes: record.notes || ''
            });
        } else {
            setSelectedRecord(null);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                rawMaterial: 0, labourSalary: 0, supervisorQC: 0,
                electricity: 0, firewood: 0, packing: 0,
                transport: 0, communication: 0, other: 0,
                totalRevenue: 0, notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            if (selectedRecord) {
                await api.put(`/reports/pnl/records/${selectedRecord._id}`, formData);
                toast.success('P&L record updated');
            } else {
                await api.post('/reports/pnl/records', formData);
                toast.success('P&L record created');
            }
            setIsModalOpen(false);
            fetchPnL();
            queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] });
            queryClient.invalidateQueries({ queryKey: ['revenueChart'] });
            queryClient.invalidateQueries({ queryKey: ['financialSnapshot'] });
            queryClient.invalidateQueries({ queryKey: ['varianceReport'] });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save P&L record');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/reports/pnl/records/${deleting._id}`);
            toast.success('Record deleted');
            setDeleting(null);
            fetchPnL();
            queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] });
            queryClient.invalidateQueries({ queryKey: ['revenueChart'] });
            queryClient.invalidateQueries({ queryKey: ['financialSnapshot'] });
            queryClient.invalidateQueries({ queryKey: ['varianceReport'] });
        } catch (err) { toast.error('Failed to delete'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Daily P&L</h2>
                    <p className="text-sm text-gray-500">Track daily revenue, expenses, and net profit</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus size={18} className="mr-1.5" />
                    Add Daily Record
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>)
                ) : records.length === 0 ? (
                    <div className="col-span-full py-20 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500 italic">
                        No P&L records found
                    </div>
                ) : (
                    records.map((record) => (
                        <div key={record._id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-900">
                                    <h4 className="font-bold text-lg">{format(new Date(record.date), 'MMM dd, yyyy')}</h4>
                                    <p className="text-xs text-gray-400">Day {record.day || '--'}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${record.netProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {record.netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-medium text-gray-900">Revenue</span>
                                    <span className="font-bold text-gray-900">LKR {record.totalRevenue?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-medium text-gray-900">Expenses</span>
                                    <span className="font-bold text-red-500">LKR {record.totalExpenses?.toLocaleString()}</span>
                                </div>
                                <div className="pt-3 border-t flex justify-between">
                                    <span className="text-sm font-black text-gray-900 uppercase">Net Profit</span>
                                    <span className={`text-lg font-black ${record.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        LKR {record.netProfit?.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => openModal(record)}>
                                    <Edit size={14} className="mr-1" /> Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleting(record)}>
                                    <Trash2 size={14} className="text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRecord ? 'Edit Daily P&L' : 'Add Daily P&L'} size="lg">
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 p-3.5 border rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-gray-750">Autofill from System Data</p>
                            <p className="text-xs text-gray-500">Pulls sales, raw materials, labor, transport, and petty cash expenses automatically.</p>
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                                if (!formData.date) {
                                    toast.error('Select a date first');
                                    return;
                                }
                                const toastId = toast.loading('Calculating from system data...');
                                try {
                                    const { data } = await api.get(`/reports/pnl/autocalculate?date=${formData.date}`);
                                    if (data.success && data.data) {
                                        setFormData(prev => ({
                                            ...prev,
                                            ...data.data
                                        }));
                                        toast.success('Autofilled successfully', { id: toastId });
                                    } else {
                                        toast.error('Autofill failed', { id: toastId });
                                    }
                                } catch (err) {
                                    toast.error(err.response?.data?.message || 'Autofill calculation failed', { id: toastId });
                                }
                            }}
                        >
                            Pull System Data
                        </Button>
                    </div>

                    <DynamicForm
                        schema={pnlSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel={selectedRecord ? 'Update Record' : 'Save Record'}
                    />
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
                title="Delete Record" message={`Permanently remove record for ${deleting?.date ? format(new Date(deleting.date), 'MMM dd') : ''}?`} />
        </div>
    );
};

export default DailyPnLPage;
