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
    const [method, setMethod] = useState('bank_transfer');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [transactionReference, setTransactionReference] = useState('');
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

    // Preload
    useEffect(() => {
        (async () => {
            if (preInvoiceId) {
                const result = await invoicesApi.getById(preInvoiceId);
                const inv = result.data;
                setDirection('received');
                setCustomerId(inv.customerId?._id || inv.customerId);
                setAmount(inv.balanceDue);
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
    const openDocs = direction === 'received' ? (invoicesData?.data || []) : (billsData?.data || []);

    const totalAllocated = allocations.reduce((s, a) => s + (+a.amount || 0), 0);
    const unallocated = +(amount - totalAllocated).toFixed(2);

    const addAllocation = (doc) => {
        const id = direction === 'received' ? doc._id : doc._id;
        const num = direction === 'received' ? doc.invoiceNumber : doc.billNumber;
        if (allocations.find((a) => a.documentId === id)) return;
        setAllocations([...allocations, {
            documentType: direction === 'received' ? 'invoice' : 'bill',
            documentId: id,
            documentNumber: num,
            amount: doc.balanceDue,
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
        if (!amount || amount <= 0) { toast.error('Enter amount'); return; }
        if (direction === 'received' && !customerId) { toast.error('Select customer'); return; }
        if (direction === 'paid' && !supplierId) { toast.error('Select supplier'); return; }
        if (totalAllocated > +amount) { toast.error('Allocations exceed payment amount'); return; }
        if ((method === 'cheque' || method === 'bank_transfer') && !bankAccountId) { toast.error('Select company bank account'); return; }

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
                transactionReference: transactionReference || undefined,
                allocations: allocations.filter((a) => a.amount > 0),
                notes: notes || undefined,
            });
            navigate(`/payments/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader title="Record Payment"
                actions={<Button variant="outline" onClick={() => navigate('/payments')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Info</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => { setDirection('received'); setAllocations([]); setSupplierId(''); }}
                                    className={`p-3 border rounded-lg ${direction === 'received' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                    <p className="font-medium">Money Received</p>
                                    <p className="text-xs text-gray-500">From customer</p>
                                </button>
                                <button type="button" onClick={() => { setDirection('paid'); setAllocations([]); setCustomerId(''); }}
                                    className={`p-3 border rounded-lg ${direction === 'paid' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                    <p className="font-medium">Money Paid</p>
                                    <p className="text-xs text-gray-500">To supplier</p>
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
                                <Input label="Amount (LKR)" required type="number" step="0.01" min="0.01"
                                    value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>

                            <Select label="Method" required
                                options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'bank_transfer', label: 'Bank Transfer' },
                                    { value: 'cheque', label: 'Cheque' },
                                    { value: 'card', label: 'Card' },
                                    { value: 'mobile_wallet', label: 'Mobile Wallet' },
                                    { value: 'other', label: 'Other' },
                                ]}
                                value={method} onChange={(e) => { setMethod(e.target.value); setBankAccountId(''); }} />

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
                                <Input label="Transaction Reference (optional)" value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} />
                            </div>

                            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Apply to Invoices/Bills</h3>
                            {openDocs.length > 0 && (
                                <Button type="button" variant="outline" size="sm" onClick={autoAllocate}>
                                    Auto-Allocate
                                </Button>
                            )}
                        </div>

                        {allocations.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {allocations.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <Badge>{a.documentNumber}</Badge>
                                        <input type="number" step="0.01" min="0" value={a.amount}
                                            onChange={(e) => updateAllocAmount(idx, e.target.value)}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                                        <button onClick={() => removeAlloc(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {openDocs.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-2">Outstanding {direction === 'received' ? 'invoices' : 'bills'}:</p>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {openDocs.filter((d) => !allocations.find((a) => a.documentId === d._id)).map((d) => (
                                        <button key={d._id} onClick={() => addAllocation(d)}
                                            className="w-full flex items-center justify-between p-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
                                            <span className="font-mono">{direction === 'received' ? d.invoiceNumber : d.billNumber}</span>
                                            <span className="text-gray-600">{fmt(d.balanceDue)}</span>
                                        </button>
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