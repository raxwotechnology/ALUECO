import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Truck, MapPin, Ship,
    ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';

const ShipmentsPage = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [saving, setSaving] = useState(false);
    const [expandedShipmentId, setExpandedShipmentId] = useState(null);
    const [formData, setFormData] = useState({
        bookingReference: '', destinationCountry: '', vesselName: '',
        containerNumber: '', sealNumber: '', estimatedArrivalDate: '',
        status: 'booked'
    });

    const shipmentSchema = [
        { name: 'bookingReference', label: 'Booking Reference', type: 'text', required: false },
        { name: 'destinationCountry', label: 'Destination Country', type: 'text', required: false },
        { name: 'vesselName', label: 'Vessel Name', type: 'text' },
        { name: 'estimatedArrivalDate', label: 'ETA', type: 'date' },
        { name: 'containerNumber', label: 'Container Number', type: 'text' },
        { name: 'sealNumber', label: 'Seal Number', type: 'text' },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'booked', label: 'Booked' },
                { value: 'loading', label: 'Loading' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'in_transit', label: 'In Transit' },
                { value: 'arrived', label: 'Arrived' },
                { value: 'cleared', label: 'Cleared' },
                { value: 'delivered', label: 'Delivered' }
            ]
        }
    ];

    const fetchShipments = async () => {
        try {
            const { data } = await api.get('/export-shipments');
            setShipments(data.data || []);
        } catch (error) {
            toast.error('Failed to load shipments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    const openModal = (shipment = null) => {
        if (shipment) {
            setSelectedShipment(shipment);
            setFormData({
                bookingReference: shipment.bookingReference || '',
                destinationCountry: shipment.destinationCountry || '',
                vesselName: shipment.vesselName || '',
                containerNumber: shipment.containerNumber || '',
                sealNumber: shipment.sealNumber || '',
                estimatedArrivalDate: shipment.estimatedArrivalDate ? new Date(shipment.estimatedArrivalDate).toISOString().split('T')[0] : '',
                status: shipment.status || 'booked'
            });
        } else {
            setSelectedShipment(null);
            setFormData({
                bookingReference: '', destinationCountry: '', vesselName: '',
                containerNumber: '', sealNumber: '', estimatedArrivalDate: '',
                status: 'booked'
            });
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            if (selectedShipment) {
                await api.put(`/export-shipments/${selectedShipment._id}`, formData);
                toast.success('Shipment updated');
            } else {
                await api.post('/export-shipments', formData);
                toast.success('Shipment booked successfully');
            }
            setIsModalOpen(false);
            fetchShipments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save shipment');
        } finally {
            setSaving(false);
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            booked: 'text-blue-500',
            loading: 'text-yellow-500',
            shipped: 'text-indigo-500',
            in_transit: 'text-cyan-500',
            arrived: 'text-emerald-500',
            cleared: 'text-green-500',
            delivered: 'text-purple-500',
        };
        return styles[status] || 'text-gray-400';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Export Shipments</h2>
                    <p className="text-sm text-gray-500">Track containers, vessels, and international documentation</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus size={18} className="mr-1.5" />
                    Book Shipment
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))
                ) : shipments.length === 0 ? (
                    <div className="py-20 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                        <Truck size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="italic">No shipments recorded yet</p>
                    </div>
                ) : (
                    shipments.map((shipment) => (
                        <div key={shipment._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full bg-current ${getStatusStyle(shipment.status)}`}></div>

                            <div className="flex flex-wrap lg:flex-nowrap gap-8 items-center text-gray-900">
                                {/* Route Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            <Ship size={20} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{shipment.bookingReference}</h4>
                                            <p className="text-xs text-gray-500">{shipment.vesselName || 'TBA'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-gray-400" />
                                            LK CMB
                                        </div>
                                        <div className="h-px w-8 bg-gray-200"></div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-gray-400" />
                                            {shipment.destinationCountry}
                                        </div>
                                    </div>
                                </div>

                                {/* Tracking Info */}
                                <div className="flex gap-10">
                                    <div className="text-center px-4 border-l border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Container</p>
                                        <p className="text-sm font-mono font-bold text-gray-700">{shipment.containerNumber || 'PENDING'}</p>
                                    </div>
                                    <div className="text-center px-4 border-l border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">ETA</p>
                                        <p className="text-sm font-bold text-gray-700">
                                            {shipment.estimatedArrivalDate ? format(new Date(shipment.estimatedArrivalDate), 'MMM dd') : '--'}
                                        </p>
                                    </div>
                                    <div className="text-center px-4 border-l border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Status</p>
                                        <p className={`text-sm font-bold uppercase tracking-widest ${getStatusStyle(shipment.status)}`}>
                                            {shipment.status}
                                        </p>
                                    </div>
                                </div>

                                 {/* Action */}
                                 <div className="flex items-center gap-2 lg:ml-auto">
                                     <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => openModal(shipment)}
                                     >
                                         Edit
                                     </Button>
                                     <button 
                                         onClick={() => setExpandedShipmentId(expandedShipmentId === shipment._id ? null : shipment._id)}
                                         className={`p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-transform duration-250 ${expandedShipmentId === shipment._id ? 'rotate-90 text-primary-600 bg-primary-50' : ''}`}
                                         title="Toggle Details"
                                     >
                                         <ChevronRight size={20} />
                                     </button>
                                 </div>
                             </div>

                             {expandedShipmentId === shipment._id && (
                                 <div className="mt-6 pt-6 border-t border-gray-150 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700 bg-gray-50/50 p-4 rounded-xl">
                                     <div>
                                         <h5 className="font-bold text-gray-900 mb-2">Shipment Details</h5>
                                         <p className="mb-1"><span className="text-gray-500">Seal Number:</span> <span className="font-mono font-semibold">{shipment.sealNumber || 'N/A'}</span></p>
                                         <p className="mb-1"><span className="text-gray-500">Container Number:</span> <span className="font-mono font-semibold">{shipment.containerNumber || 'N/A'}</span></p>
                                         <p className="mb-1"><span className="text-gray-500">Vessel Name:</span> <span className="font-semibold">{shipment.vesselName || 'N/A'}</span></p>
                                         <p className="mb-1"><span className="text-gray-500">Destination:</span> <span className="font-semibold">{shipment.destinationCountry || 'N/A'}</span></p>
                                     </div>
                                     <div>
                                         <h5 className="font-bold text-gray-900 mb-2">Transit Timeline</h5>
                                         <div className="flex items-center gap-2 flex-wrap">
                                             {['booked', 'loading', 'shipped', 'in_transit', 'arrived', 'cleared', 'delivered'].map((step, idx) => {
                                                 const isPassed = ['booked', 'loading', 'shipped', 'in_transit', 'arrived', 'cleared', 'delivered'].indexOf(shipment.status) >= idx;
                                                 return (
                                                     <React.Fragment key={step}>
                                                         {idx > 0 && <span className={`text-xs ${isPassed ? 'text-primary-500' : 'text-gray-300'}`}>→</span>}
                                                         <span className={`px-2 py-1 rounded text-xs font-semibold ${isPassed ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                             {step.replace('_', ' ')}
                                                         </span>
                                                     </React.Fragment>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedShipment ? 'Edit Shipment' : 'Book New Shipment'}
                size="lg"
            >
                <div className="p-6">
                    <DynamicForm
                        schema={shipmentSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel={selectedShipment ? 'Update Shipment' : 'Confirm Booking'}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default ShipmentsPage;
