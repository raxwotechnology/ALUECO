import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CheckCircle, Play, PauseCircle, Ban, Factory,
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CompleteProductionModal from '../features/production/CompleteProductionModal';
import { useProductionOrder, useProductionAction } from '../features/production/useProduction';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default', planned: 'info', materials_reserved: 'info',
    in_progress: 'warning', on_hold: 'warning',
    completed: 'success', partially_completed: 'warning',
    cancelled: 'danger', closed: 'default',
};

export default function ProductionOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const actions = useProductionAction();

    const [actionDialog, setActionDialog] = useState(null);
    const [reason, setReason] = useState('');
    const [isCompleteOpen, setIsCompleteOpen] = useState(false);

    const { data, isLoading } = useProductionOrder(id);
    const po = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 4 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (isLoading || !po) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const canProd = ['admin', 'manager', 'production_staff'].includes(user.role);
    const canCancel = ['admin', 'manager'].includes(user.role);

    const actionButtons = [];
    if (po.status === 'draft' && canProd) {
        actionButtons.push({ label: 'Approve', icon: CheckCircle, variant: 'primary', fn: 'approve' });
    }
    if (['planned', 'materials_reserved', 'on_hold'].includes(po.status) && canProd) {
        actionButtons.push({ label: 'Start Production', icon: Play, variant: 'primary', fn: 'start' });
    }
    if (po.status === 'in_progress' && canProd) {
        actionButtons.push({ label: 'Complete Production', icon: Factory, variant: 'primary', onClick: () => setIsCompleteOpen(true) });
        actionButtons.push({ label: 'Put on Hold', icon: PauseCircle, variant: 'outline', fn: 'hold', needsReason: true });
    }
    if (['draft', 'planned', 'materials_reserved', 'in_progress', 'on_hold'].includes(po.status) && canCancel) {
        actionButtons.push({ label: 'Cancel', icon: Ban, variant: 'danger', fn: 'cancel', needsReason: true });
    }

    const handleAction = async () => {
        const fn = actionDialog.fn;
        if (fn === 'approve') await actions.approve.mutateAsync(po._id);
        if (fn === 'start') await actions.start.mutateAsync(po._id);
        if (fn === 'hold') await actions.hold.mutateAsync({ id: po._id, reason });
        if (fn === 'cancel') await actions.cancel.mutateAsync({ id: po._id, reason });
        setActionDialog(null); setReason('');
    };

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    {po.productionNumber}
                    <Badge variant={statusVariant[po.status]}>{po.status.replace('_', ' ')}</Badge>
                    <Badge>{po.priority}</Badge>
                </span>}
                description={`Making ${po.plannedQuantity} ${po.output?.[0]?.unitOfMeasure || 'units'} of ${po.finishedProductName}`}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/production-orders')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {actionButtons.map((b) => (
                            <Button key={b.label} variant={b.variant} onClick={b.onClick || (() => setActionDialog(b))}>
                                <b.icon size={16} className="mr-1.5" /> {b.label}
                            </Button>
                        ))}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card>
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Raw Materials to Consume</h3>
                            <span className="text-xs text-gray-500">Source: {po.sourceWarehouseId?.name}</span>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Material</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Planned</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actual</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Variance</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {po.consumption.map((c) => {
                                    const variance = (c.actualQuantity || 0) - c.plannedQuantity;
                                    return (
                                        <tr key={c._id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-sm">{c.productName}</p>
                                                <p className="text-xs font-mono text-gray-500">{c.productCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">{fmtNum(c.plannedQuantity)} {c.unitOfMeasure}</td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                {c.actualQuantity > 0 ? fmtNum(c.actualQuantity) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                {c.actualQuantity > 0 && (
                                                    <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}>
                                                        {variance > 0 ? '+' : ''}{fmtNum(variance)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">{fmt(c.actualCost || c.standardCost * c.plannedQuantity)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>

                    {po.labor?.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Labor</h3></div>
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Planned</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actual</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {po.labor.map((l) => (
                                        <tr key={l._id}>
                                            <td className="px-4 py-3 text-sm capitalize">{l.laborType}</td>
                                            <td className="px-4 py-3 text-sm">{l.description || '—'}</td>
                                            <td className="px-4 py-3 text-right text-sm">{l.plannedHours?.toFixed(2) || '—'} hrs</td>
                                            <td className="px-4 py-3 text-right text-sm">{l.actualHours > 0 ? `${l.actualHours.toFixed(2)} hrs` : '—'}</td>
                                            <td className="px-4 py-3 text-right text-sm">{fmt(l.actualCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}

                    <Card>
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Output</h3>
                            <span className="text-xs text-gray-500">Destination: {po.outputWarehouseId?.name}</span>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Planned</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Produced</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Damaged</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Batch</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Cost/Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {po.output.map((o) => (
                                    <tr key={o._id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{o.productName}</p>
                                            <p className="text-xs font-mono text-gray-500">{o.productCode}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{fmtNum(o.plannedQuantity)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                                            {o.actualQuantity > 0 ? fmtNum(o.actualQuantity) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            {o.damagedQuantity > 0 && <span className="text-red-600">{fmtNum(o.damagedQuantity)}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono">{o.batchNumber || '—'}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(o.costPerUnit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {po.referenceLink && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Reference Link</h3>
                            <a href={po.referenceLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline break-all font-semibold">
                                {po.referenceLink}
                            </a>
                        </Card>
                    )}

                    {po.notes && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                            <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cost Tracking</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Planned Material</span><span>{fmt(po.plannedMaterialCost)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Actual Material</span>
                                <span className={po.actualMaterialCost > po.plannedMaterialCost ? 'text-red-600' : ''}>{fmt(po.actualMaterialCost)}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-600">Planned Labor</span><span>{fmt(po.plannedLaborCost)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Actual Labor</span>
                                <span className={po.actualLaborCost > po.plannedLaborCost ? 'text-red-600' : ''}>{fmt(po.actualLaborCost)}</span>
                            </div>
                            {po.overheadCost > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Overhead</span><span>{fmt(po.overheadCost)}</span></div>
                            )}
                            <div className="flex justify-between pt-3 border-t">
                                <span className="text-gray-600">Planned Total</span><span>{fmt(po.totalPlannedCost)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>Actual Total</span>
                                <span>{fmt(po.totalActualCost)}</span>
                            </div>
                            {po.costVariance !== 0 && po.status === 'completed' && (
                                <div className="flex justify-between text-xs pt-1">
                                    <span className="text-gray-500">Variance</span>
                                    <span className={po.costVariance > 0 ? 'text-red-600' : 'text-green-600'}>
                                        {po.costVariance > 0 ? '+' : ''}{fmt(po.costVariance)}
                                    </span>
                                </div>
                            )}
                            {po.costPerUnit > 0 && (
                                <div className="flex justify-between pt-2 border-t">
                                    <span className="font-semibold">Cost per Unit</span>
                                    <span className="font-bold text-primary-600">{fmt(po.costPerUnit)}</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{fmtDate(po.createdAt)}</span></div>
                            {po.plannedStartDate && <div className="flex justify-between"><span className="text-gray-500">Planned Start</span><span>{fmtDate(po.plannedStartDate)}</span></div>}
                            {po.plannedEndDate && <div className="flex justify-between"><span className="text-gray-500">Planned End</span><span>{fmtDate(po.plannedEndDate)}</span></div>}
                            {po.approvedAt && <div className="flex justify-between"><span className="text-gray-500">Approved</span><span>{fmtDate(po.approvedAt)}</span></div>}
                            {po.actualStartDate && <div className="flex justify-between"><span className="text-gray-500">Actual Start</span><span>{fmtDate(po.actualStartDate)}</span></div>}
                            {po.actualEndDate && <div className="flex justify-between"><span className="text-gray-500">Actual End</span><span>{fmtDate(po.actualEndDate)}</span></div>}
                        </div>
                    </Card>

                    {po.cancelledAt && (
                        <Card className="p-6 border-l-4 border-l-red-500 bg-red-50">
                            <h3 className="text-sm font-semibold text-red-800 mb-1">Cancelled</h3>
                            <p className="text-sm text-red-700">{po.cancellationReason}</p>
                            <p className="text-xs text-red-600 mt-1">By {po.cancelledBy?.firstName} on {fmtDate(po.cancelledAt)}</p>
                        </Card>
                    )}
                </div>
            </div>

            <CompleteProductionModal
                isOpen={isCompleteOpen}
                onClose={() => setIsCompleteOpen(false)}
                productionOrder={po}
            />

            <ConfirmDialog
                isOpen={!!actionDialog}
                onClose={() => { setActionDialog(null); setReason(''); }}
                onConfirm={handleAction}
                title={actionDialog?.label}
                message={
                    actionDialog?.needsReason ? (
                        <div>
                            <p className="mb-3">Please provide a reason:</p>
                            <textarea rows={3} className="w-full px-3 py-2 border rounded text-sm"
                                value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                    ) : `${actionDialog?.label} this production order?`
                }
                confirmText={actionDialog?.label}
                variant={actionDialog?.variant === 'danger' ? 'danger' : 'primary'}
                loading={actions.approve.isPending || actions.start.isPending || actions.hold.isPending || actions.cancel.isPending}
            />
        </div>
    );
}