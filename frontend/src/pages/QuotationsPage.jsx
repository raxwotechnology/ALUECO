import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, FileText, Trash2,
    MapPin, Clock, X, ShoppingCart, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const QuotationsPage = () => {
    const [quotations, setQuotations] = useState([]);
    const [products, setProducts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        quoteNumber: '', customerId: '', status: 'draft',
        items: [{ product: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
        totalAmount: 0, tax: 0, discount: 0, grandTotal: 0,
        expiryDate: '', incoterms: 'FOB', portOfLoading: '', notes: ''
    });

    const quotationSchema = [
        { name: 'quoteNumber', label: 'Quotation Number', type: 'text', required: false },
        {
            name: 'customerId',
            label: 'Customer / Lead',
            type: 'select',
            options: leads.map(l => ({ value: l._id, label: l.companyName })),
            required: false
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'expired', label: 'Expired' }
            ]
        },
        { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
        { name: 'incoterms', label: 'Incoterms', type: 'text' },
        { name: 'portOfLoading', label: 'Port of Loading', type: 'text' },
        { name: 'notes', label: 'Internal Notes', type: 'textarea' }
    ];

    const fetchQuotations = async () => {
        try {
            const { data } = await api.get('/crm/quotations');
            setQuotations(data.data || []);
        } catch (error) {
            toast.error('Failed to load quotations');
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            const [prodRes, leadRes] = await Promise.all([
                api.get('/products'),
                api.get('/crm/inquiries')
            ]);
            setProducts(prodRes.data.data || []);
            setLeads(leadRes.data.data || []);
        } catch (error) {
            console.error('Failed to load products/leads');
        }
    };

    useEffect(() => {
        fetchQuotations();
        fetchData();
    }, []);

    const calculateTotals = (items, discount = 0) => {
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
        const grandTotal = subtotal - Number(discount || 0);
        return { subtotal, grandTotal };
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].subtotal = Number(newItems[index].quantity || 0) * Number(newItems[index].unitPrice || 0);
        }
        const { subtotal, grandTotal } = calculateTotals(newItems, formData.discount);
        setFormData({ ...formData, items: newItems, totalAmount: subtotal, grandTotal });
    };

    const addItem = () => {
        setFormData({ ...formData, items: [...formData.items, { product: '', quantity: 1, unitPrice: 0, subtotal: 0 }] });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        const { subtotal, grandTotal } = calculateTotals(newItems, formData.discount);
        setFormData({ ...formData, items: newItems, totalAmount: subtotal, grandTotal });
    };

    const openForm = (quote = null) => {
        if (quote) {
            setEditing(quote);
            setFormData({
                quoteNumber: quote.quoteNumber || '',
                customerId: quote.customerId?._id || '',
                status: quote.status || 'draft',
                items: quote.items?.length > 0 ? quote.items : [{ product: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
                totalAmount: quote.totalAmount || 0,
                grandTotal: quote.grandTotal || quote.totalAmount || 0,
                expiryDate: quote.expiryDate ? new Date(quote.expiryDate).toISOString().split('T')[0] : '',
                incoterms: quote.incoterms || 'FOB',
                portOfLoading: quote.portOfLoading || '',
                notes: quote.notes || ''
            });
        } else {
            setEditing(null);
            setFormData({
                quoteNumber: '', customerId: '', status: 'draft',
                items: [{ product: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
                totalAmount: 0, grandTotal: 0,
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                incoterms: 'FOB', portOfLoading: '', notes: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/crm/quotations/${editing._id}`, formData);
                toast.success('Quotation updated');
            } else {
                await api.post('/crm/quotations', formData);
                toast.success('Quotation created');
            }
            setIsFormOpen(false);
            fetchQuotations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleConvertToOrder = async (id) => {
        try {
            await api.post(`/crm/quotations/${id}/convert-to-order`);
            toast.success('Converted to Sales Order!');
            fetchQuotations();
        } catch (error) {
            toast.error('Conversion failed');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/crm/quotations/${deleting._id}`);
            toast.success('Quotation deleted');
            setDeleting(null);
            fetchQuotations();
        } catch { toast.error('Failed to delete'); }
    };

    const getStatusStyle = (status) => {
        const colors = {
            draft: 'text-gray-500 bg-gray-50 border-gray-200',
            sent: 'text-blue-600 bg-blue-50 border-blue-200',
            accepted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            rejected: 'text-red-600 bg-red-50 border-red-200',
            expired: 'text-orange-600 bg-orange-50 border-orange-200',
        };
        return colors[status] || 'text-gray-400 bg-gray-50';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Quotation Management</h2>
                    <p className="text-sm text-gray-500">Manage client pricing for bulk wholesale exports</p>
                </div>
                <Button variant="primary" onClick={() => openForm()}>
                    <Plus size={16} className="mr-1.5" /> New Quotation
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>)
                ) : quotations.length === 0 ? (
                    <div className="col-span-full py-20 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                        <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="italic">No active quotations</p>
                    </div>
                ) : (
                    quotations.map((quote) => (
                        <div key={quote._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col group h-full">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-gray-900">
                                        <h3 className="font-bold group-hover:text-primary-600 transition-colors uppercase tracking-tight">{quote.quoteNumber}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{quote.customerId?.companyName || 'Lead'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(quote.status)}`}>
                                        {quote.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-2xl font-black text-gray-900 font-mono">
                                        ${(quote.grandTotal || quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</div>
                                </div>
                            </div>

                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                                    <MapPin size={14} className="text-gray-400" />
                                    {quote.incoterms} · {quote.portOfLoading || 'LK CMB'}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                                    <Clock size={14} className="text-gray-400" />
                                    Exp: {quote.expiryDate ? format(new Date(quote.expiryDate), 'MMM dd, yyyy') : 'No Expiry'}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 flex gap-2 rounded-b-2xl">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => openForm(quote)}>
                                    <Edit size={14} className="mr-1" /> Edit
                                </Button>
                                {quote.status === 'accepted' && (
                                    <Button variant="primary" size="sm" className="flex-1" onClick={() => handleConvertToOrder(quote._id)}>
                                        <ShoppingCart size={14} className="mr-1" /> Convert
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setDeleting(quote)}>
                                    <Trash2 size={14} className="text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Quotation' : 'New Pricing Quotation'} size="xl">
                <div className="p-6 space-y-6">
                    <DynamicForm
                        schema={quotationSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={(e) => { }} // We'll use the submit button at the bottom of the modal instead
                        loading={saving}
                        className="!space-y-0"
                    />

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-gray-500 border-b pb-2">
                            <span className="text-xs font-black uppercase">Line Items</span>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" /> Add Product</Button>
                        </div>
                        {formData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-2 rounded-xl">
                                <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Product</label>
                                    <select className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" value={item.product?._id || item.product} onChange={e => handleItemChange(index, 'product', e.target.value)}>
                                        <option value="">Select Item</option>
                                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Qty</label>
                                    <input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Price ($)</label>
                                    <input type="number" step="0.01" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white font-mono" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2 text-right pb-2 font-black text-gray-700 text-sm font-mono">
                                    ${(Number(item.subtotal) || 0).toFixed(2)}
                                </div>
                                <div className="col-span-1 flex justify-center pb-2">
                                    <button type="button" onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 transition"><X size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center">
                        <div>
                            <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                            <div className="text-xl font-black text-gray-900 font-mono">${(formData.totalAmount || 0).toFixed(2)}</div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button type="button" variant="primary" loading={saving} onClick={handleSubmit}>{editing ? 'Save Changes' : 'Create Quotation'}</Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
                title="Delete Quotation" message={`Permanently remove ${deleting?.quoteNumber}?`} />
        </div>
    );
};

export default QuotationsPage;
