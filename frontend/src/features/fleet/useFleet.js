import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetApi } from './fleetApi';
import toast from 'react-hot-toast';

export const useVehicles = (params = {}) => {
    return useQuery({
        queryKey: ['fleet', 'vehicles', params],
        queryFn: () => fleetApi.listVehicles(params),
    });
};

export const useCreateVehicle = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: fleetApi.createVehicle,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
            toast.success('Vehicle added successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to add vehicle'),
    });
};

export const useUpdateVehicle = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => fleetApi.updateVehicle(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fleet', 'vehicles'] });
            toast.success('Vehicle updated successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update vehicle'),
    });
};

export const useTrips = (params = {}) => {
    return useQuery({
        queryKey: ['fleet', 'trips', params],
        queryFn: () => fleetApi.listTrips(params),
    });
};

export const useCreateTrip = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: fleetApi.createTrip,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fleet'] });
            toast.success('Trip logged successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to log trip'),
    });
};

export const useCompleteTrip = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => fleetApi.completeTrip(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fleet'] });
            toast.success('Trip completed successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to complete trip'),
    });
};
