import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Factory, CheckCircle, AlertTriangle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useBom, useCheckAvailability } from '../features/boms/useBoms';
import { useAuthStore } from '../store/authStore';

export default function BomDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'production_staff'].includes(user?.role);

    const [checkQty, setCheckQty] = useState(0);

    const { data, isLoading } = useBom(id);
    const bom = data?.data;

    const { data: availabilityData } = useCheckAvailability(id, checkQty);
    const availability = availabilityData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(n || 0);

    if (isLoading || !bom) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    {bom.name}
                    <Badge variant="default">v{bom.version}</Badge>
                    <Badge variant={bom.status === 'active' ? 'success' : 'default'}>{bom.status}</Badge>
                    {bom.isDefault && <Badge variant="info">Default</Badge>}
                </span>}
                description={`Makes ${bom.outputQuantity} ${bom.outputUnitOfMeasure} of ${bom.finishedProductName}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/boms')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {canManage && (
                            <Button variant="outline" onClick={() => navigate(`/boms/${id}/edit`)}>
                                <Edit size={16} className="mr-1.5" /> Edit
                            </Button>
                        )}
                        {canManage && (
                            <Button variant="primary" onClick={() => navigate(`/production-orders/new?bomId=${id}`)}>
                                <Factory size={16} className="mr-1.5" /> Start Production
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-700">Components</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Material</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Wastage</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Cost</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Line Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bom.components.map((c) => {
                                    const effective = c.quantity * (1 + (c.wastagePercent || 0) / 100);
                                    const lineTotal = effective * (c.standardCost || 0);
                                    return (
                                        <tr key={c._id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-sm">{c.productName}</p>
                                                <p className="text-xs font-mono text-gray-500">{c.productCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm capitalize">{c.componentType?.replace('_', ' ')}</td>
                                            <td className="px-4 py-3 text-right text-sm">{fmtNum(c.quantity)} {c.unitOfMeasure}</td>
                                            <td className="px-4 py-3 text-right text-sm">{c.wastagePercent || 0}%</td>
                                            <td className="px-4 py-3 text-right text-sm">{fmt(c.standardCost)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium">{fmt(lineTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>

                    {bom.labor?.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b">
                                <h3 className="text-sm font-semibold text-gray-700">Labor</h3>
                            </div>
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Hours</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Rate</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {bom.labor.map((l) => (
                                        <tr key={l._id}>
                                            <td className="px-4 py-3 text-sm capitalize">{l.laborType}</td>
                                            <td className="px-4 py-3 text-sm">{l.description || '—'}</td>
                                            <td className="px-4 py-3 text-right text-sm">{l.hours}</td>
                                            <td className="px-4 py-3 text-right text-sm">{fmt(l.hourlyRate)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium">{fmt(l.totalCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Check Material Availability</h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <Input label="Quantity to produce" type="number" min="0" step="1"
                                    placeholder={`e.g., ${bom.outputQuantity}`}
                                    value={checkQty} onChange={(e) => setCheckQty(e.target.value)} />
                            </div>
                        </div>

                        {availability && (
                            <div className="mt-4 border-t pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    {availability.canProduce
                                        ? <><CheckCircle size={18} className="text-green-600" /><span className="font-semibold text-green-700">Ready to produce {availability.targetQuantity} units</span></>
                                        : <><AlertTriangle size={18} className="text-amber-600" /><span className="font-semibold text-amber-700">Insufficient materials</span></>}
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="border-b">
                                        <tr>
                                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-600">Material</th>
                                            <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">Needed</th>
                                            <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">Available</th>
                                            <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {availability.components.map((c) => (
                                            <tr key={c.productId}>
                                                <td className="px-2 py-2">{c.productName}</td>
                                                <td className="px-2 py-2 text-right">{fmtNum(c.required)}</td>
                                                <td className="px-2 py-2 text-right">{fmtNum(c.available)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    {c.isSufficient
                                                        ? <Badge variant="success">OK</Badge>
                                                        : <Badge variant="danger">Short {fmtNum(c.shortage)}</Badge>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cost Breakdown</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Materials</span><span>{fmt(bom.totalMaterialCost)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Labor</span><span>{fmt(bom.totalLaborCost)}</span></div>
                            {bom.overheadPercent > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Overhead ({bom.overheadPercent}%)</span><span>{fmt(bom.totalOverheadCost)}</span></div>
                            )}
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Batch Total</span>
                                <span className="font-bold">{fmt(bom.totalCost)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Cost per unit</span>
                                <span className="font-bold text-primary-600">{fmt(bom.costPerUnit)}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">BOM Code</span><span className="font-mono">{bom.bomCode}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Output</span><span>{bom.outputQuantity} {bom.outputUnitOfMeasure}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Components</span><span>{bom.components?.length}</span></div>
                            {bom.estimatedProductionTimeHours > 0 && (
                                <div className="flex justify-between"><span className="text-gray-500">Est. Time</span><span>{bom.estimatedProductionTimeHours} hrs</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-500">Created by</span>
                                <span>{bom.createdBy?.firstName} {bom.createdBy?.lastName}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}