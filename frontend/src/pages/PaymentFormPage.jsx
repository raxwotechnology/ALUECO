import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';

import { customersApi } from '../features/customers/customersApi';
import { suppliersApi } from '../features/suppliers/suppliersApi';
import { invoicesApi } from '../features/invoices/invoicesApi';
import { billsApi } from '../features/bills/billsApi';
import { useCreatePayment } from '../features/payments/usePayments';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

export default function PaymentFormPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const preInvoiceId = params.get('invoiceId');
    const preBillId = params.get('billId');

    const [direction, setDirection] = useState(preBillId ? 'paid' : 'received');
    const [customerId, setCustomerId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState(0);
    const [percentage, setPercentage] = useState('');
    const [method, setMethod] = useState('cash'); // Default payment method set to Cash
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [transactionReference, setTransactionReference] = useState('');
    const [customInvoiceReference, setCustomInvoiceReference] = useState('');
    const [bankAccountId, setBankAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [allocations, setAllocations] = useState([]);

    const mutation = useCreatePayment();

    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
        enabled: direction === 'received',
    });
    const { data: bankAccountsData } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        }
    });
    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers', 'active'],
        queryFn: () => suppliersApi.list({ status: 'active', limit: 500 }),
        enabled: direction === 'paid',
    });
    const { data: invoicesData } = useQuery({
        queryKey: ['customerInvoices', customerId],
        queryFn: () => invoicesApi.list({ customerId, paymentStatus: 'unpaid,partially_paid,overdue', limit: 100 }),
        enabled: direction === 'received' && !!customerId,
    });
    const { data: billsData } = useQuery({
        queryKey: ['supplierBills', supplierId],
        queryFn: () => billsApi.list({ supplierId, paymentStatus: 'unpaid,partially_paid,overdue', limit: 100 }),
        enabled: direction === 'paid' && !!supplierId,
    });

    const openDocs = direction === 'received' ? (invoicesData?.data || []) : (billsData?.data || []);
    const totalOutstanding = openDocs.reduce((sum, d) => sum + (d.balanceDue || 0), 0);

    // Preload
    useEffect(() => {
        (async () => {
            if (preInvoiceId) {
                const result = await invoicesApi.getById(preInvoiceId);
                const inv = result.data;
                setDirection('received');
                setCustomerId(inv.customerId?._id || inv.customerId);
                setAmount(inv.balanceDue);
                setCustomInvoiceReference(inv.invoiceNumber);
                setAllocations([{
                    documentType: 'invoice', documentId: inv._id,
                    documentNumber: inv.invoiceNumber, amount: inv.balanceDue,
                }]);
            }
            if (preBillId) {
                const result = await billsApi.getById(preBillId);
                const bill = result.data;
                setDirection('paid');
                setSupplierId(bill.supplierId?._id || bill.supplierId);
                setAmount(bill.balanceDue);
                setCustomInvoiceReference(bill.billNumber);
                setAllocations([{
                    documentType: 'bill', documentId: bill._id,
                    documentNumber: bill.billNumber, amount: bill.balanceDue,
                }]);
            }
        })();
    }, [preInvoiceId, preBillId]);

    const customerOptions = (customersData?.data || []).map((c) => ({ value: c._id, label: `${c.displayName} (${c.customerCode})` }));
    const supplierOptions = (suppliersData?.data || []).map((s) => ({ value: s._id, label: `${s.displayName} (${s.supplierCode})` }));
    const bankAccountOptions = (bankAccountsData || []).map((acc) => ({ value: acc._id, label: `${acc.bankName} - ${acc.accountNumber} (${fmt(acc.balance)})` }));

    const totalAllocated = allocations.reduce((s, a) => s + (+a.amount || 0), 0);
    const unallocated = +(amount - totalAllocated).toFixed(2);

    // Handler when user types or clicks percentage (%)
    const handlePercentageChange = (pctValue) => {
        setPercentage(pctValue);
        const pct = parseFloat(pctValue);
        if (!isNaN(pct) && pct >= 0) {
            const baseVal = totalOutstanding > 0 ? totalOutstanding : 100000;
            const calculatedAmount = (baseVal * (pct / 100)).toFixed(2);
            setAmount(Number(calculatedAmount));
        }
    };

    // Handler when user types amount directly
    const handleAmountChange = (val) => {
        const numVal = parseFloat(val) || 0;
        setAmount(val);
        if (totalOutstanding > 0 && numVal > 0) {
            setPercentage(((numVal / totalOutstanding) * 100).toFixed(1));
        } else {
            setPercentage('');
        }
    };

    const addAllocation = (doc, customAmount = null) => {
        const id = doc._id;
        const num = direction === 'received' ? doc.invoiceNumber : doc.billNumber;
        if (allocations.find((a) => a.documentId === id)) return;
        const allocAmt = customAmount !== null ? customAmount : doc.balanceDue;
        setAllocations([...allocations, {
            documentType: direction === 'received' ? 'invoice' : 'bill',
            documentId: id,
            documentNumber: num,
            amount: allocAmt,
        }]);
    };

    const removeAlloc = (idx) => setAllocations(allocations.filter((_, i) => i !== idx));
    const updateAllocAmount = (idx, value) => {
        const newAlloc = [...allocations];
        newAlloc[idx] = { ...newAlloc[idx], amount: +value };
        setAllocations(newAlloc);
    };

    const autoAllocate = () => {
        let remaining = +amount;
        const newAlloc = openDocs.map((d) => {
            const pay = Math.min(remaining, d.balanceDue);
            remaining -= pay;
            return {
                documentType: direction === 'received' ? 'invoice' : 'bill',
                documentId: d._id,
                documentNumber: direction === 'received' ? d.invoiceNumber : d.billNumber,
                amount: pay,
            };
        }).filter((a) => a.amount > 0);
        setAllocations(newAlloc);
    };

    const submit = async () => {
        if (!amount || amount <= 0) { toast.error('Enter valid payment amount'); return; }
        if (direction === 'received' && !customerId) { toast.error('Select customer'); return; }
        if (direction === 'paid' && !supplierId) { toast.error('Select supplier'); return; }
        if (totalAllocated > +amount) { toast.error('Allocations exceed payment amount'); return; }
        if ((method === 'cheque' || method === 'bank_transfer') && !bankAccountId) { toast.error('Select company bank account'); return; }

        const combinedRef = [transactionReference, customInvoiceReference ? `Ref/Invoice: ${customInvoiceReference}` : null]
            .filter(Boolean)
            .join(' | ');

        try {
            const result = await mutation.mutateAsync({
                direction,
                customerId: direction === 'received' ? customerId : undefined,
                supplierId: direction === 'paid' ? supplierId : undefined,
                bankAccountId: (method === 'cheque' || method === 'bank_transfer') ? bankAccountId : undefined,
                paymentDate,
                amount: +amount,
                method,
                chequeNumber: method === 'cheque' ? chequeNumber : undefined,
                chequeDate: method === 'cheque' ? chequeDate : undefined,
                bankName: bankName || undefined,
                transactionReference: combinedRef || undefined,
                allocations: allocations.filter((a) => a.amount > 0),
                notes: notes || undefined,
            });
            navigate(`/payments/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader title="Record Payment & Settlement"
                actions={<Button variant="outline" onClick={() => navigate('/payments')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Information</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => { setDirection('received'); setAllocations([]); setSupplierId(''); }}
                                    className={`p-3 border rounded-xl transition ${direction === 'received' ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20' : 'border-gray-200'}`}>
                                    <p className="font-bold text-emerald-950">Money Received</p>
                                    <p className="text-xs text-emerald-700">Customer Payment / Advance</p>
                                </button>
                                <button type="button" onClick={() => { setDirection('paid'); setAllocations([]); setCustomerId(''); }}
                                    className={`p-3 border rounded-xl transition ${direction === 'paid' ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20' : 'border-gray-200'}`}>
                                    <p className="font-bold text-blue-950">Money Paid</p>
                                    <p className="text-xs text-blue-700">Supplier Payment / Advance</p>
                                </button>
                            </div>

                            {direction === 'received' ? (
                                <Select label="Customer" required placeholder="Select customer..."
                                    options={customerOptions} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAllocations([]); }} />
                            ) : (
                                <Select label="Supplier" required placeholder="Select supplier..."
                                    options={supplierOptions} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setAllocations([]); }} />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Payment Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                
                                {/* Percentage & Amount Calculation */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold text-gray-700">Amount (LKR)</label>
                                        {totalOutstanding > 0 && (
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                Total Due: {fmt(totalOutstanding)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={amount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-slate-900 font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="0.00"
                                        />
                                        <div className="w-24 relative">
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                max="100"
                                                value={percentage}
                                                onChange={(e) => handlePercentageChange(e.target.value)}
                                                className="w-full px-2.5 py-2 border border-indigo-200 bg-indigo-50/50 rounded-xl text-xs font-bold text-indigo-900 font-mono outline-none pr-6"
                                                placeholder="%"
                                            />
                                            <span className="absolute right-2 top-2.5 text-xs font-bold text-indigo-600">%</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 pt-1">
                                        {[10, 20, 25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => handlePercentageChange(pct)}
                                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-900 rounded-lg border border-slate-200 transition"
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method - Default set to Cash */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold text-gray-700">Payment Method</label>
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Default: Cash (Selectable)</span>
                                </div>
                                <Select required
                                    options={[
                                        { value: 'cash', label: 'Cash' },
                                        { value: 'bank_transfer', label: 'Bank Transfer' },
                                        { value: 'cheque', label: 'Cheque' },
                                        { value: 'card', label: 'Card' },
                                        { value: 'mobile_wallet', label: 'Mobile Wallet' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    value={method} onChange={(e) => { setMethod(e.target.value); setBankAccountId(''); }} />
                            </div>

                            {(method === 'cheque' || method === 'bank_transfer') && (
                                <Select label="Company Bank Account" required placeholder="Select company bank account..."
                                    options={bankAccountOptions} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} />
                            )}

                            {method === 'cheque' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Cheque Number" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                                    <Input label="Cheque Date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Bank Name (optional)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                                <Input label="Transaction Reference (optional)" value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="e.g. TRX-987456" />
                            </div>

                            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </Card>

                    {/* Invoice & Settlement Mapping Section */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Invoice / Advance Settlement Mapping</h3>
                                <p className="text-xs text-slate-500">Link this payment directly to open invoices, advances, or settlement numbers</p>
                            </div>
                            {openDocs.length > 0 && (
                                <Button type="button" variant="outline" size="sm" onClick={autoAllocate}>
                                    Auto-Allocate
                                </Button>
                            )}
                        </div>

                        {/* Reference / Invoice Number Mapping Field */}
                        <div className="mb-4 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-slate-700">Direct Invoice / Settlement Reference Number</label>
                            <input
                                type="text"
                                value={customInvoiceReference}
                                onChange={(e) => setCustomInvoiceReference(e.target.value)}
                                placeholder="e.g. INV-1002, SO-1004, or ADVANCE-2024"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <p className="text-[10px] text-slate-500">
                                Enter invoice or settlement reference for database linking and receipt tracking.
                            </p>
                        </div>

                        {allocations.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-bold text-slate-700">Mapped Allocations:</p>
                                {allocations.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                                        <Badge variant="info">{a.documentNumber}</Badge>
                                        <input type="number" step="0.01" min="0" value={a.amount}
                                            onChange={(e) => updateAllocAmount(idx, e.target.value)}
                                            className="flex-1 px-2.5 py-1 border border-indigo-200 rounded-lg text-xs font-bold font-mono text-right bg-white" />
                                        <button onClick={() => removeAlloc(idx)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {openDocs.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-700 mb-2">Select Outstanding {direction === 'received' ? 'Invoices' : 'Bills'} to Link:</p>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {openDocs.filter((d) => !allocations.find((a) => a.documentId === d._id)).map((d) => (
                                        <div key={d._id} className="flex items-center justify-between p-2.5 text-xs border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                                            <div>
                                                <span className="font-mono font-bold text-indigo-950 block">{direction === 'received' ? d.invoiceNumber : d.billNumber}</span>
                                                <span className="text-[10px] text-slate-500">Balance Due: {fmt(d.balanceDue)}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => addAllocation(d, (d.balanceDue * 0.5).toFixed(2))}
                                                    className="px-2 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                                                >
                                                    50%
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => addAllocation(d, d.balanceDue)}
                                                    className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm"
                                                >
                                                    Map 100%
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Payment</span><span className="font-semibold">{fmt(+amount || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Allocated</span><span>{fmt(totalAllocated)}</span></div>
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Unallocated</span>
                                <span className={`font-bold ${unallocated < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(unallocated)}</span>
                            </div>
                            {unallocated > 0 && (
                                <p className="text-xs text-gray-500 pt-2">
                                    Unallocated amount will be recorded as an advance / credit for future.
                                </p>
                            )}
                            {unallocated < 0 && (
                                <p className="text-xs text-red-600 pt-2">
                                    Allocations exceed payment amount.
                                </p>
                            )}
                        </div>
                        <Button variant="primary" fullWidth className="mt-4" onClick={submit} loading={mutation.isPending}
                            disabled={unallocated < 0 || !amount}>
                            <Save size={16} className="mr-1.5" /> Record Payment
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}