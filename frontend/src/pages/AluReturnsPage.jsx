import React, { useState, useEffect } from 'react';
import { RotateCcw, Truck, UserCheck, Download, Trash2, Edit, Plus, MoreVertical } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { downloadCSV } from '../utils/exportUtils';
import { useCustomers } from '../features/customers/useCustomers';
import CustomerAutocompleteSelect from '../components/ui/CustomerAutocompleteSelect';

export default function AluReturnsPage({ defaultTab = 'customer' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [customerReturns, setCustomerReturns] = useState([]);
    const [supplierReturns, setSupplierReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch customers for dropdown
    const { data: customersData, isLoading: customersLoading } = useCustomers({ status: 'active', limit: 1000 });
    const customers = customersData?.data || [];

    // Admin Delete State
    const [deleteItem, setDeleteItem] = useState(null);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Add Return Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newReturn, setNewReturn] = useState({
        returnCode: '',
        customerId: '',
        customerName: '',
        supplierName: '',
        reason: '',
        totalRefundAmount: 0,
        totalCreditAmount: 0,
        status: 'Pending'
    });

    // Status change state
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
    const [editingStatusItem, setEditingStatusItem] = useState(null);

    useEffect(() => {
        fetchReturnsData(activeTab);
    }, [activeTab]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownOpen && !event.target.closest('.status-dropdown')) {
                setStatusDropdownOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [statusDropdownOpen]);

    const fetchReturnsData = async (tab) => {
        setLoading(true);
        try {
            if (tab === 'customer') {
                const res = await api.get('/returns');
                setCustomerReturns(res.data?.data || []);
            } else {
                const res = await api.get('/supplier-returns');
                setSupplierReturns(res.data?.data || []);
            }
        } catch (err) {
            toast.error('Failed to load returns data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (activeTab === 'customer') {
            const data = customerReturns.map(ret => ({
                ReturnCode: ret.returnCode,
                CustomerName: ret.customerName || ret.customerId?.displayName || 'Client',
                Reason: ret.reason || 'Variance / Fitting',
                TotalRefundAmount: ret.totalRefundAmount || 0,
                Status: ret.status,
                Date: new Date(ret.createdAt).toLocaleDateString()
            }));
            downloadCSV(data, `Alueco_Customer_Returns_${Date.now()}.csv`);
        } else {
            const data = supplierReturns.map(ret => ({
                ReturnCode: ret.returnCode,
                SupplierName: ret.supplierName || ret.supplierId?.displayName || 'Vendor',
                Reason: ret.reason || 'Defective Raw Material',
                TotalCreditAmount: ret.totalCreditAmount || 0,
                Status: ret.status,
                Date: new Date(ret.createdAt).toLocaleDateString()
            }));
            downloadCSV(data, `Alueco_Supplier_Returns_${Date.now()}.csv`);
        }
    };

    const requestDelete = (item, type) => {
        setDeleteItem({ item, type });
        setShowAdminModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        try {
            if (deleteItem.type === 'customer') {
                await api.delete(`/returns/${deleteItem.item._id}`);
                toast.success('Customer return deleted successfully');
                fetchReturnsData('customer');
            } else {
                await api.delete(`/supplier-returns/${deleteItem.item._id}`);
                toast.success('Supplier return deleted successfully');
                fetchReturnsData('supplier');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete return record');
        } finally {
            setDeleteItem(null);
        }
    };

    const handleAddReturn = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'customer') {
                await api.post('/returns', {
                    returnCode: newReturn.returnCode,
                    customerId: newReturn.customerId,
                    customerName: newReturn.customerName,
                    reason: newReturn.reason,
                    totalRefundAmount: newReturn.totalRefundAmount,
                    status: newReturn.status
                });
                toast.success('Customer return added successfully');
                fetchReturnsData('customer');
            } else {
                await api.post('/supplier-returns', {
                    returnCode: newReturn.returnCode,
                    supplierName: newReturn.supplierName,
                    reason: newReturn.reason,
                    totalCreditAmount: newReturn.totalCreditAmount,
                    status: newReturn.status
                });
                toast.success('Supplier return added successfully');
                fetchReturnsData('supplier');
            }
            setShowAddModal(false);
            setNewReturn({
                returnCode: '',
                customerId: '',
                customerName: '',
                supplierName: '',
                reason: '',
                totalRefundAmount: 0,
                totalCreditAmount: 0,
                status: 'Pending'
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add return record');
        }
    };

    const openAddModal = () => {
        setNewReturn({
            returnCode: '',
            customerId: '',
            customerName: '',
            supplierName: '',
            reason: '',
            totalRefundAmount: 0,
            totalCreditAmount: 0,
            status: 'Pending'
        });
        setShowAddModal(true);
    };

    const handleStatusChange = async (item, newStatus, type) => {
        try {
            if (type === 'customer') {
                await api.patch(`/customer-returns/${item._id}/status`, { status: newStatus });
                toast.success('Customer return status updated');
                fetchReturnsData('customer');
            } else {
                await api.patch(`/supplier-returns/${item._id}/status`, { status: newStatus });
                toast.success('Supplier return status updated');
                fetchReturnsData('supplier');
            }
            setStatusDropdownOpen(null);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const toggleStatusDropdown = (itemId) => {
        setStatusDropdownOpen(statusDropdownOpen === itemId ? null : itemId);
    };

    const customerStatusOptions = ['Pending', 'Approved', 'Rejected', 'Received', 'Processing', 'Completed'];
    const supplierStatusOptions = ['draft', 'approved', 'sent', 'credit_received', 'completed'];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <RotateCcw size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Returns Management — Alueco</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Logging returned project components, defective raw materials & credit tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                        <Plus size={15} /> Add Return
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-xl border shadow-sm overflow-x-auto gap-2">
                <button
                    onClick={() => setActiveTab('customer')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'customer'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <UserCheck size={16} />
                    Customer Project Returns
                </button>
                <button
                    onClick={() => setActiveTab('supplier')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'supplier'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Truck size={16} />
                    Supplier Raw Material Returns
                </button>
            </div>

            {/* Customer Returns Tab */}
            {activeTab === 'customer' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                        Customer Project Component & Finished Item Returns
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading returns...</div>
                    ) : customerReturns.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No customer returns logged yet.</div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="p-3.5">Return Code</th>
                                    <th className="p-3.5">Customer</th>
                                    <th className="p-3.5">Reason</th>
                                    <th className="p-3.5">Total Value</th>
                                    <th className="p-3.5">Status</th>
                                    <th className="p-3.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {customerReturns.map((ret) => (
                                    <tr key={ret._id} className="hover:bg-slate-50/80">
                                        <td className="p-3.5 font-bold text-emerald-600">{ret.returnCode}</td>
                                        <td className="p-3.5">{ret.customerName || ret.customerId?.displayName || 'Client'}</td>
                                        <td className="p-3.5">{ret.reason || 'Dimension Variance / Site Fitting'}</td>
                                        <td className="p-3.5 font-bold text-slate-800">LKR {(ret.totalRefundAmount || 0).toLocaleString()}</td>
                                        <td className="p-3.5">
                                            <div className="relative status-dropdown">
                                                <button
                                                    onClick={() => toggleStatusDropdown(ret._id)}
                                                    className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold hover:bg-emerald-200 transition"
                                                >
                                                    {ret.status}
                                                </button>
                                                {statusDropdownOpen === ret._id && (
                                                    <div className="absolute z-10 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg">
                                                        {customerStatusOptions.map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusChange(ret, status, 'customer')}
                                                                className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-100 transition"
                                                            >
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <button
                                                onClick={() => requestDelete(ret, 'customer')}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete (Requires Admin Password)"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Supplier Returns Tab */}
            {activeTab === 'supplier' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                        Defective Raw Aluminium, Glass & Hardware Returns to Vendors
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading supplier returns...</div>
                    ) : supplierReturns.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No supplier returns logged yet.</div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="p-3.5">Return Code</th>
                                    <th className="p-3.5">Supplier</th>
                                    <th className="p-3.5">Reason</th>
                                    <th className="p-3.5">Credit Value</th>
                                    <th className="p-3.5">Status</th>
                                    <th className="p-3.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {supplierReturns.map((ret) => (
                                    <tr key={ret._id} className="hover:bg-slate-50/80">
                                        <td className="p-3.5 font-bold text-emerald-600">{ret.returnCode}</td>
                                        <td className="p-3.5">{ret.supplierName || ret.supplierId?.displayName || 'Vendor'}</td>
                                        <td className="p-3.5">{ret.reason || 'Powder Coating Defect / Scratch'}</td>
                                        <td className="p-3.5 font-bold text-slate-800">LKR {(ret.totalCreditAmount || 0).toLocaleString()}</td>
                                        <td className="p-3.5">
                                            <div className="relative status-dropdown">
                                                <button
                                                    onClick={() => toggleStatusDropdown(ret._id)}
                                                    className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold hover:bg-amber-200 transition"
                                                >
                                                    {ret.status}
                                                </button>
                                                {statusDropdownOpen === ret._id && (
                                                    <div className="absolute z-10 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg">
                                                        {supplierStatusOptions.map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusChange(ret, status, 'supplier')}
                                                                className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-100 transition"
                                                            >
                                                                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <button
                                                onClick={() => requestDelete(ret, 'supplier')}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete (Requires Admin Password)"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Admin Password Modal */}
            <AdminPasswordModal
                isOpen={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onConfirm={confirmDelete}
                title="Delete Return Record"
            />

            {/* Add Return Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">
                            {activeTab === 'customer' ? 'Add Customer Return' : 'Add Supplier Return'}
                        </h3>
                        <form onSubmit={handleAddReturn} className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Return Code</label>
                                <input
                                    type="text"
                                    value={newReturn.returnCode}
                                    onChange={(e) => setNewReturn({ ...newReturn, returnCode: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    required
                                />
                            </div>
                            {activeTab === 'customer' ? (
                                <>
                                    {customersLoading ? (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 block mb-1">Customer</label>
                                            <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400">
                                                Loading customers...
                                            </div>
                                        </div>
                                    ) : (
                                        <CustomerAutocompleteSelect
                                            label="Customer"
                                            placeholder="Select or search customer..."
                                            customers={customers || []}
                                            value={newReturn.customerId}
                                            onChange={(customerId, customer) => {
                                                setNewReturn({ ...newReturn, customerId, customerName: customer?.displayName || '' });
                                            }}
                                            required
                                        />
                                    )}
                                </>
                            ) : (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Supplier Name</label>
                                    <input
                                        type="text"
                                        value={newReturn.supplierName}
                                        onChange={(e) => setNewReturn({ ...newReturn, supplierName: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={newReturn.reason}
                                    onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    required
                                />
                            </div>
                            {activeTab === 'customer' ? (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Total Refund Amount (LKR)</label>
                                    <input
                                        type="number"
                                        value={newReturn.totalRefundAmount}
                                        onChange={(e) => setNewReturn({ ...newReturn, totalRefundAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 block mb-1">Total Credit Amount (LKR)</label>
                                    <input
                                        type="number"
                                        value={newReturn.totalCreditAmount}
                                        onChange={(e) => setNewReturn({ ...newReturn, totalCreditAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Status</label>
                                <select
                                    value={newReturn.status}
                                    onChange={(e) => setNewReturn({ ...newReturn, status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg"
                                >
                                    Add Return
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
