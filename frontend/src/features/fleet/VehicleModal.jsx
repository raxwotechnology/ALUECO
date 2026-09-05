import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateVehicle, useUpdateVehicle } from './useFleet';

const VehicleModal = ({ isOpen, onClose, vehicle }) => {
    const createVehicle = useCreateVehicle();
    const updateVehicle = useUpdateVehicle();

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            registrationNo: '',
            type: 'truck',
            make: '',
            model: '',
            year: new Date().getFullYear(),
            fuelType: 'diesel',
            currentOdometer: 0
        }
    });

    useEffect(() => {
        if (vehicle) {
            reset({
                registrationNo: vehicle.registrationNo,
                type: vehicle.type,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                fuelType: vehicle.fuelType,
                currentOdometer: vehicle.currentOdometer
            });
        } else {
            reset({
                registrationNo: '',
                type: 'truck',
                make: '',
                model: '',
                year: new Date().getFullYear(),
                fuelType: 'diesel',
                currentOdometer: 0
            });
        }
    }, [vehicle, reset]);

    const onSubmit = async (data) => {
        try {
            if (vehicle) {
                await updateVehicle.mutateAsync({ id: vehicle._id, data });
            } else {
                await createVehicle.mutateAsync(data);
            }
            onClose();
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Registration No."
                        required
                        error={errors.registrationNo?.message}
                        {...register('registrationNo', { required: 'Registration number is required' })}
                    />
                    <Select
                        label="Vehicle Type"
                        options={[
                            { value: 'truck', label: 'Truck' },
                            { value: 'van', label: 'Van' },
                            { value: 'pickup', label: 'Pickup' },
                            { value: 'container_trailer', label: 'Container Trailer' },
                            { value: 'motorcycle', label: 'Motorcycle' },
                            { value: 'other', label: 'Other' },
                        ]}
                        {...register('type')}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Make" {...register('make')} />
                    <Input label="Model" {...register('model')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input type="number" label="Year" {...register('year')} />
                    <Select
                        label="Fuel Type"
                        options={[
                            { value: 'diesel', label: 'Diesel' },
                            { value: 'petrol', label: 'Petrol' },
                            { value: 'electric', label: 'Electric' },
                            { value: 'hybrid', label: 'Hybrid' },
                        ]}
                        {...register('fuelType')}
                    />
                </div>
                <Input
                    type="number"
                    label="Current Odometer (km)"
                    {...register('currentOdometer')}
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={createVehicle.isPending || updateVehicle.isPending}>
                        {vehicle ? 'Update Vehicle' : 'Register Vehicle'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default VehicleModal;
