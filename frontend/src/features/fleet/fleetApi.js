import api from '../../api/axios';

export const fleetApi = {
    // Vehicles
    listVehicles: (params) => api.get('/fleet/vehicles', { params }).then(res => res.data),
    getVehicle: (id) => api.get(`/fleet/vehicles/${id}`).then(res => res.data),
    createVehicle: (data) => api.post('/fleet/vehicles', data).then(res => res.data),
    updateVehicle: (id, data) => api.put(`/fleet/vehicles/${id}`, data).then(res => res.data),
    deleteVehicle: (id) => api.delete(`/fleet/vehicles/${id}`).then(res => res.data),

    // Trip Logs
    listTrips: (params) => api.get('/fleet/trips', { params }).then(res => res.data),
    createTrip: (data) => api.post('/fleet/trips', data).then(res => res.data),
    completeTrip: (id, data) => api.put(`/fleet/trips/${id}/complete`, data).then(res => res.data),
    getTrip: (id) => api.get(`/fleet/trips/${id}`).then(res => res.data),
};
