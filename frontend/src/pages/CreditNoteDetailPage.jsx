import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { useCreditNote, useApplyCreditNote } from '../features/returns/useReturns';
import { invoicesApi } from '../features/invoices/invoicesApi';

export default function CreditNoteDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useCreditNote(id);
    const applyMutation = useApplyCreditNote();
    const [isApplyOpen, setIsApplyOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [applyAmount, setApplyAmount] = useState(0);

    const cn = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const { data: invoicesData } = useQuery({
        queryKey: ['customerOpenInvoices', cn?.customerId?._id],
        queryFn: () => invoicesApi.list({ customerId: cn?.customerId?._id, paymentStatus: 'unpaid,partially_paid,overdue', limit: 50 }),
        enabled: !!cn?.customerId?._id && isApplyOpen,
    });
    const openInvoices = invoicesData?.data || [];
    const selectedInvoice = openInvoices.find((i) => i._id === selectedInvoiceId);
    const maxApply = Math.min(cn?.remainingAmount || 0, selectedInvoice?.balanceDue || 0);

    if (isLoading || !cn) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const handleApply = async () => {
        if (+applyAmount > maxApply) { toast.error(`Cannot apply more than ${maxApply}`); return; }
        await applyMutation.mutateAsync({ id: cn._id, data: { invoiceId: selectedInvoiceId, amount: +applyAmount } });
        setIsApplyOpen(false);
        setSelectedInvoiceId(''); setApplyAmount(0);
    };

    return (
        <div>
            <PageHeader
                title={<>Credit Note {cn.creditNoteNumber} <Badge>{cn.status.replace(/_/g, ' ')}</Badge></>}
                description={`Customer: ${cn.customerSnapshot?.name} · ${fmtDate(cn.issueDate)}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/credit-notes')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {cn.remainingAmount > 0 && cn.status !== 'cancelled' && (
                            <Button variant="primary" onClick={() => setIsApplyOpen(true)}>Apply to Invoice</Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-3">Details</h3>
                        <p className="text-sm mb-2"><span className="text-gray-500">Reason:</span> {cn.reason.replace(/_/g, ' ')}</p>
                        {cn.description && <p className="text-sm mb-2"><span className="text-gray-500">Description:</span> {cn.description}</p>}
                        {cn.customerReturnId && (
                            <p className="text-sm">
                                <span className="text-gray-500">From Return:</span>{' '}
                                <button onClick={() => navigate(`/returns/${cn.customerReturnId._id}`)} className="text-primary-600 underline">
                                    {cn.customerReturnId.rmaNumber}
                                </button>
                            </p>
                        )}
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Applications</h3></div>
                        {cn.applications?.length === 0 ? (
                            <p className="p-6 text-center text-gray-500 text-sm">Not yet applied to any invoice</p>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Invoice</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cn.applications.map((a, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => navigate(`/invoices/${a.invoiceId._id || a.invoiceId}`)} className="font-mono text-xs text-primary-600 underline">
                                                    {a.invoiceNumber}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{fmtDate(a.appliedAt)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium">{fmt(a.amountApplied)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Balance</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Original</span><span>{fmt(cn.amount)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Applied</span><span>{fmt(cn.amount - cn.remainingAmount)}</span></div>
                            <div className="flex justify-between pt-3 border-t font-bold">
                                <span>Remaining</span>
                                <span className="text-primary-600">{fmt(cn.remainingAmount)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} title="Apply Credit Note" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Invoice" required placeholder="Select open invoice..."
                        options={openInvoices.map((i) => ({ value: i._id, label: `${i.invoiceNumber} — ${fmt(i.balanceDue)} due` }))}
                        value={selectedInvoiceId}
                        onChange={(e) => { setSelectedInvoiceId(e.target.value); setApplyAmount(Math.min(cn.remainingAmount, openInvoices.find((o) => o._id === e.target.value)?.balanceDue || 0)); }} />
                    {selectedInvoice && (
                        <>
                            <Input label={`Amount (max ${fmt(maxApply)})`} type="number" step="0.01" min="0.01" max={maxApply}
                                value={applyAmount} onChange={(e) => setApplyAmount(e.target.value)} />
                            <p className="text-xs text-gray-500">Invoice balance: {fmt(selectedInvoice.balanceDue)} · Credit remaining: {fmt(cn.remainingAmount)}</p>
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApply} loading={applyMutation.isPending}
                        disabled={!selectedInvoiceId || +applyAmount <= 0}>Apply</Button>
                </div>
            </Modal>
        </div>
    );
}