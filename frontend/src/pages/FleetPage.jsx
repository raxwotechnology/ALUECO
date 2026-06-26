import React, { useState } from 'react';
import {
    Truck, Plus, MapPin, Navigation, Fuel, Clock,
    Activity, Edit, Trash2, History, CheckCircle2
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useVehicles, useTrips, useUpdateVehicle } from '../features/fleet/useFleet';
import VehicleModal from '../features/fleet/VehicleModal';
import TripLogModal from '../features/fleet/TripLogModal';

const FleetPage = ({ defaultView = 'vehicles' }) => {
    const [view, setView] = useState(defaultView); // 'vehicles' or 'history'
    
    React.useEffect(() => {
        setView(defaultView);
    }, [defaultView]);

    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deletingVehicle, setDeletingVehicle] = useState(null);

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles();
    const { data: tripsData, isLoading: isLoadingTrips } = useTrips();

    const vehicles = vehiclesData?.data || [];
    const trips = tripsData?.data || [];

    const handleEditVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsVehicleModalOpen(true);
    };

    const handleLogTrip = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsTripModalOpen(true);
    };

    const tripColumns = [
        { key: 'date', label: 'Date', render: (r) => new Date(r.startDate).toLocaleDateString() },
        { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicleId?.registrationNo || r.vehicleId?.licensePlate || '—' },
        { key: 'route', label: 'Route', render: (r) => `${r.origin} → ${r.destination}` },
        { 
            key: 'shift', 
            label: 'Shift', 
            render: (r) => (
                <Badge variant={r.shift === 'night' ? 'dark' : 'warning'}>
                    {r.shift === 'night' ? 'Night Shift' : 'Day Shift'}
                </Badge>
            ) 
        },
        { key: 'purpose', label: 'Purpose', render: (r) => <Badge>{r.purpose}</Badge> },
        {
            key: 'items',
            label: 'Items & Weight',
            render: (r) => (
                <div className="max-w-[220px]">
                    <span className="font-semibold text-xs text-gray-700 block">
                        {r.quantityWeightTransported ? `${r.quantityWeightTransported} kg` : '—'}
                    </span>
                    {r.itemsTransported && r.itemsTransported.length > 0 && (
                        <span className="text-[10px] text-gray-500 block truncate" title={r.itemsTransported.map(i => `${i.item} (${i.quantity} ${i.uom})`).join(', ')}>
                            {r.itemsTransported.map(i => `${i.item} (${i.quantity} ${i.uom})`).join(', ')}
                        </span>
                    )}
                </div>
            )
        },
        { key: 'distance', label: 'Distance', render: (r) => r.endOdometer ? `${r.endOdometer - r.startOdometer} km` : 'Active' },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fleet & Logistics"
                description="Manage delivery vehicles and trip logs"
                actions={
                    <div className="flex gap-3">
                        <Button
                            variant={view === 'vehicles' ? 'primary' : 'outline'}
                            onClick={() => setView('vehicles')}
                            size="sm"
                        >
                            <Truck size={16} className="mr-1.5" /> Vehicles
                        </Button>
                        <Button
                            variant={view === 'history' ? 'primary' : 'outline'}
                            onClick={() => setView('history')}
                            size="sm"
                        >
                            <History size={16} className="mr-1.5" /> Trip History
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => { setSelectedVehicle(null); setIsVehicleModalOpen(true); }}
                        >
                            <Plus size={16} className="mr-1.5" /> Add Vehicle
                        </Button>
                    </div>
                }
            />

            {view === 'vehicles' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingVehicles ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))
                    ) : vehicles.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed text-sm">
                            No vehicles registered. Click "Add Vehicle" to get started.
                        </div>
                    ) : (
                        vehicles.map((v) => (
                            <div key={v._id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-gray-50 flex justify-between items-start bg-slate-50/50 text-gray-900">
                                    <div>
                                        <h3 className="font-bold">{v.registrationNo}</h3>
                                        <p className="text-xs text-gray-500">{v.make} {v.model} ({v.year})</p>
                                    </div>
                                    <Badge variant={v.status === 'available' ? 'success' : 'warning'}>
                                        {v.status.replace('_', ' ')}
                                    </Badge>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <Activity size={18} className="text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Odometer</p>
                                                <p className="text-sm font-bold text-gray-700">{(v.currentOdometer || 0).toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Fuel size={18} className="text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Fuel Type</p>
                                                <p className="text-sm font-bold text-gray-700 capitalize">{v.fuelType}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            fullWidth
                                            onClick={() => handleEditVehicle(v)}
                                            className="text-xs"
                                        >
                                            <Edit size={14} className="mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            fullWidth
                                            onClick={() => handleLogTrip(v)}
                                            disabled={v.status !== 'available'}
                                            className="text-xs"
                                        >
                                            <Navigation size={14} className="mr-1" /> Log Trip
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <Card>
                    {isLoadingTrips ? (
                        <div className="py-12 text-center text-gray-500">Loading trips...</div>
                    ) : trips.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">No trip logs found</div>
                    ) : (
                        <Table columns={tripColumns} data={trips} />
                    )}
                </Card>
            )}

            <VehicleModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                vehicle={selectedVehicle}
            />

            <TripLogModal
                isOpen={isTripModalOpen}
                onClose={() => setIsTripModalOpen(false)}
                vehicle={selectedVehicle}
            />
        </div>
    );
};

export default FleetPage;
