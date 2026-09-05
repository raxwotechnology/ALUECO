import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateTrip } from './useFleet';
import { Plus, Trash2 } from 'lucide-react';

const TripLogModal = ({ isOpen, onClose, vehicle }) => {
    const createTrip = useCreateTrip();
    const [items, setItems] = useState([{ item: '', quantity: '', uom: 'kg' }]);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            vehicleId: '',
            origin: '',
            destination: '',
            purpose: 'delivery',
            startOdometer: '',
            startDate: new Date().toISOString().split('T')[0],
            shift: 'day',
            quantityWeightTransported: ''
        }
    });

    useEffect(() => {
        if (vehicle) {
            reset({
                vehicleId: vehicle._id,
                startOdometer: vehicle.currentOdometer,
                startDate: new Date().toISOString().split('T')[0],
                origin: '',
                destination: '',
                purpose: 'delivery',
                shift: 'day',
                quantityWeightTransported: ''
            });
            setItems([{ item: '', quantity: '', uom: 'kg' }]);
        }
    }, [vehicle, reset]);

    const addItem = () => setItems([...items, { item: '', quantity: '', uom: 'kg' }]);
    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        } else {
            setItems([{ item: '', quantity: '', uom: 'kg' }]);
        }
    };
    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const onSubmit = async (data) => {
        try {
            const filteredItems = items.filter(i => i.item.trim() !== '');
            const payload = {
                ...data,
                startOdometer: Number(data.startOdometer),
                quantityWeightTransported: Number(data.quantityWeightTransported || 0),
                itemsTransported: filteredItems.map(i => ({
                    item: i.item,
                    quantity: Number(i.quantity || 0),
                    uom: i.uom
                }))
            };
            await createTrip.mutateAsync(payload);
            onClose();
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Log New Trip"
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center mb-4 border border-blue-100">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-blue-600">Selected Vehicle</p>
                        <p className="text-sm font-bold text-blue-900">{vehicle?.registrationNo}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-blue-600">Current Odometer</p>
                        <p className="text-sm font-bold text-blue-900">{vehicle?.currentOdometer} km</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Origin"
                        required
                        placeholder="e.g. Main Warehouse"
                        error={errors.origin?.message}
                        {...register('origin', { required: 'Origin is required' })}
                    />
                    <Input
                        label="Destination"
                        required
                        placeholder="e.g. Retail Branch A"
                        error={errors.destination?.message}
                        {...register('destination', { required: 'Destination is required' })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="date"
                        label="Start Date"
                        required
                        {...register('startDate', { required: 'Start date is required' })}
                    />
                    <Select
                        label="Purpose"
                        options={[
                            { value: 'delivery', label: 'Delivery' },
                            { value: 'pickup', label: 'Pickup' },
                            { value: 'service', label: 'Service' },
                            { value: 'other', label: 'Other' },
                        ]}
                        {...register('purpose')}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label="Start Odometer"
                        required
                        error={errors.startOdometer?.message}
                        {...register('startOdometer', { required: 'Start odometer is required' })}
                    />
                    <Select
                        label="Shift"
                        options={[
                            { value: 'day', label: 'Day Shift' },
                            { value: 'night', label: 'Night Shift' },
                        ]}
                        {...register('shift')}
                    />
                </div>

                <Input
                    type="number"
                    step="0.01"
                    label="Total Quantity/Weight (kg)"
                    placeholder="e.g. 500"
                    {...register('quantityWeightTransported')}
                />

                <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-700">Detailed Items Transported</label>
                        <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 px-2">
                            <Plus size={14} className="mr-1" /> Add Row
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Item description"
                                        value={item.item}
                                        onChange={(e) => updateItem(idx, 'item', e.target.value)}
                                        className="h-9 py-1"
                                    />
                                </div>
                                <div className="w-20">
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                        className="h-9 py-1"
                                    />
                                </div>
                                <div className="w-20">
                                    <Input
                                        placeholder="UOM"
                                        value={item.uom}
                                        onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                                        className="h-9 py-1"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removeItem(idx)}
                                    className="p-1 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={createTrip.isPending}>
                        Start Trip
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TripLogModal;
