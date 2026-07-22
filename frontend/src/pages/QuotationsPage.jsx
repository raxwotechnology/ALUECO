import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, FileText, Trash2,
    MapPin, Clock, X, ShoppingCart, Edit, Eye, Download, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../features/settings/useSettings';

const QuotationsPage = () => {
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;
    const [quotations, setQuotations] = useState([]);
    const [products, setProducts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewQuote, setPreviewQuote] = useState(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Form inputs state
    const [formData, setFormData] = useState({
        quoteNumber: '', 
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        status: 'draft',
        items: [{ product: '', productName: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
        totalAmount: 0, 
        discount: 0,
        tax: 0,
        grandTotal: 0,
        expiryDate: '', 
        incoterms: 'FOB', 
        portOfLoading: '', 
        notes: ''
    });

    // Autocomplete UI state
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [showProductSuggestions, setShowProductSuggestions] = useState(null); // stores active row index for product autocomplete

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

    const filteredQuotations = quotations.filter((quote) => {
        const matchesSearch = 
            quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (quote.customerName || quote.customerId?.companyName || 'Walk-in Client').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter ? quote.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const fetchData = async () => {
        try {
            const [prodRes, leadRes, custRes] = await Promise.all([
                api.get('/products?limit=1000&status=active').catch(err => { console.error(err); return { data: { data: [] } }; }),
                api.get('/crm/inquiries?limit=1000').catch(err => { console.error(err); return { data: { data: [] } }; }),
                api.get('/customers?limit=1000&status=active').catch(err => { console.error(err); return { data: { data: [] } }; })
            ]);
            setProducts(prodRes.data.data || []);
            setLeads(leadRes.data.data || []);
            setCustomers(custRes.data.data || []);
        } catch (error) {
            console.error('Failed to load products/leads/customers', error);
        }
    };

    useEffect(() => {
        fetchQuotations();
        fetchData();
    }, []);

    const calculateTotals = (items, discount = 0, tax = 0) => {
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
        const grandTotal = subtotal + Number(tax || 0) - Number(discount || 0);
        return { subtotal, grandTotal };
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].subtotal = Number(newItems[index].quantity || 0) * Number(newItems[index].unitPrice || 0);
        }
        const { subtotal, grandTotal } = calculateTotals(newItems, formData.discount, formData.tax);
        setFormData({ ...formData, items: newItems, totalAmount: subtotal, grandTotal });
    };

    const handleFormChange = (name, value) => {
        const updated = { ...formData, [name]: value };
        const { subtotal, grandTotal } = calculateTotals(updated.items, updated.discount, updated.tax);
        setFormData({ ...updated, totalAmount: subtotal, grandTotal });
    };

    const addItem = () => {
        setFormData({ ...formData, items: [...formData.items, { product: '', productName: '', quantity: 1, unitPrice: 0, subtotal: 0 }] });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        const { subtotal, grandTotal } = calculateTotals(newItems, formData.discount, formData.tax);
        setFormData({ ...formData, items: newItems, totalAmount: subtotal, grandTotal });
    };

    const openForm = (quote = null) => {
        if (quote) {
            setEditing(quote);
            setCustomerSearch(quote.customerName || quote.customerId?.companyName || '');
            setFormData({
                quoteNumber: quote.quoteNumber || '',
                customerId: quote.customerId?._id || quote.customerId || '',
                customerName: quote.customerName || quote.customerId?.companyName || '',
                customerEmail: quote.customerEmail || quote.customerId?.primaryContact?.email || '',
                customerPhone: quote.customerPhone || quote.customerId?.primaryContact?.phone || '',
                customerAddress: quote.customerAddress || (quote.customerId?.billingAddress ? `${quote.customerId.billingAddress.line1 || ''}, ${quote.customerId.billingAddress.city || ''}` : ''),
                status: quote.status || 'draft',
                items: quote.items?.length > 0 ? quote.items.map(item => ({
                    product: item.product?._id || item.product || '',
                    productName: item.productName || item.product?.name || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    subtotal: item.subtotal || (item.quantity * item.unitPrice) || 0
                })) : [{ product: '', productName: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
                totalAmount: quote.totalAmount || 0,
                discount: quote.discount || 0,
                tax: quote.tax || 0,
                grandTotal: quote.grandTotal || quote.totalAmount || 0,
                expiryDate: quote.expiryDate ? new Date(quote.expiryDate).toISOString().split('T')[0] : '',
                incoterms: quote.incoterms || 'FOB',
                portOfLoading: quote.portOfLoading || '',
                notes: quote.notes || ''
            });
        } else {
            setEditing(null);
            setCustomerSearch('');
            setFormData({
                quoteNumber: '', 
                customerId: '', 
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                customerAddress: '',
                status: 'draft',
                items: [{ product: '', productName: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
                totalAmount: 0, 
                discount: 0,
                tax: 0,
                grandTotal: 0,
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                incoterms: 'FOB', 
                portOfLoading: '', 
                notes: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerName) {
            toast.error('Please enter or select a customer name');
            return;
        }
        if (formData.items.some(item => !item.productName)) {
            toast.error('Please select or type a name for all product line items');
            return;
        }

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

    const handleDownloadPDF = (quote) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // 1. Header (Primary Accent)
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, pageWidth, 40, 'F');

        let textLeftX = 14;
        // Primary Logo (Top-Left)
        if (settings?.companyLogo) {
            try {
                doc.addImage(settings.companyLogo, 'PNG', 14, 6, 26, 26);
                textLeftX = 44;
            } catch (e) {
                try {
                    doc.addImage(settings.companyLogo, 'JPEG', 14, 6, 26, 26);
                    textLeftX = 44;
                } catch (err) {}
            }
        }

        let textRightX = pageWidth - 14;
        // Secondary Logo (Top-Right)
        if (settings?.secondaryLogo) {
            try {
                doc.addImage(settings.secondaryLogo, 'PNG', pageWidth - 38, 6, 24, 24);
                textRightX = pageWidth - 42;
            } catch (e) {
                try {
                    doc.addImage(settings.secondaryLogo, 'JPEG', pageWidth - 38, 6, 24, 24);
                    textRightX = pageWidth - 42;
                } catch (err) {}
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.companyName || 'EXPORT LANKA').toUpperCase(), textLeftX, 17);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(settings?.companyAddress || 'Colombo, Sri Lanka', textLeftX, 23);
        
        const contactInfo = [
            settings?.companyPhone ? `Tel: ${settings.companyPhone}` : '',
            settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''
        ].filter(Boolean).join(' | ') || 'info@exportlanka.com';
        doc.text(contactInfo, textLeftX, 28);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('QUOTATION', textRightX, 17, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Quote Ref: ${quote.quoteNumber}`, textRightX, 24, { align: 'right' });
        doc.text(`Status: ${(quote.status || 'draft').toUpperCase()}`, textRightX, 29, { align: 'right' });

        // 2. Client Details & Date details
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('QUOTED TO (CLIENT)', 14, 52);
        
        doc.setFont('helvetica', 'normal');
        doc.text([
            quote.customerName || quote.customerId?.companyName || 'Walk-in Client',
            quote.customerEmail ? `Email: ${quote.customerEmail}` : '',
            quote.customerPhone ? `Tel: ${quote.customerPhone}` : '',
            quote.customerAddress ? `Address: ${quote.customerAddress}` : ''
        ].filter(Boolean), 14, 58);

        doc.setFont('helvetica', 'bold');
        doc.text('QUOTE METADATA', pageWidth - 14, 52, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.text([
            `Expiry Date: ${quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString('en-LK') : 'No Expiry'}`,
            `Incoterms: ${quote.incoterms || 'FOB'}`,
            `Port of Loading: ${quote.portOfLoading || 'Colombo (CMB)'}`,
        ].filter(Boolean), pageWidth - 14, 58, { align: 'right' });

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.line(14, 78, pageWidth - 14, 78);

        // 3. Items Table
        const columns = ['#', 'Product Description', 'Qty', 'Unit Price (LKR)', 'Subtotal (LKR)'];
        const rows = (quote.items || []).map((item, idx) => [
            idx + 1,
            item.productName || (item.product?.name) || 'Custom Item',
            item.quantity,
            item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 }),
            item.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })
        ]);

        autoTable(doc, {
            startY: 85,
            head: [columns],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { width: 10 },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'normal' },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;

        // 4. Totals (Right side)
        const summaryX = pageWidth - 90;
        doc.setFontSize(10);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', summaryX, finalY);
        doc.text(quote.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 }), pageWidth - 14, finalY, { align: 'right' });

        if (quote.discount > 0) {
            doc.text('Discount:', summaryX, finalY + 6);
            doc.text(`-${quote.discount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + 6, { align: 'right' });
        }

        if (quote.tax > 0) {
            doc.text('Tax:', summaryX, finalY + (quote.discount > 0 ? 12 : 6));
            doc.text(quote.tax.toLocaleString('en-LK', { minimumFractionDigits: 2 }), pageWidth - 14, finalY + (quote.discount > 0 ? 12 : 6), { align: 'right' });
        }

        const grandTotalY = finalY + (quote.discount > 0 ? (quote.tax > 0 ? 18 : 12) : (quote.tax > 0 ? 12 : 6));
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total (LKR):', summaryX, grandTotalY);
        doc.text(quote.grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 }), pageWidth - 14, grandTotalY, { align: 'right' });

        // 5. Notes
        if (quote.notes) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Notes / Instructions:', 14, grandTotalY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(quote.notes, 14, grandTotalY + 20, { maxWidth: pageWidth - 28 });
        }

        // 6. Signatures (Bottom of page)
        const bottomY = doc.internal.pageSize.height - 35;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, bottomY, 64, bottomY);
        doc.line(pageWidth - 64, bottomY, pageWidth - 14, bottomY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Prepared By / Sales Rep', 39, bottomY + 5, { align: 'center' });
        doc.text('Client Acceptance', pageWidth - 39, bottomY + 5, { align: 'center' });

        doc.save(`Quotation_${quote.quoteNumber}.pdf`);
    };

    const getStatusStyle = (status) => {
        const colors = {
            draft: 'text-gray-500 bg-gray-50 border-gray-200',
            sent: 'text-blue-600 bg-blue-50 border-blue-200',
            accepted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            rejected: 'text-red-600 bg-red-50 border-red-200',
            expired: 'text-orange-600 bg-orange-50 border-orange-200',
            converted: 'text-purple-600 bg-purple-50 border-purple-200'
        };
        return colors[status] || 'text-gray-400 bg-gray-50';
    };

    // Contacts list search filter (Lead or Customer)
    const getFilteredContacts = () => {
        const q = customerSearch.toLowerCase();
        const results = [];
        customers.forEach(c => {
            const name = c.displayName || c.companyName || '';
            if (name.toLowerCase().includes(q)) {
                results.push({ id: c._id, name, type: 'Customer', original: c });
            }
        });
        leads.forEach(l => {
            const name = l.companyName || l.contactPerson || '';
            if (name.toLowerCase().includes(q)) {
                results.push({ id: l._id, name, type: 'Lead', original: l });
            }
        });
        return results.slice(0, 8); // limit suggestions
    };

    const handleSelectContact = (contact) => {
        setCustomerSearch(contact.name);
        setShowCustomerSuggestions(false);
        
        let email = '';
        let phone = '';
        let address = '';

        if (contact.type === 'Customer') {
            email = contact.original.primaryContact?.email || '';
            phone = contact.original.primaryContact?.phone || '';
            const b = contact.original.billingAddress;
            address = b ? `${b.line1 || ''}, ${b.city || ''}, ${b.country || 'Sri Lanka'}` : '';
        } else {
            email = contact.original.email || contact.original.prospectEmail || '';
            phone = contact.original.phone || '';
            address = contact.original.country || contact.original.prospectCountry || '';
        }

        setFormData(prev => ({
            ...prev,
            customerId: contact.id,
            customerName: contact.name,
            customerEmail: email,
            customerPhone: phone,
            customerAddress: address
        }));
    };

    // Products Autocomplete logic
    const getFilteredProducts = (query) => {
        const q = query.toLowerCase();
        return products.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 8);
    };

    const handleSelectProduct = (index, product) => {
        const newItems = [...formData.items];
        newItems[index].product = product._id;
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.basePrice || product.mrp || 0;
        newItems[index].subtotal = newItems[index].quantity * newItems[index].unitPrice;
        
        setShowProductSuggestions(null);
        
        const { subtotal, grandTotal } = calculateTotals(newItems, formData.discount, formData.tax);
        setFormData({ ...formData, items: newItems, totalAmount: subtotal, grandTotal });
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

            {/* Search and Filter Controls */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by quote reference, customer name..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <select 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>)
                ) : filteredQuotations.length === 0 ? (
                    <div className="col-span-full py-20 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                        <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="italic">No matching quotations found</p>
                    </div>
                ) : (
                    filteredQuotations.map((quote) => (
                        <div key={quote._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col group h-full">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-gray-900">
                                        <h3 className="font-bold group-hover:text-primary-600 transition-colors uppercase tracking-tight">{quote.quoteNumber}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{quote.customerName || quote.customerId?.companyName || 'Walk-in Client'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(quote.status)}`}>
                                        {quote.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-2xl font-black text-gray-900 font-mono">
                                        Rs. {(quote.grandTotal || quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</div>
                                </div>
                            </div>

                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                                    <MapPin size={14} className="text-gray-400" />
                                    {quote.incoterms || 'FOB'} · {quote.portOfLoading || 'LK CMB'}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                                    <Clock size={14} className="text-gray-400" />
                                    Exp: {quote.expiryDate ? format(new Date(quote.expiryDate), 'MMM dd, yyyy') : 'No Expiry'}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 flex gap-2 rounded-b-2xl">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setPreviewQuote(quote); setIsPreviewOpen(true); }}>
                                    <Eye size={14} className="mr-1" /> View
                                </Button>
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

            {/* Quotation Form Modal */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Quotation' : 'New Pricing Quotation'} size="xl">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Customer Search Autocomplete */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Search Customer / Lead</label>
                            <div className="flex items-center border border-gray-200 rounded-lg px-3 bg-white">
                                <Search size={16} className="text-gray-400 mr-2" />
                                <input 
                                    type="text" 
                                    className="w-full py-1.5 text-sm focus:outline-none bg-transparent"
                                    placeholder="Type to search active clients..." 
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setFormData(prev => ({ ...prev, customerName: e.target.value, customerId: '' }));
                                        setShowCustomerSuggestions(true);
                                    }}
                                    onFocus={() => setShowCustomerSuggestions(true)}
                                />
                            </div>
                            
                            {showCustomerSuggestions && customerSearch && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {getFilteredContacts().length > 0 ? (
                                        getFilteredContacts().map((contact) => (
                                            <div 
                                                key={contact.id + contact.type}
                                                className="px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                onClick={() => handleSelectContact(contact)}
                                            >
                                                <span className="font-semibold text-gray-800">{contact.name}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">{contact.type}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-xs text-gray-400 italic">No matches found. Storing as manual name.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quote Number</label>
                            <input 
                                type="text"
                                name="quoteNumber"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none"
                                value={formData.quoteNumber}
                                placeholder="Auto-generated if blank"
                                onChange={(e) => handleFormChange('quoteNumber', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Customer Details Inputs */}
                    <div className="bg-slate-50/50 p-4 rounded-xl space-y-4">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Customer Details</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contact Email</label>
                                <input 
                                    type="email"
                                    name="customerEmail"
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={formData.customerEmail}
                                    placeholder="client@email.com"
                                    onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contact Phone</label>
                                <input 
                                    type="text"
                                    name="customerPhone"
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={formData.customerPhone}
                                    placeholder="+94 77 XXX XXXX"
                                    onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Billing/Shipping Address</label>
                                <input 
                                    type="text"
                                    name="customerAddress"
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={formData.customerAddress}
                                    placeholder="Street, City, Country"
                                    onChange={(e) => handleFormChange('customerAddress', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quotation Metadata Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                            <select 
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                value={formData.status}
                                onChange={(e) => handleFormChange('status', e.target.value)}
                            >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Expiry Date</label>
                            <input 
                                type="date"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                value={formData.expiryDate}
                                onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Incoterms</label>
                            <input 
                                type="text"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                placeholder="FOB, CIF, EXW"
                                value={formData.incoterms}
                                onChange={(e) => handleFormChange('incoterms', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Port of Loading</label>
                            <input 
                                type="text"
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                placeholder="e.g. Colombo CMB"
                                value={formData.portOfLoading}
                                onChange={(e) => handleFormChange('portOfLoading', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-gray-500 border-b pb-2">
                            <span className="text-xs font-black uppercase">Line Items</span>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" /> Add Product</Button>
                        </div>                        {formData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-2 rounded-xl relative">
                                
                                {/* Product Search Autocomplete */}
                                <div className="col-span-12 md:col-span-4 space-y-1 relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Product Description</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                                        placeholder="Type product name..."
                                        value={item.productName}
                                        onChange={(e) => {
                                            handleItemChange(index, 'productName', e.target.value);
                                            handleItemChange(index, 'product', '');
                                            setShowProductSuggestions(index);
                                        }}
                                        onFocus={() => setShowProductSuggestions(index)}
                                    />
                                    
                                    {showProductSuggestions === index && item.productName && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {getFilteredProducts(item.productName).length > 0 ? (
                                                getFilteredProducts(item.productName).map((p) => (
                                                    <div 
                                                        key={p._id}
                                                        className="px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                        onClick={() => handleSelectProduct(index, p)}
                                                    >
                                                        <span className="font-semibold text-gray-800">{p.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">Rs.{p.basePrice || p.mrp || 0}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-xs text-gray-400 italic">No matches. Storing as custom item name.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
 
                                <div className="col-span-4 md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Qty</label>
                                    <input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} />
                                </div>
                                <div className="col-span-4 md:col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Price (LKR)</label>
                                    <input type="number" step="0.01" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white font-mono" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} />
                                </div>
                                <div className="col-span-3 md:col-span-2 text-right pb-2 font-black text-gray-700 text-xs sm:text-sm font-mono">
                                    Rs. {(Number(item.subtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="col-span-1 flex justify-center pb-2">
                                    <button type="button" onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 transition" disabled={formData.items.length <= 1}><X size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tax, Discount, Notes & Summary Calculations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quotation Notes / Terms</label>
                            <textarea 
                                rows={4}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                                placeholder="Payment terms, shipping specifications, target validity details..."
                                value={formData.notes}
                                onChange={(e) => handleFormChange('notes', e.target.value)}
                            />
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-mono text-gray-800">Rs. {formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
                                <span>Discount</span>
                                <input 
                                    type="number" 
                                    className="w-32 px-2 py-1 border rounded-lg text-right font-mono text-sm bg-white"
                                    value={formData.discount} 
                                    onChange={(e) => handleFormChange('discount', Number(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
                                <span>Tax (VAT/Other)</span>
                                <input 
                                    type="number" 
                                    className="w-32 px-2 py-1 border rounded-lg text-right font-mono text-sm bg-white"
                                    value={formData.tax} 
                                    onChange={(e) => handleFormChange('tax', Number(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t font-black text-gray-900">
                                <span>Grand Total</span>
                                <span className="font-mono text-lg text-primary-600">Rs. {formData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>{editing ? 'Save Changes' : 'Create Quotation'}</Button>
                    </div>
                </form>
            </Modal>

            {/* A4 Document Preview Modal */}
            <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Quotation A4 Preview" size="xl">
                {previewQuote && (
                    <div className="p-6 space-y-6">
                        {/* Printable Area styled like A4 Sheet */}
                        <div className="bg-white border border-gray-300 rounded-xl p-4 sm:p-8 shadow-sm font-sans text-gray-800 max-w-[800px] mx-auto">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-4 mb-6 gap-4">
                                <div className="flex items-center gap-4">
                                    {settings?.companyLogo && (
                                        <img
                                            src={settings.companyLogo}
                                            className="w-14 h-14 object-contain rounded-lg border border-gray-100 p-0.5 flex-shrink-0"
                                            alt="Company Logo"
                                        />
                                    )}
                                    <div>
                                        <h1 className="text-2xl font-black tracking-wider text-primary-600">
                                            {settings?.companyName || 'EXPORT LANKA'}
                                        </h1>
                                        <p className="text-xs text-gray-400 mt-0.5 font-semibold">
                                            {settings?.companyAddress || 'Colombo, Sri Lanka'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {settings?.companyPhone ? `Tel: ${settings.companyPhone}` : ''}
                                            {settings?.companyPhone && settings?.companyEmail ? ' | ' : ''}
                                            {settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''}
                                            {!settings?.companyPhone && !settings?.companyEmail ? 'info@exportlanka.com' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                                    {settings?.secondaryLogo && (
                                        <img
                                            src={settings.secondaryLogo}
                                            className="w-14 h-14 object-contain rounded-lg border border-gray-100 p-0.5 mb-1.5"
                                            alt="Secondary Logo"
                                        />
                                    )}
                                    <h2 className="text-3xl font-black text-slate-700 tracking-tight">QUOTATION</h2>
                                    <p className="text-xs font-bold text-gray-400 font-mono mt-1">Ref: {previewQuote.quoteNumber}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 text-[9px] font-black uppercase rounded bg-slate-100 text-slate-500 border">{previewQuote.status}</span>
                                </div>
                            </div>

                            {/* Client & Metadata Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs mb-6">
                                <div>
                                    <h4 className="font-bold text-gray-400 uppercase tracking-widest mb-1.5">CLIENT DETAILS</h4>
                                    <p className="font-black text-sm text-gray-900">{previewQuote.customerName || previewQuote.customerId?.companyName || 'Walk-in Client'}</p>
                                    {previewQuote.customerEmail && <p className="mt-1 text-gray-500">Email: {previewQuote.customerEmail}</p>}
                                    {previewQuote.customerPhone && <p className="text-gray-500">Phone: {previewQuote.customerPhone}</p>}
                                    {previewQuote.customerAddress && <p className="text-gray-500">Address: {previewQuote.customerAddress}</p>}
                                </div>
                                <div className="text-left sm:text-right">
                                    <h4 className="font-bold text-gray-400 uppercase tracking-widest mb-1.5">QUOTE METADATA</h4>
                                    <p className="text-gray-500">Expiry Date: <span className="font-semibold text-gray-800">{previewQuote.expiryDate ? format(new Date(previewQuote.expiryDate), 'MMM dd, yyyy') : 'No Expiry'}</span></p>
                                    <p className="text-gray-500">Incoterms: <span className="font-semibold text-gray-800">{previewQuote.incoterms || 'FOB'}</span></p>
                                    <p className="text-gray-500">Port of Loading: <span className="font-semibold text-gray-800">{previewQuote.portOfLoading || 'Colombo CMB'}</span></p>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
                                <table className="w-full text-xs text-left min-w-[600px]">
                                <thead className="bg-slate-50 text-gray-500 font-bold border-y">
                                    <tr>
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-3">Product Description</th>
                                        <th className="py-2.5 px-3 text-right">Qty</th>
                                        <th className="py-2.5 px-3 text-right">Unit Price (LKR)</th>
                                        <th className="py-2.5 px-3 text-right">Subtotal (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(previewQuote.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 px-3 text-gray-400 font-mono">{idx + 1}</td>
                                            <td className="py-3 px-3 font-semibold text-gray-900">{item.productName || item.product?.name || 'Custom Product'}</td>
                                            <td className="py-3 px-3 text-right font-semibold">{item.quantity}</td>
                                            <td className="py-3 px-3 text-right font-mono">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">{item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>

                            {/* Summary Calculations */}
                            <div className="flex justify-end text-xs mb-8">
                                <div className="w-64 space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-gray-500 font-semibold">
                                        <span>Subtotal</span>
                                        <span className="font-mono text-gray-800">Rs. {previewQuote.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {previewQuote.discount > 0 && (
                                        <div className="flex justify-between text-gray-500 font-semibold">
                                            <span>Discount</span>
                                            <span className="font-mono text-red-500">-Rs. {previewQuote.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {previewQuote.tax > 0 && (
                                        <div className="flex justify-between text-gray-500 font-semibold">
                                            <span>Tax</span>
                                            <span className="font-mono text-gray-800">Rs. {previewQuote.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t text-sm font-black text-gray-900">
                                        <span>Grand Total</span>
                                        <span className="font-mono text-primary-600">Rs. {previewQuote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Notes */}
                            {previewQuote.notes && (
                                <div className="border-t pt-4 text-[10px] text-gray-500">
                                    <h5 className="font-bold text-gray-400 mb-1">Notes / Instructions:</h5>
                                    <p className="whitespace-pre-wrap">{previewQuote.notes}</p>
                                </div>
                            )}

                            {/* Signatures */}
                            <div className="flex justify-between mt-12 text-[10px] text-gray-400 border-t pt-6">
                                <div className="text-center w-36">
                                    <div className="border-b h-8 w-full mb-1"></div>
                                    <span>Prepared By / Sales Rep</span>
                                </div>
                                <div className="text-center w-36">
                                    <div className="border-b h-8 w-full mb-1"></div>
                                    <span>Client Acceptance</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
                            <Button variant="primary" onClick={() => handleDownloadPDF(previewQuote)}>
                                <Download size={16} className="mr-1.5" /> Download Professional PDF
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
                title="Delete Quotation" message={`Permanently remove ${deleting?.quoteNumber}?`} />
        </div>
    );
};

export default QuotationsPage;
