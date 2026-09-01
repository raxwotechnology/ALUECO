import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const getCachedSettings = () => {
    try {
        const cached = localStorage.getItem('cached_system_settings');
        if (cached) {
            return { success: true, data: JSON.parse(cached) };
        }
    } catch (e) {}
    return undefined;
};

const settingsApi = {
    get: async () => {
        const res = (await api.get('/settings')).data;
        if (res?.data) {
            try {
                localStorage.setItem('cached_system_settings', JSON.stringify(res.data));
            } catch (e) {}
        }
        return res;
    },
    update: async (data) => {
        const res = (await api.put('/settings', data)).data;
        if (res?.data) {
            try {
                localStorage.setItem('cached_system_settings', JSON.stringify(res.data));
            } catch (e) {}
        }
        return res;
    },
};

export const useSettings = () => useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    initialData: getCachedSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
});

export const useUpdateSettings = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.update,
        onSuccess: (res) => {
            if (res?.data) {
                try {
                    localStorage.setItem('cached_system_settings', JSON.stringify(res.data));
                } catch (e) {}
            }
            qc.invalidateQueries({ queryKey: ['settings'] });
            toast.success('System settings updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update settings'),
    });
};
