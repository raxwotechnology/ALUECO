import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, User, DollarSign, FileText, ShoppingCart, Truck, CreditCard, Layers, Clock, AlertTriangle, CheckCircle, Ban, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CustomerStatementModal from '../features/customers/CustomerStatementModal';

export default function CustomerDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [invoiceSubTab, setInvoiceSubTab] = useState('all');
    const [isStatementOpen, setIsStatementOpen] = useState(false);

    // Data lists for tabs
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            const [custRes, invRes, payRes, quoteRes, orderRes] = await Promise.all([
                api.get(`/customers/${id}`),
                api.get(`/invoices?customerId=${id}&limit=100`),
                api.get(`/payments?customerId=${id}&limit=100`),
                api.get(`/alu/quotations?limit=100`),
                api.get(`/sales-orders?customerId=${id}&limit=100`)
            ]);

            setCustomer(custRes.data.data);
            setInvoices(invRes.data.data || []);
            setPayments(payRes.data.data || []);
            
            // Filter quotations by customer name
            const custName = custRes.data.data?.displayName?.toLowerCase();
            const filteredQuotes = (quoteRes.data.data || []).filter(q => 
                q.customerName?.toLowerCase() === custName
            );
            setQuotations(filteredQuotes);
            setSalesOrders(orderRes.data.data || []);
        } catch (error) {
            toast.error('Failed to load customer profile details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerData();
    }, [id]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Customer Profile...</div>;
    if (!customer) return <div className="p-8 text-center text-rose-500">Customer not found!</div>;

    // Invoice Sub-tab filtering
    const filteredInvoices = invoices.filter(inv => {
        if (invoiceSubTab === 'draft') return inv.status === 'draft';
        if (invoiceSubTab === 'unpaid') return ['unpaid', 'overdue', 'partially_paid'].includes(inv.paymentStatus);
        if (invoiceSubTab === 'paid') return inv.paymentStatus === 'paid';
        if (invoiceSubTab === 'cancelled') return inv.status === 'cancelled';
        return true;
    });

    const totalInvoiceVal = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalPaidVal = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalUnpaidVal = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
                        <ArrowLeft size={16} className="mr-1" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <User className="text-indigo-600" size={24} /> {customer.displayName}
                        </h1>
                        <p className="text-xs text-slate-500 font-mono">{customer.customerCode} | {customer.companyName || 'Individual'}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => setIsStatementOpen(true)}>
                        <FileText size={15} className="mr-1.5" /> Customer Statement
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">{fmt(totalInvoiceVal)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</span>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{fmt(totalPaidVal)}</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Outstanding Balance</span>
                    <p className="text-lg font-bold text-rose-700 mt-1">{fmt(totalUnpaidVal)}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Credit Limit / Terms</span>
                    <p className="text-lg font-bold text-indigo-700 mt-1">{fmt(customer.creditLimit || 0)}</p>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs font-bold">
                {[
                    { id: 'overview', label: 'Overview & Activity', icon: Layers },
                    { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
                    { id: 'payments', label: `Payments & Receipts (${payments.length})`, icon: CreditCard },
                    { id: 'quotations', label: `Quotations (${quotations.length})`, icon: DollarSign },
                    { id: 'salesOrders', label: `Sales Orders (${salesOrders.length})`, icon: ShoppingCart },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 py-3 px-4 border-b-2 font-medium transition ${
                            activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600 font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENTS */}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Primary Contact & Address</h3>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Contact Person</p>
                                    <p className="font-semibold text-slate-800 mt-0.5">{customer.primaryContact?.name || customer.displayName}</p>
                                    <p className="text-slate-500">{customer.primaryContact?.phone || 'No phone'}</p>
                                    <p className="text-slate-500">{customer.primaryContact?.email || 'No email'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Billing Address</p>
                                    <p className="text-slate-700 mt-0.5">{customer.primaryAddress?.line1 || 'No address'}</p>
                                    <p className="text-slate-500">{customer.primaryAddress?.city}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Transactions Overview</h3>
                            <div className="space-y-2 text-xs">
                                {invoices.slice(0, 5).map(inv => (
                                    <div key={inv._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-900">Invoice #{inv.invoiceNumber}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold font-mono text-slate-900">{fmt(inv.grandTotal)}</p>
                                            <span className={`text-[10px] font-bold ${inv.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {inv.paymentStatus?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">Account Status</h3>
                            <p className="text-xl font-extrabold text-white mt-1 uppercase tracking-wide">{customer.status}</p>
                            {customer.creditStatus?.onCreditHold && (
                                <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                                    <AlertTriangle size={16} /> Credit Hold: {customer.creditStatus.creditHoldReason || 'Overdue limit reached'}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
                <div className="space-y-4">
                    {/* Sub-tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
                        {['all', 'draft', 'unpaid', 'paid', 'cancelled'].map(sub => (
                            <button
                                key={sub}
                                onClick={() => setInvoiceSubTab(sub)}
                                className={`py-1.5 px-3 rounded-lg capitalize transition ${
                                    invoiceSubTab === sub ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>

                    <Card className="overflow-hidden border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                                    <th className="p-3">Invoice #</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Due Date</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Total Amount</th>
                                    <th className="p-3 text-right">Balance Due</th>
                                    <th className="p-3 text-center">Delay Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No invoices found under this tab.</td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map(inv => {
                                        const daysPast = inv.daysPastDue || 0;
                                        const monthsLate = (daysPast / 30).toFixed(1);
                                        return (
                                            <tr key={inv._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/invoices/${inv._id}`)}>
                                                <td className="p-3 font-bold font-mono text-indigo-600">{inv.invoiceNumber}</td>
                                                <td className="p-3">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                                                <td className="p-3">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                                        inv.paymentStatus === 'unpaid' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {inv.paymentStatus?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-mono font-semibold">{fmt(inv.grandTotal)}</td>
                                                <td className="p-3 text-right font-mono font-bold text-rose-600">{fmt(inv.balanceDue)}</td>
                                                <td className="p-3 text-center">
                                                    {daysPast > 0 ? (
                                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                                            {monthsLate} Mo ({daysPast}d) Late
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-600 text-[10px] font-bold">On Time</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
                <Card className="overflow-hidden border border-slate-200">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                                <th className="p-3">Receipt #</th>
                                <th className="p-3">Payment Date</th>
                                <th className="p-3">Method</th>
                                <th className="p-3">Linked Invoice #</th>
                                <th className="p-3 text-right">Amount Paid</th>
                                <th className="p-3 text-right">Unallocated (Advance)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No payments recorded for this customer.</td>
                                </tr>
                            ) : (
                                payments.map(pay => {
                                    const linkedInvoices = (pay.allocations || []).map(a => a.documentNumber).filter(Boolean).join(', ');
                                    return (
                                        <tr key={pay._id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold font-mono text-emerald-600">{pay.paymentNumber}</td>
                                            <td className="p-3">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                                            <td className="p-3 font-semibold uppercase">{pay.method ? pay.method.replace('_', ' ') : 'Cash'}</td>
                                            <td className="p-3 font-mono font-medium text-slate-800">{linkedInvoices || 'Unlinked Advance'}</td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmt(pay.amount)}</td>
                                            <td className="p-3 text-right font-mono font-semibold text-amber-700">{fmt(pay.unallocatedAmount)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* QUOTATIONS TAB */}
            {activeTab === 'quotations' && (
                <Card className="overflow-hidden border border-slate-200">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                                <th className="p-3">Quote #</th>
                                <th className="p-3">Project Name</th>
                                <th className="p-3">Version</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Total Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {quotations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No quotations found.</td>
                                </tr>
                            ) : (
                                quotations.map(q => (
                                    <tr key={q._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/alu/quotations/${q._id}`)}>
                                        <td className="p-3 font-bold font-mono text-indigo-600">{q.quoteNumber}</td>
                                        <td className="p-3 font-medium">{q.projectName}</td>
                                        <td className="p-3 font-mono">Rev {q.version}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">{fmt(q.finalSellingPrice)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* SALES ORDERS TAB */}
            {activeTab === 'salesOrders' && (
                <Card className="overflow-hidden border border-slate-200">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                                <th className="p-3">Order #</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Order Total</th>
                                <th className="p-3 text-right">Advance Paid</th>
                                <th className="p-3 text-right">Pending Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {salesOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No sales orders found.</td>
                                </tr>
                            ) : (
                                salesOrders.map(so => {
                                    const adv = so.advancePaidAmount || 0;
                                    const pending = Math.max(0, (so.grandTotal || 0) - adv);
                                    return (
                                        <tr key={so._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/sales-orders/${so._id}`)}>
                                            <td className="p-3 font-bold font-mono text-indigo-600">{so.orderNumber}</td>
                                            <td className="p-3">{new Date(so.orderDate).toLocaleDateString()}</td>
                                            <td className="p-3 font-bold uppercase text-[10px]">{so.status}</td>
                                            <td className="p-3 text-right font-mono font-semibold">{fmt(so.grandTotal)}</td>
                                            <td className="p-3 text-right font-mono font-semibold text-emerald-600">{fmt(adv)}</td>
                                            <td className="p-3 text-right font-mono font-bold text-rose-600">{fmt(pending)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Statement Modal */}
            <CustomerStatementModal
                isOpen={isStatementOpen}
                onClose={() => setIsStatementOpen(false)}
                customerId={id}
            />
        </div>
    );
}
