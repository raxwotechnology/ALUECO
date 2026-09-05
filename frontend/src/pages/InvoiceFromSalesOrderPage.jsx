import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

import { salesOrdersApi } from '../features/salesOrders/salesOrdersApi';
import { useGenerateFromSO } from '../features/invoices/useInvoices';

import { useSearchParams } from 'react-router-dom';

export default function InvoiceFromSalesOrderPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preSelectedOrderIds = searchParams.get('orderIds')?.split(',') || [];
    const [selectedIds, setSelectedIds] = useState(preSelectedOrderIds);
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['salesOrders', 'ready-to-invoice'],
        queryFn: () => salesOrdersApi.list({ status: 'delivered', limit: 200 }),
    });

    const mutation = useGenerateFromSO();
    const orders = data?.data || [];

    const selectedOrders = orders.filter((o) => selectedIds.includes(o?._id));
    const selectedCustomerId = selectedOrders[0]?.customerId?._id;
    const allSameCustomer = selectedOrders.every(
        (o) => o?.customerId && o.customerId._id === selectedCustomerId
    );

    const totalAmount = selectedOrders.reduce((s, o) => s + (o?.grandTotal || 0), 0);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const toggle = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0) { toast.error('Select at least one order'); return; }
        if (!allSameCustomer) { toast.error('All selected orders must be from the same customer'); return; }

        try {
            const result = await mutation.mutateAsync({
                salesOrderIds: selectedIds,
                notes: notes || undefined,
            });
            navigate(`/invoices/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title="Generate Invoice from Sales Orders"
                description="Select delivered orders to invoice (must be from the same customer)"
                actions={<Button variant="outline" onClick={() => navigate('/invoices')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                    <Card>
                        {isLoading ? (
                            <div className="py-16 text-center text-gray-500">Loading...</div>
                        ) : orders.length === 0 ? (
                            <EmptyState icon={FileText} title="No delivered orders" description="Orders must be in 'delivered' status to be invoiced" />
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 w-10"></th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Order #</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Customer</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map((o) => {
                                        if (!o) return null;
                                        const disabled = selectedCustomerId && (!o.customerId || o.customerId._id !== selectedCustomerId);
                                        return (
                                            <tr key={o._id} className={disabled ? 'opacity-40' : ''}>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(o._id)}
                                                        onChange={() => !disabled && toggle(o._id)}
                                                        disabled={disabled}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs">{o.orderNumber}</td>
                                                <td className="px-4 py-2 text-sm">{o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-LK') : 'N/A'}</td>
                                                <td className="px-4 py-2">
                                                    <p className="text-sm font-medium">{o.customerSnapshot?.name || 'Unknown Customer'}</p>
                                                    <p className="text-xs text-gray-500">{o.customerSnapshot?.code || '---'}</p>
                                                </td>
                                                <td className="px-4 py-2 text-right text-sm font-medium">{fmt(o.grandTotal)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Details</h3>
                        <div className="space-y-3 text-sm mb-4">
                            <div className="flex justify-between"><span className="text-gray-600">Orders selected</span><span className="font-medium">{selectedIds.length}</span></div>
                            {selectedOrders.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Customer</span>
                                    <span className="font-medium text-right">{selectedOrders[0]?.customerSnapshot?.name}</span>
                                </div>
                            )}
                            {!allSameCustomer && selectedOrders.length > 0 && (
                                <Badge variant="danger">Multiple customers selected</Badge>
                            )}
                            <div className="flex justify-between pt-3 border-t font-bold">
                                <span>Total</span><span className="text-primary-600">{fmt(totalAmount)}</span>
                            </div>
                        </div>
                        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        <Button variant="primary" fullWidth className="mt-4"
                            onClick={handleSubmit} loading={mutation.isPending}
                            disabled={selectedIds.length === 0 || !allSameCustomer}>
                            <Save size={16} className="mr-1.5" /> Generate Invoice
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}