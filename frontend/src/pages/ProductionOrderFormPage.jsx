import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';

import { bomsApi } from '../features/boms/bomsApi';
import { useBom, useCheckAvailability } from '../features/boms/useBoms';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCreateProductionOrder } from '../features/production/useProduction';

export default function ProductionOrderFormPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const preBomId = params.get('bomId');

    const [bomId, setBomId] = useState(preBomId || '');
    const [plannedQuantity, setPlannedQuantity] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [outputWarehouseId, setOutputWarehouseId] = useState('');
    const [plannedStartDate, setPlannedStartDate] = useState('');
    const [plannedEndDate, setPlannedEndDate] = useState('');
    const [priority, setPriority] = useState('normal');
    const [referenceLink, setReferenceLink] = useState('');
    const [notes, setNotes] = useState('');

    const { data: bomsData } = useQuery({
        queryKey: ['boms', 'active'],
        queryFn: () => bomsApi.list({ status: 'active', limit: 200 }),
    });
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: bomDetail } = useBom(bomId);
    const { data: availabilityData } = useCheckAvailability(bomId, plannedQuantity);

    const createMutation = useCreateProductionOrder();

    const boms = bomsData?.data || [];
    const warehouses = warehousesData?.data || [];
    const bom = bomDetail?.data;
    const availability = availabilityData?.data;

    // Set defaults from warehouse
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const defaultWh = warehouses.find((w) => w.isDefault);
            if (defaultWh) {
                setSourceWarehouseId(defaultWh._id);
                setOutputWarehouseId(defaultWh._id);
            }
        }
    }, [warehouses, sourceWarehouseId]);

    const bomOptions = boms.map((b) => ({
        value: b._id,
        label: `${b.name} v${b.version} — makes ${b.finishedProductName}`,
    }));
    const warehouseOptions = warehouses.map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 4 }).format(n || 0);

    const estimatedCost = useMemo(() => {
        if (!bom || !plannedQuantity) return 0;
        const multiplier = +plannedQuantity / bom.outputQuantity;
        return (bom.totalCost || 0) * multiplier;
    }, [bom, plannedQuantity]);

    const submit = async () => {
        if (!bomId) { toast.error('Select a BOM'); return; }
        if (!plannedQuantity || +plannedQuantity <= 0) { toast.error('Enter quantity'); return; }
        if (!sourceWarehouseId || !outputWarehouseId) { toast.error('Select warehouses'); return; }

        try {
            const result = await createMutation.mutateAsync({
                bomId,
                plannedQuantity: +plannedQuantity,
                sourceWarehouseId,
                outputWarehouseId,
                plannedStartDate: plannedStartDate || undefined,
                plannedEndDate: plannedEndDate || undefined,
                priority,
                referenceLink: referenceLink || undefined,
                notes: notes || undefined,
            });
            navigate(`/production-orders/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title="New Production Order"
                description="Plan the manufacturing of finished goods"
                actions={<Button variant="outline" onClick={() => navigate('/production-orders')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Formula & Quantity</h3>
                        <div className="space-y-4">
                            <Select label="BOM (Formula)" required placeholder="Select formula..."
                                options={bomOptions} value={bomId} onChange={(e) => setBomId(e.target.value)} />

                            {bom && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <p><span className="text-gray-500">Makes:</span> {bom.finishedProductName}</p>
                                    <p><span className="text-gray-500">Batch size:</span> {bom.outputQuantity} {bom.outputUnitOfMeasure}</p>
                                    <p><span className="text-gray-500">Components:</span> {bom.components?.length}</p>
                                    <p><span className="text-gray-500">Cost per unit:</span> {fmt(bom.costPerUnit)}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Quantity to Produce" required type="number" step="0.01" min="0.01"
                                    value={plannedQuantity} onChange={(e) => setPlannedQuantity(e.target.value)}
                                    placeholder={bom ? `Min: ${bom.outputQuantity}` : ''} />
                                <Select label="Priority"
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'high', label: 'High' },
                                        { value: 'urgent', label: 'Urgent' },
                                    ]}
                                    value={priority} onChange={(e) => setPriority(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Planned Start Date" type="date"
                                    value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
                                <Input label="Planned End Date" type="date"
                                    value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Warehouses</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Source Warehouse (raw materials)" required
                                options={warehouseOptions} value={sourceWarehouseId}
                                onChange={(e) => setSourceWarehouseId(e.target.value)} />
                            <Select label="Output Warehouse (finished goods)" required
                                options={warehouseOptions} value={outputWarehouseId}
                                onChange={(e) => setOutputWarehouseId(e.target.value)} />
                        </div>
                    </Card>

                    {availability && (
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                                {availability.canProduce
                                    ? <><CheckCircle size={20} className="text-green-600" /><span className="font-semibold text-green-700">Materials Available</span></>
                                    : <><AlertTriangle size={20} className="text-amber-600" /><span className="font-semibold text-amber-700">Material Shortage</span></>}
                            </div>
                            <table className="w-full text-sm">
                                <thead className="border-b">
                                    <tr>
                                        <th className="px-2 py-1 text-left text-xs font-semibold text-gray-600">Material</th>
                                        <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">Required</th>
                                        <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600">Available</th>
                                        <th className="px-2 py-1 text-right text-xs font-semibold text-gray-600"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {availability.components.map((c) => (
                                        <tr key={c.productId}>
                                            <td className="px-2 py-2">{c.productName}</td>
                                            <td className="px-2 py-2 text-right">{fmtNum(c.required)} {c.unitOfMeasure}</td>
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
                            {!availability.canProduce && (
                                <p className="text-xs text-amber-700 mt-3">
                                    You can still create and plan the order. Starting production will fail until materials are in stock.
                                </p>
                            )}
                        </Card>
                    )}

                    <Card className="p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">Additional Info</h3>
                        <Input label="Reference Link" type="url" placeholder="e.g. specifications link, document URL" value={referenceLink} onChange={(e) => setReferenceLink(e.target.value)} />
                        <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Will produce</span><span className="font-medium">{plannedQuantity || '—'} {bom?.outputUnitOfMeasure}</span></div>
                            {bom && plannedQuantity && (
                                <div className="flex justify-between"><span className="text-gray-600">Batches</span><span>{(+plannedQuantity / bom.outputQuantity).toFixed(2)}</span></div>
                            )}
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Estimated Cost</span>
                                <span className="font-bold text-primary-600">{fmt(estimatedCost)}</span>
                            </div>
                        </div>
                        <Button variant="primary" fullWidth className="mt-6" onClick={submit}
                            loading={createMutation.isPending}
                            disabled={!bomId || !plannedQuantity || !sourceWarehouseId || !outputWarehouseId}>
                            <Save size={16} className="mr-1.5" /> Create Order
                        </Button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Will be created as draft. Approve it before starting production.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}