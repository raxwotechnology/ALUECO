import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Factory } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { useProductionAction } from './useProduction';

export default function CompleteProductionModal({ isOpen, onClose, productionOrder }) {
    const { complete } = useProductionAction();

    const [consumption, setConsumption] = useState([]);
    const [labor, setLabor] = useState([]);
    const [output, setOutput] = useState([]);
    const [overheadCost, setOverheadCost] = useState(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && productionOrder) {
            setConsumption(productionOrder.consumption.map((c) => ({
                consumptionItemId: c._id,
                productId: c.productId?._id || c.productId,
                productName: c.productName,
                unitOfMeasure: c.unitOfMeasure,
                plannedQuantity: c.plannedQuantity,
                actualQuantity: c.plannedQuantity,
            })));
            setLabor(productionOrder.labor?.map((l) => ({
                laborLogId: l._id,
                laborType: l.laborType,
                description: l.description,
                plannedHours: l.plannedHours,
                actualHours: l.plannedHours,
                hourlyRate: l.hourlyRate,
            })) || []);
            setOutput(productionOrder.output.map((o) => ({
                productId: o.productId?._id || o.productId,
                productName: o.productName,
                unitOfMeasure: o.unitOfMeasure,
                plannedQuantity: o.plannedQuantity,
                actualQuantity: o.plannedQuantity,
                damagedQuantity: 0,
                rejectedQuantity: 0,
                qcStatus: 'passed',
                batchNumber: `B-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${productionOrder.productionNumber.split('-').pop()}`,
                manufactureDate: new Date().toISOString().slice(0, 10),
                expiryDate: '',
            })));
            setOverheadCost(0);
            setNotes('');
        }
    }, [isOpen, productionOrder]);

    const updateConsumption = (idx, field, value) => {
        const newC = [...consumption];
        newC[idx] = { ...newC[idx], [field]: value };
        setConsumption(newC);
    };
    const updateLabor = (idx, field, value) => {
        const newL = [...labor];
        newL[idx] = { ...newL[idx], [field]: value };
        setLabor(newL);
    };
    const updateOutput = (idx, field, value) => {
        const newO = [...output];
        newO[idx] = { ...newO[idx], [field]: value };
        setOutput(newO);
    };

    const submit = async () => {
        const totalOutput = output.reduce((s, o) => s + (+o.actualQuantity || 0), 0);
        if (totalOutput === 0) { toast.error('At least one output quantity must be > 0'); return; }

        try {
            await complete.mutateAsync({
                id: productionOrder._id,
                data: {
                    actualConsumption: consumption.map((c) => ({
                        consumptionItemId: c.consumptionItemId,
                        actualQuantity: +c.actualQuantity || 0,
                    })),
                    actualLabor: labor.map((l) => ({
                        laborLogId: l.laborLogId,
                        actualHours: +l.actualHours || 0,
                        hourlyRate: +l.hourlyRate || 0,
                    })),
                    output: output.map((o) => ({
                        actualQuantity: +o.actualQuantity || 0,
                        damagedQuantity: +o.damagedQuantity || 0,
                        rejectedQuantity: +o.rejectedQuantity || 0,
                        batchNumber: o.batchNumber,
                        manufactureDate: o.manufactureDate,
                        expiryDate: o.expiryDate || undefined,
                        qcStatus: o.qcStatus,
                    })),
                    overheadCost: +overheadCost || 0,
                    notes: notes || undefined,
                },
            });
            onClose();
        } catch { }
    };

    if (!productionOrder) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}
            title={`Complete Production — ${productionOrder.productionNumber}`} size="xl">
            <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                    <Factory size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        Completing production consumes raw materials from <strong>{productionOrder.sourceWarehouseId?.name}</strong> and adds finished goods to <strong>{productionOrder.outputWarehouseId?.name}</strong>. This action is atomic and cannot be undone.
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Actual Materials Consumed</h4>
                    <div className="space-y-2">
                        {consumption.map((c, idx) => (
                            <div key={c.consumptionItemId} className="grid grid-cols-4 gap-2 items-center border rounded p-2">
                                <div className="col-span-2">
                                    <p className="text-sm font-medium">{c.productName}</p>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                    Planned: {c.plannedQuantity} {c.unitOfMeasure}
                                </div>
                                <Input type="number" step="0.0001" min="0"
                                    value={c.actualQuantity}
                                    onChange={(e) => updateConsumption(idx, 'actualQuantity', e.target.value)} />
                            </div>
                        ))}
                    </div>
                </div>

                {labor.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Actual Labor</h4>
                        <div className="space-y-2">
                            {labor.map((l, idx) => (
                                <div key={l.laborLogId} className="grid grid-cols-4 gap-2 items-center border rounded p-2">
                                    <div className="col-span-2">
                                        <p className="text-sm font-medium capitalize">{l.laborType}</p>
                                        <p className="text-xs text-gray-500">{l.description}</p>
                                    </div>
                                    <Input type="number" step="0.01" min="0" placeholder="Actual hours"
                                        value={l.actualHours}
                                        onChange={(e) => updateLabor(idx, 'actualHours', e.target.value)} />
                                    <Input type="number" step="0.01" min="0" placeholder="Rate/hr"
                                        value={l.hourlyRate}
                                        onChange={(e) => updateLabor(idx, 'hourlyRate', e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Output</h4>
                    <div className="space-y-3">
                        {output.map((o, idx) => (
                            <div key={idx} className="border rounded-lg p-3">
                                <p className="text-sm font-medium mb-2">{o.productName}</p>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <Input label="Good (produced)" type="number" step="0.01" min="0"
                                        value={o.actualQuantity}
                                        onChange={(e) => updateOutput(idx, 'actualQuantity', e.target.value)} />
                                    <Input label="Damaged" type="number" step="0.01" min="0"
                                        value={o.damagedQuantity}
                                        onChange={(e) => updateOutput(idx, 'damagedQuantity', e.target.value)} />
                                    <Input label="Rejected" type="number" step="0.01" min="0"
                                        value={o.rejectedQuantity}
                                        onChange={(e) => updateOutput(idx, 'rejectedQuantity', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input label="Batch Number"
                                        value={o.batchNumber}
                                        onChange={(e) => updateOutput(idx, 'batchNumber', e.target.value)} />
                                    <Input label="Manufacture Date" type="date"
                                        value={o.manufactureDate}
                                        onChange={(e) => updateOutput(idx, 'manufactureDate', e.target.value)} />
                                    <Input label="Expiry Date" type="date"
                                        value={o.expiryDate}
                                        onChange={(e) => updateOutput(idx, 'expiryDate', e.target.value)} />
                                </div>
                                <div className="mt-2">
                                    <Select label="QC Status"
                                        options={[
                                            { value: 'pending', label: 'Pending QC' },
                                            { value: 'passed', label: 'Passed' },
                                            { value: 'failed', label: 'Failed' },
                                            { value: 'partial', label: 'Partial' },
                                        ]}
                                        value={o.qcStatus}
                                        onChange={(e) => updateOutput(idx, 'qcStatus', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Overhead Cost (LKR)" type="number" step="0.01" min="0"
                        value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} />
                </div>

                <Textarea label="Completion Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={complete.isPending}>
                    <Factory size={16} className="mr-1.5" /> Complete & Update Stock
                </Button>
            </div>
        </Modal>
    );
}