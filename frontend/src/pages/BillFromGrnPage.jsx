import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import EmptyState from '../components/ui/EmptyState';
import { grnsApi } from '../features/purchaseOrders/purchaseOrdersApi';
import { useCreateBillFromGrn } from '../features/bills/useBills';

export default function BillFromGrnPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const poId = params.get('poId');

    const [selectedIds, setSelectedIds] = useState([]);
    const [supplierInvoice, setSupplierInvoice] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const { data } = useQuery({
        queryKey: ['grns', poId],
        queryFn: () => grnsApi.list({ purchaseOrderId: poId, limit: 100 }),
        enabled: !!poId,
    });
    const mutation = useCreateBillFromGrn();

    const grns = data?.data || [];
    const selectedGrns = grns.filter((g) => selectedIds.includes(g._id));
    const totalAmount = selectedGrns.reduce((s, g) => s + (g.totalAcceptedValue || 0), 0);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const toggle = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

    const handleSubmit = async () => {
        if (selectedIds.length === 0) { toast.error('Select at least one GRN'); return; }
        try {
            const r = await mutation.mutateAsync({
                grnIds: selectedIds,
                supplierInvoiceNumber: supplierInvoice || undefined,
                billDate,
                notes: notes || undefined,
            });
            navigate(`/bills/${r.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader title="Create Bill from GRNs"
                actions={<Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                    <Card>
                        {grns.length === 0 ? (
                            <EmptyState title="No GRNs" description="No goods received notes to bill" />
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 w-10"></th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">GRN #</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Supplier</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {grns.map((g) => (
                                        <tr key={g._id}>
                                            <td className="px-4 py-2">
                                                <input type="checkbox" checked={selectedIds.includes(g._id)} onChange={() => toggle(g._id)} />
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">{g.grnNumber}</td>
                                            <td className="px-4 py-2 text-sm">{new Date(g.receiptDate).toLocaleDateString('en-LK')}</td>
                                            <td className="px-4 py-2 text-sm">{g.supplierId?.displayName}</td>
                                            <td className="px-4 py-2 text-right text-sm">{fmt(g.totalAcceptedValue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Bill Details</h3>
                        <div className="space-y-3">
                            <Input label="Supplier Invoice Number" placeholder="Their invoice #"
                                value={supplierInvoice} onChange={(e) => setSupplierInvoice(e.target.value)} />
                            <Input label="Bill Date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <div className="pt-3 border-t flex justify-between">
                                <span className="text-gray-600">Total</span>
                                <span className="font-bold text-primary-600">{fmt(totalAmount)}</span>
                            </div>
                            <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                                disabled={selectedIds.length === 0}>
                                <Save size={16} className="mr-1.5" /> Create Bill
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}