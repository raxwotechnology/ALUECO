import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Edit, Trash2, Layers, Tag, Settings, Wrench, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const AluDatabasePage = () => {
    const [activeTab, setActiveTab] = useState('profiles');
    const [loading, setLoading] = useState(true);
    
    // Lists
    const [profiles, setProfiles] = useState([]);
    const [glass, setGlass] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [applications, setApplications] = useState([]);
    
    // Modals
    const [isOpen, setIsOpen] = useState(false);
    const [currentEdit, setCurrentEdit] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Autocomplete active indexes
    const [activeProfileSuggestionIdx, setActiveProfileSuggestionIdx] = useState(null);
    const [activeGlassSuggestionIdx, setActiveGlassSuggestionIdx] = useState(null);
    const [activeAccessorySuggestionIdx, setActiveAccessorySuggestionIdx] = useState(null);
    
    // Form States
    const [profileForm, setProfileForm] = useState({ profileCode: '', description: '', supplier: '', standardLengths: [{ lengthMm: 2134, price: 0 }] });
    const [glassForm, setGlassForm] = useState({ typeName: '', thickness: '', ratePerSqFt: 0, ratePerSqM: 0, temperingCharge: 0, processingCharge: 0 });
    const [accessoryForm, setAccessoryForm] = useState({ code: '', name: '', brand: '', unit: 'Nos', purchaseRate: 0, sellingRate: 0 });
    const [appForm, setAppForm] = useState({
        type: 'Sliding Door',
        configuration: '',
        description: '',
        profileBOM: [{ profileCode: '', description: '', quantityFormula: '', lengthFormula: '' }],
        glassBOM: [{ glassType: '', quantityFormula: '', widthFormula: '', heightFormula: '' }],
        accessoryBOM: [{ accessoryCode: '', quantityFormula: '' }],
        labourMethod: 'opening',
        labourRate: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profRes, glassRes, accRes, appRes] = await Promise.all([
                api.get('/alu/profiles'),
                api.get('/alu/glass'),
                api.get('/alu/accessories'),
                api.get('/alu/applications')
            ]);
            setProfiles(profRes.data.data || []);
            setGlass(glassRes.data.data || []);
            setAccessories(accRes.data.data || []);
            setApplications(appRes.data.data || []);
        } catch (error) {
            toast.error('Failed to load database rates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openAddEditModal = (item = null) => {
        setCurrentEdit(item);
        if (activeTab === 'profiles') {
            setProfileForm(item ? { ...item } : { profileCode: '', description: '', supplier: '', standardLengths: [{ lengthMm: 2134, price: 0 }] });
        } else if (activeTab === 'glass') {
            setGlassForm(item ? { ...item } : { typeName: '', thickness: '', ratePerSqFt: 0, ratePerSqM: 0, temperingCharge: 0, processingCharge: 0 });
        } else if (activeTab === 'accessories') {
            setAccessoryForm(item ? { ...item } : { code: '', name: '', brand: '', unit: 'Nos', purchaseRate: 0, sellingRate: 0 });
        } else if (activeTab === 'applications') {
            setAppForm(item ? { ...item } : {
                type: 'Sliding Door',
                configuration: '',
                description: '',
                profileBOM: [{ profileCode: '', description: '', quantityFormula: '', lengthFormula: '' }],
                glassBOM: [{ glassType: '', quantityFormula: '', widthFormula: '', heightFormula: '' }],
                accessoryBOM: [{ accessoryCode: '', quantityFormula: '' }],
                labourMethod: 'opening',
                labourRate: 0
            });
        }
        setIsOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        let payload = {};
        let endpoint = `/alu/${activeTab}`;
        
        if (activeTab === 'profiles') payload = profileForm;
        else if (activeTab === 'glass') payload = glassForm;
        else if (activeTab === 'accessories') payload = accessoryForm;
        else if (activeTab === 'applications') payload = appForm;

        try {
            if (currentEdit) {
                await api.put(`${endpoint}/${currentEdit._id}`, payload);
                toast.success('Record updated successfully');
            } else {
                await api.post(endpoint, payload);
                toast.success('Record created successfully');
            }
            setIsOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save record');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/alu/${activeTab}/${deletingId}`);
            toast.success('Record deleted successfully');
            setDeletingId(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to delete record');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ALUECO Pricing & Config Database</h1>
                    <p className="text-slate-500 mt-1">Manage aluminium system profiles, standard lengths, glass, accessories, and application formulas.</p>
                </div>
                <Button onClick={() => openAddEditModal()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200">
                    <Plus size={18} /> Add New Record
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-sm gap-2">
                {[
                    { id: 'profiles', label: 'Aluminium Profiles', icon: Layers },
                    { id: 'glass', label: 'Glass Rates', icon: Tag },
                    { id: 'accessories', label: 'Accessories', icon: Wrench },
                    { id: 'applications', label: 'Application BOM Templates', icon: Settings }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                            activeTab === t.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* List Panels */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {activeTab === 'profiles' && (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile Code</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard Selling Lengths (Price)</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {profiles.map(p => (
                                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-600 text-sm">{p.profileCode}</td>
                                            <td className="px-6 py-4 text-slate-700 text-sm">{p.description}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{p.supplier}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-wrap gap-2">
                                                    {p.standardLengths.map((sl, idx) => (
                                                        <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-semibold">
                                                            {parseFloat((sl.lengthMm / 304.8).toFixed(1))} ft ({sl.lengthMm}mm) - LKR {sl.price.toLocaleString()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => openAddEditModal(p)} className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><Edit size={16} /></button>
                                                <button onClick={() => setDeletingId(p._id)} className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'glass' && (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Glass Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thickness</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate/Sq.Ft</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate/Sq.M</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tempering Charge</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Processing Charge</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {glass.map(g => (
                                        <tr key={g._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 text-sm">{g.typeName}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{g.thickness}</td>
                                            <td className="px-6 py-4 text-slate-700 text-sm font-semibold">LKR {g.ratePerSqFt}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">LKR {g.ratePerSqM}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">LKR {g.temperingCharge}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">LKR {g.processingCharge}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => openAddEditModal(g)} className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><Edit size={16} /></button>
                                                <button onClick={() => setDeletingId(g._id)} className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'accessories' && (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Accessory Code</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Brand</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quoting Price</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {accessories.map(a => (
                                        <tr key={a._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 text-sm">{a.code}</td>
                                            <td className="px-6 py-4 text-slate-700 text-sm font-medium">{a.name}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{a.brand}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{a.unit}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">LKR {a.purchaseRate}</td>
                                            <td className="px-6 py-4 text-emerald-700 text-sm font-semibold">LKR {a.sellingRate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => openAddEditModal(a)} className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><Edit size={16} /></button>
                                                <button onClick={() => setDeletingId(a._id)} className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'applications' && (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Application Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuration</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile BOM cuts count</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Labour Pricing</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {applications.map(app => (
                                        <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 text-sm">{app.type}</td>
                                            <td className="px-6 py-4 text-slate-700 text-sm font-semibold">{app.configuration}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">
                                                    {app.profileBOM.length} profiles
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                Method: <strong className="uppercase">{app.labourMethod}</strong> | Rate: <strong>LKR {app.labourRate}</strong>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => openAddEditModal(app)} className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100"><Edit size={16} /></button>
                                                <button onClick={() => setDeletingId(app._id)} className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingId}
                title="Delete Record"
                message="Are you sure you want to delete this record? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />

            {/* Add / Edit Modal */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${currentEdit ? 'Edit' : 'Add'} ${activeTab.slice(0, -1)}`}>
                <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                    {activeTab === 'profiles' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Profile Code</label>
                                    <input type="text" value={profileForm.profileCode} onChange={e => setProfileForm({ ...profileForm, profileCode: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                                    <input type="text" value={profileForm.supplier} onChange={e => setProfileForm({ ...profileForm, supplier: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input type="text" value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                            </div>
                            
                            {/* Standard Lengths */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium text-slate-700">Available Supplier Lengths</label>
                                    <button type="button" onClick={() => setProfileForm({ ...profileForm, standardLengths: [...profileForm.standardLengths, { lengthMm: 3658, price: 0 }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">+ Add Length</button>
                                </div>
                                {profileForm.standardLengths.map((sl, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <input type="number" placeholder="Length in mm" value={sl.lengthMm} onChange={e => {
                                                const newLengths = [...profileForm.standardLengths];
                                                newLengths[idx].lengthMm = Number(e.target.value);
                                                setProfileForm({ ...profileForm, standardLengths: newLengths });
                                            }} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                        </div>
                                        <div className="flex-1">
                                            <input type="number" placeholder="Price (LKR)" value={sl.price} onChange={e => {
                                                const newLengths = [...profileForm.standardLengths];
                                                newLengths[idx].price = Number(e.target.value);
                                                setProfileForm({ ...profileForm, standardLengths: newLengths });
                                            }} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                        </div>
                                        <button type="button" onClick={() => setProfileForm({ ...profileForm, standardLengths: profileForm.standardLengths.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500"><X size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'glass' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Glass Type Name</label>
                                <input type="text" value={glassForm.typeName} onChange={e => setGlassForm({ ...glassForm, typeName: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Thickness (e.g., 5mm)</label>
                                    <input type="text" value={glassForm.thickness} onChange={e => setGlassForm({ ...glassForm, thickness: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate / Sq.Ft (LKR)</label>
                                    <input type="number" value={glassForm.ratePerSqFt} onChange={e => setGlassForm({ ...glassForm, ratePerSqFt: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate / Sq.M (LKR)</label>
                                    <input type="number" value={glassForm.ratePerSqM} onChange={e => setGlassForm({ ...glassForm, ratePerSqM: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tempering / Sq.Ft</label>
                                    <input type="number" value={glassForm.temperingCharge} onChange={e => setGlassForm({ ...glassForm, temperingCharge: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Processing / Sq.Ft</label>
                                    <input type="number" value={glassForm.processingCharge} onChange={e => setGlassForm({ ...glassForm, processingCharge: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'accessories' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Accessory Code</label>
                                    <input type="text" value={accessoryForm.code} onChange={e => setAccessoryForm({ ...accessoryForm, code: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                                    <input type="text" value={accessoryForm.name} onChange={e => setAccessoryForm({ ...accessoryForm, name: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                                    <input type="text" value={accessoryForm.brand} onChange={e => setAccessoryForm({ ...accessoryForm, brand: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit (e.g. Nos, m, ft)</label>
                                    <input type="text" value={accessoryForm.unit} onChange={e => setAccessoryForm({ ...accessoryForm, unit: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Rate (LKR)</label>
                                    <input type="number" value={accessoryForm.purchaseRate} onChange={e => setAccessoryForm({ ...accessoryForm, purchaseRate: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Rate (LKR)</label>
                                    <input type="number" value={accessoryForm.sellingRate} onChange={e => setAccessoryForm({ ...accessoryForm, sellingRate: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'applications' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Application Type</label>
                                    <select value={appForm.type} onChange={e => setAppForm({ ...appForm, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600">
                                        <option value="Sliding Door">Sliding Door</option>
                                        <option value="Sliding Window">Sliding Window</option>
                                        <option value="Casement Window">Casement Window</option>
                                        <option value="Swing Door">Swing Door</option>
                                        <option value="Fixed Glass">Fixed Glass</option>
                                        <option value="Folding Door">Folding Door</option>
                                        <option value="Louver Window">Louver Window</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Configuration (e.g. 3 Panel - 2 Track)</label>
                                    <input type="text" placeholder="e.g. 3 Panel - 2 Track" value={appForm.configuration} onChange={e => setAppForm({ ...appForm, configuration: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input type="text" value={appForm.description} onChange={e => setAppForm({ ...appForm, description: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                            </div>

                            {/* Profiles BOM Cuts */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-800">Aluminium Profile BOM Formulas</h4>
                                    <button type="button" onClick={() => setAppForm({ ...appForm, profileBOM: [...appForm.profileBOM, { profileCode: '', description: '', quantityFormula: '', lengthFormula: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">+ Add Profile</button>
                                </div>
                                {appForm.profileBOM.map((pb, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative">
                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Code (e.g., SD1001)" 
                                                    value={pb.profileCode} 
                                                    onChange={e => {
                                                        const newBOM = [...appForm.profileBOM];
                                                        newBOM[idx].profileCode = e.target.value;
                                                        setAppForm({ ...appForm, profileBOM: newBOM });
                                                    }} 
                                                    onFocus={() => setActiveProfileSuggestionIdx(idx)}
                                                    onBlur={() => setTimeout(() => setActiveProfileSuggestionIdx(null), 200)}
                                                    required 
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-full" 
                                                />
                                                {activeProfileSuggestionIdx === idx && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                                        {profiles
                                                            .filter(p => 
                                                                (p.profileCode || '').toLowerCase().includes((pb.profileCode || '').toLowerCase()) ||
                                                                (p.description || '').toLowerCase().includes((pb.profileCode || '').toLowerCase())
                                                            )
                                                            .slice(0, 10)
                                                            .map(p => (
                                                                <div
                                                                    key={p._id || p.profileCode}
                                                                    onMouseDown={() => {
                                                                        const newBOM = [...appForm.profileBOM];
                                                                        newBOM[idx].profileCode = p.profileCode;
                                                                        newBOM[idx].description = p.description || '';
                                                                        setAppForm({ ...appForm, profileBOM: newBOM });
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex flex-col items-start border-b border-slate-100 last:border-0"
                                                                >
                                                                    <span className="font-bold text-slate-800">{p.profileCode}</span>
                                                                    {p.description && <span className="text-slate-500 text-[10px] truncate w-full">{p.description}</span>}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            <input type="text" placeholder="Description (e.g., Vertical Sash)" value={pb.description} onChange={e => {
                                                const newBOM = [...appForm.profileBOM];
                                                newBOM[idx].description = e.target.value;
                                                setAppForm({ ...appForm, profileBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs" />
                                            <input type="text" placeholder="Qty Formula (e.g., 2 * P)" value={pb.quantityFormula} onChange={e => {
                                                const newBOM = [...appForm.profileBOM];
                                                newBOM[idx].quantityFormula = e.target.value;
                                                setAppForm({ ...appForm, profileBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                            <input type="text" placeholder="Length Formula (e.g., H - 50)" value={pb.lengthFormula} onChange={e => {
                                                const newBOM = [...appForm.profileBOM];
                                                newBOM[idx].lengthFormula = e.target.value;
                                                setAppForm({ ...appForm, profileBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                        </div>
                                        <button type="button" onClick={() => setAppForm({ ...appForm, profileBOM: appForm.profileBOM.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 absolute -top-1.5 -right-1.5 bg-white p-1 rounded-full border shadow-sm"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>

                            {/* Glass BOM Formulas */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-800">Glass BOM Formulas</h4>
                                    <button type="button" onClick={() => setAppForm({ ...appForm, glassBOM: [...appForm.glassBOM, { glassType: '', quantityFormula: '', widthFormula: '', heightFormula: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">+ Add Glass</button>
                                </div>
                                {appForm.glassBOM.map((gb, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative">
                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Glass Type (e.g., 5mm Tempered)" 
                                                    value={gb.glassType} 
                                                    onChange={e => {
                                                        const newBOM = [...appForm.glassBOM];
                                                        newBOM[idx].glassType = e.target.value;
                                                        setAppForm({ ...appForm, glassBOM: newBOM });
                                                    }} 
                                                    onFocus={() => setActiveGlassSuggestionIdx(idx)}
                                                    onBlur={() => setTimeout(() => setActiveGlassSuggestionIdx(null), 200)}
                                                    required 
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-full" 
                                                />
                                                {activeGlassSuggestionIdx === idx && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                                        {glass
                                                            .filter(g => 
                                                                (g.typeName || '').toLowerCase().includes((gb.glassType || '').toLowerCase()) ||
                                                                (g.thickness || '').toLowerCase().includes((gb.glassType || '').toLowerCase())
                                                            )
                                                            .slice(0, 10)
                                                            .map(g => (
                                                                <div
                                                                    key={g._id || g.typeName}
                                                                    onMouseDown={() => {
                                                                        const newBOM = [...appForm.glassBOM];
                                                                        newBOM[idx].glassType = g.typeName;
                                                                        setAppForm({ ...appForm, glassBOM: newBOM });
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex flex-col items-start border-b border-slate-100 last:border-0"
                                                                >
                                                                    <span className="font-bold text-slate-800">{g.typeName}</span>
                                                                    {g.thickness && <span className="text-slate-500 text-[10px]">{g.thickness}</span>}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            <input type="text" placeholder="Qty Formula (e.g. P)" value={gb.quantityFormula} onChange={e => {
                                                const newBOM = [...appForm.glassBOM];
                                                newBOM[idx].quantityFormula = e.target.value;
                                                setAppForm({ ...appForm, glassBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                            <input type="text" placeholder="Width Formula (e.g. W/3 - 100)" value={gb.widthFormula} onChange={e => {
                                                const newBOM = [...appForm.glassBOM];
                                                newBOM[idx].widthFormula = e.target.value;
                                                setAppForm({ ...appForm, glassBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                            <input type="text" placeholder="Height Formula (e.g. H - 180)" value={gb.heightFormula} onChange={e => {
                                                const newBOM = [...appForm.glassBOM];
                                                newBOM[idx].heightFormula = e.target.value;
                                                setAppForm({ ...appForm, glassBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                        </div>
                                        <button type="button" onClick={() => setAppForm({ ...appForm, glassBOM: appForm.glassBOM.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 absolute -top-1.5 -right-1.5 bg-white p-1 rounded-full border shadow-sm"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>

                            {/* Accessory BOM Formulas */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-800">Accessories BOM Formulas</h4>
                                    <button type="button" onClick={() => setAppForm({ ...appForm, accessoryBOM: [...appForm.accessoryBOM, { accessoryCode: '', quantityFormula: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">+ Add Accessory</button>
                                </div>
                                {appForm.accessoryBOM.map((ab, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative">
                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Accessory Code (e.g. ACC001)" 
                                                    value={ab.accessoryCode} 
                                                    onChange={e => {
                                                        const newBOM = [...appForm.accessoryBOM];
                                                        newBOM[idx].accessoryCode = e.target.value;
                                                        setAppForm({ ...appForm, accessoryBOM: newBOM });
                                                    }} 
                                                    onFocus={() => setActiveAccessorySuggestionIdx(idx)}
                                                    onBlur={() => setTimeout(() => setActiveAccessorySuggestionIdx(null), 200)}
                                                    required 
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-full" 
                                                />
                                                {activeAccessorySuggestionIdx === idx && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                                        {accessories
                                                            .filter(a => 
                                                                (a.code || '').toLowerCase().includes((ab.accessoryCode || '').toLowerCase()) ||
                                                                (a.name || '').toLowerCase().includes((ab.accessoryCode || '').toLowerCase())
                                                            )
                                                            .slice(0, 10)
                                                            .map(a => (
                                                                <div
                                                                    key={a._id || a.code}
                                                                    onMouseDown={() => {
                                                                        const newBOM = [...appForm.accessoryBOM];
                                                                        newBOM[idx].accessoryCode = a.code;
                                                                        setAppForm({ ...appForm, accessoryBOM: newBOM });
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex flex-col items-start border-b border-slate-100 last:border-0"
                                                                >
                                                                    <span className="font-bold text-slate-800">{a.code}</span>
                                                                    {a.name && <span className="text-slate-500 text-[10px] truncate w-full">{a.name}</span>}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            <input type="text" placeholder="Quantity Formula (e.g. 2 * P)" value={ab.quantityFormula} onChange={e => {
                                                const newBOM = [...appForm.accessoryBOM];
                                                newBOM[idx].quantityFormula = e.target.value;
                                                setAppForm({ ...appForm, accessoryBOM: newBOM });
                                            }} required className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                                        </div>
                                        <button type="button" onClick={() => setAppForm({ ...appForm, accessoryBOM: appForm.accessoryBOM.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 absolute -top-1.5 -right-1.5 bg-white p-1 rounded-full border shadow-sm"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>

                            {/* Labour Configuration */}
                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Labour Charge Method</label>
                                    <select value={appForm.labourMethod} onChange={e => setAppForm({ ...appForm, labourMethod: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600">
                                        <option value="opening">Per Opening</option>
                                        <option value="sqft">Per Sq.Ft</option>
                                        <option value="sqm">Per Sq.M</option>
                                        <option value="fixed">Fixed Project Cost</option>
                                        <option value="percentage">% of Material Cost</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Labour Rate (LKR or %)</label>
                                    <input type="number" value={appForm.labourRate} onChange={e => setAppForm({ ...appForm, labourRate: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button type="button" onClick={() => setIsOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl text-sm font-semibold">Cancel</Button>
                        <Button type="submit" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-sm font-semibold shadow-sm"><Save size={16} /> Save Record</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AluDatabasePage;
