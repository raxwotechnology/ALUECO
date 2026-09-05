import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { useRepair, useStartRepair, useCompleteRepair } from '../features/returns/useReturns';
import { useWarehouses } from '../features/warehouses/useWarehouses';

const statusVariant = {
    pending: 'default', in_progress: 'warning', awaiting_parts: 'warning',
    completed_fixed: 'success', completed_unfixable: 'danger',
};

export default function RepairDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data } = useRepair(id);
    const startMutation = useStartRepair();
    const completeMutation = useCompleteRepair();
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const [isCompleteOpen, setIsCompleteOpen] = useState(false);
    const [outcome, setOutcome] = useState('fixed');
    const [disposition, setDisposition] = useState('return_to_stock');
    const [actualLaborHours, setActualLaborHours] = useState(0);
    const [actualLaborCost, setActualLaborCost] = useState(0);
    const [actualPartsCost, setActualPartsCost] = useState(0);
    const [returnedToWarehouseId, setReturnedToWarehouseId] = useState('');
    const [notes, setNotes] = useState('');

    const repair = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (!repair) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const handleStart = async () => { await startMutation.mutateAsync({ id: repair._id, data: {} }); };
    const handleComplete = async () => {
        await completeMutation.mutateAsync({
            id: repair._id,
            data: {
                outcome, disposition,
                actualLaborHours: +actualLaborHours,
                actualLaborCost: +actualLaborCost,
                actualPartsCost: +actualPartsCost,
                returnedToWarehouseId: disposition === 'return_to_stock' ? returnedToWarehouseId : undefined,
                notes,
            },
        });
        setIsCompleteOpen(false);
    };

    return (
        <div>
            <PageHeader title={<>Repair {repair.repairNumber} <Badge variant={statusVariant[repair.status]}>{repair.status.replace(/_/g, ' ')}</Badge></>}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/repairs')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {repair.status === 'pending' && (
                            <Button variant="primary" onClick={handleStart} loading={startMutation.isPending}>
                                <Play size={16} className="mr-1.5" /> Start Repair
                            </Button>
                        )}
                        {['in_progress', 'awaiting_parts'].includes(repair.status) && (
                            <Button variant="primary" onClick={() => setIsCompleteOpen(true)}>
                                <CheckCircle size={16} className="mr-1.5" /> Complete
                            </Button>
                        )}
                    </div>
                } />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <p className="text-sm mb-1"><span className="text-gray-500">Product:</span> {repair.productName} <span className="font-mono text-xs">{repair.productCode}</span></p>
                        <p className="text-sm mb-1"><span className="text-gray-500">Quantity:</span> {repair.quantity}</p>
                        <p className="text-sm mt-3"><span className="text-gray-500">Issue:</span></p>
                        <p className="text-sm">{repair.issueDescription}</p>
                        {repair.diagnosis && <>
                            <p className="text-sm mt-3"><span className="text-gray-500">Diagnosis:</span></p>
                            <p className="text-sm">{repair.diagnosis}</p>
                        </>}
                        {repair.customerReturnId && (
                            <p className="text-sm mt-3">
                                <span className="text-gray-500">From Return:</span>{' '}
                                <button onClick={() => navigate(`/returns/${repair.customerReturnId._id}`)} className="text-primary-600 underline">
                                    {repair.customerReturnId.rmaNumber}
                                </button>
                            </p>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-3">Costs</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Labor Hours</span><span>{repair.actualLaborHours || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Labor Cost</span><span>{fmt(repair.actualLaborCost)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Parts Cost</span><span>{fmt(repair.actualPartsCost)}</span></div>
                            <div className="flex justify-between pt-2 border-t font-bold"><span>Total</span><span>{fmt(repair.totalActualCost)}</span></div>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Complete Repair" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Outcome" required
                        options={[{ value: 'fixed', label: 'Fixed' }, { value: 'unfixable', label: 'Unfixable' }]}
                        value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                    {outcome === 'fixed' && (
                        <>
                            <Select label="Disposition"
                                options={[
                                    { value: 'return_to_stock', label: 'Return to stock' },
                                    { value: 'return_to_customer', label: 'Return to customer' },
                                ]}
                                value={disposition} onChange={(e) => setDisposition(e.target.value)} />
                            {disposition === 'return_to_stock' && (
                                <Select label="Return to warehouse" required
                                    options={(warehousesData?.data || []).map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }))}
                                    value={returnedToWarehouseId} onChange={(e) => setReturnedToWarehouseId(e.target.value)} />
                            )}
                        </>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        <Input label="Labor hours" type="number" step="0.01" min="0" value={actualLaborHours}
                            onChange={(e) => setActualLaborHours(e.target.value)} />
                        <Input label="Labor cost" type="number" step="0.01" min="0" value={actualLaborCost}
                            onChange={(e) => setActualLaborCost(e.target.value)} />
                        <Input label="Parts cost" type="number" step="0.01" min="0" value={actualPartsCost}
                            onChange={(e) => setActualPartsCost(e.target.value)} />
                    </div>
                    <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleComplete} loading={completeMutation.isPending}>Complete</Button>
                </div>
            </Modal>
        </div>
    );
}