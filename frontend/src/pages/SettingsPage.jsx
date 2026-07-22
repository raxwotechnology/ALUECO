import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Building2, DollarSign, Package, Save, Globe,
    Phone, Mail, MapPin, Hash, BadgeCheck, AlertTriangle,
    ChevronRight, CheckCircle2, Upload, Image as ImageIcon, X
} from 'lucide-react';

import { useSettings, useUpdateSettings } from '../features/settings/useSettings';

const settingsSchema = z.object({
    companyName: z.string().min(1, 'Company name required'),
    companyAddress: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    companyLogo: z.string().optional(),
    secondaryLogo: z.string().optional(),
    taxId: z.string().optional(),
    currency: z.string().min(1, 'Currency required'),
    currencySymbol: z.string().min(1, 'Symbol required'),
    defaultTaxRate: z.coerce.number().min(0),
    lowStockThreshold: z.coerce.number().min(0),
});

const TABS = [
    { id: 'company',   label: 'Company Profile',    icon: Building2,  color: 'text-blue-500' },
    { id: 'finance',   label: 'Financial Defaults', icon: DollarSign, color: 'text-emerald-500' },
    { id: 'inventory', label: 'Inventory Settings', icon: Package,    color: 'text-amber-500' },
];

function SectionBadge({ icon: Icon, label, accent = 'blue' }) {
    const map = {
        blue:    'bg-blue-50 border-blue-200 text-blue-600',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        amber:   'bg-amber-50 border-amber-200 text-amber-600',
    };
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-5 ${map[accent]}`}>
            <Icon size={13} />
            <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
        </div>
    );
}

function StyledInput({ label, icon: Icon, error, type = 'text', step, placeholder, registration, required }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {label}{required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none">
                        <Icon size={15} />
                    </div>
                )}
                <input
                    type={type}
                    step={step}
                    placeholder={placeholder}
                    {...registration}
                    className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl bg-white border text-sm text-gray-800 placeholder-gray-300 outline-none transition-all
                        ${error
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20'
                            : 'border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                />
            </div>
            {error && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={11} /> {error}
                </p>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const { data, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();
    const [activeTab, setActiveTab] = useState('company');
    const [saved, setSaved] = useState(false);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            companyName: 'ALUECO Aluminium Systems',
            companyLogo: '',
            secondaryLogo: '',
            currency: 'LKR',
            currencySymbol: 'Rs.',
            defaultTaxRate: 0,
            lowStockThreshold: 10,
        },
    });

    const companyLogoValue = watch('companyLogo');
    const secondaryLogoValue = watch('secondaryLogo');

    useEffect(() => {
        if (data?.data) reset(data.data);
    }, [data, reset]);

    const handleFileUpload = (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setValue(fieldName, reader.result, { shouldValidate: true, shouldDirty: true });
        };
        reader.readAsDataURL(file);
    };

    const onSubmit = async (formData) => {
        await updateMutation.mutateAsync(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            {/* ── Page Header ─────────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                    <span>Admin</span>
                    <ChevronRight size={12} />
                    <span className="text-emerald-500 font-medium">System Settings</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
                        <p className="text-gray-400 text-sm mt-1">Configure company profile, financial defaults &amp; inventory behaviour</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        disabled={updateMutation.isPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md
                            ${saved
                                ? 'bg-emerald-600 text-white shadow-emerald-200'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                            }`}
                    >
                        {saved ? (
                            <><CheckCircle2 size={16} /> Saved!</>
                        ) : updateMutation.isPending ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                        ) : (
                            <><Save size={16} /> Save Settings</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Layout ──────────────────────────────────────────── */}
            <div className="flex gap-6">

                {/* Sidebar tabs */}
                <div className="w-52 flex-shrink-0">
                    <nav className="flex flex-col gap-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all
                                        ${isActive
                                            ? 'bg-white border border-gray-200 text-emerald-600 shadow-sm'
                                            : 'text-gray-500 hover:bg-white hover:text-gray-700 border border-transparent'
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-emerald-500' : tab.color} />
                                    {tab.label}
                                    {isActive && <ChevronRight size={14} className="ml-auto text-emerald-400" />}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Company badge card */}
                    <div className="mt-6 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                            <Building2 size={18} className="text-emerald-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-800">ALUECO</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Aluminium Systems</p>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400">v1.0.0 · ERP Platform</p>
                        </div>
                    </div>
                </div>

                {/* Content panel */}
                <div className="flex-1">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">

                            {/* ── COMPANY PROFILE ───────────────────────── */}
                            {activeTab === 'company' && (
                                <div>
                                    <SectionBadge icon={Building2} label="Business Identity" accent="blue" />
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <StyledInput
                                            label="Company Name"
                                            icon={Building2}
                                            required
                                            error={errors.companyName?.message}
                                            registration={register('companyName')}
                                        />
                                        <StyledInput
                                            label="Tax ID / Registration No."
                                            icon={Hash}
                                            error={errors.taxId?.message}
                                            registration={register('taxId')}
                                        />
                                    </div>

                                    <SectionBadge icon={Globe} label="Contact Details" accent="blue" />
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <StyledInput
                                            label="Email Address"
                                            icon={Mail}
                                            type="email"
                                            placeholder="info@alueco.lk"
                                            error={errors.companyEmail?.message}
                                            registration={register('companyEmail')}
                                        />
                                        <StyledInput
                                            label="Phone Number"
                                            icon={Phone}
                                            placeholder="0777 140 680"
                                            error={errors.companyPhone?.message}
                                            registration={register('companyPhone')}
                                        />
                                        <div className="col-span-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Address</label>
                                            <div className="relative group mt-1.5">
                                                <MapPin size={15} className="absolute left-3 top-3 text-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                                                <textarea
                                                    rows={3}
                                                    placeholder="No. 123, Negoda Road, Weliweriya, Sri Lanka"
                                                    {...register('companyAddress')}
                                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 placeholder-gray-300 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── DUAL LOGOS MANAGEMENT ───────────────────── */}
                                    <SectionBadge icon={ImageIcon} label="System & Quotation Branding Logos" accent="blue" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Logo 1: System Primary Logo */}
                                        <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                                        1
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900">System Primary Logo</h3>
                                                        <p className="text-[11px] text-gray-500">Main branding logo (Sidebar, Header, Tab Favicon & Quotation Left Logo)</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">System Logo</span>
                                            </div>

                                            {/* Preview Box */}
                                            <div className="h-28 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center relative overflow-hidden group">
                                                {companyLogoValue ? (
                                                    <>
                                                        <img src={companyLogoValue} alt="System Primary Logo" className="max-h-24 max-w-full object-contain p-2" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setValue('companyLogo', '', { shouldDirty: true })}
                                                            className="absolute top-2 right-2 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition"
                                                            title="Remove Logo"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-gray-400">
                                                        <ImageIcon size={28} className="mx-auto mb-1 opacity-50" />
                                                        <p className="text-xs font-medium">No Primary Logo Set</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Upload & URL Inputs */}
                                            <div className="space-y-2">
                                                <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-emerald-500 text-xs font-semibold text-gray-700 cursor-pointer shadow-sm transition">
                                                    <Upload size={14} className="text-emerald-600" />
                                                    <span>Upload Primary Logo Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleFileUpload(e, 'companyLogo')}
                                                    />
                                                </label>
                                                <StyledInput
                                                    label="Or enter Image URL"
                                                    icon={BadgeCheck}
                                                    placeholder="https://example.com/system-logo.png"
                                                    error={errors.companyLogo?.message}
                                                    registration={register('companyLogo')}
                                                />
                                            </div>
                                        </div>

                                        {/* Logo 2: Secondary Logo */}
                                        <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                                        2
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900">Secondary / Co-Branding Logo</h3>
                                                        <p className="text-[11px] text-gray-500">Second logo printed on the top-right side of Quotation documents</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Quotation Logo</span>
                                            </div>

                                            {/* Preview Box */}
                                            <div className="h-28 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center relative overflow-hidden group">
                                                {secondaryLogoValue ? (
                                                    <>
                                                        <img src={secondaryLogoValue} alt="Secondary Logo" className="max-h-24 max-w-full object-contain p-2" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setValue('secondaryLogo', '', { shouldDirty: true })}
                                                            className="absolute top-2 right-2 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition"
                                                            title="Remove Logo"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-gray-400">
                                                        <ImageIcon size={28} className="mx-auto mb-1 opacity-50" />
                                                        <p className="text-xs font-medium">No Secondary Logo Set</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Upload & URL Inputs */}
                                            <div className="space-y-2">
                                                <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-blue-500 text-xs font-semibold text-gray-700 cursor-pointer shadow-sm transition">
                                                    <Upload size={14} className="text-blue-600" />
                                                    <span>Upload Secondary Logo Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleFileUpload(e, 'secondaryLogo')}
                                                    />
                                                </label>
                                                <StyledInput
                                                    label="Or enter Image URL"
                                                    icon={BadgeCheck}
                                                    placeholder="https://example.com/quotation-logo.png"
                                                    error={errors.secondaryLogo?.message}
                                                    registration={register('secondaryLogo')}
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* ── FINANCIAL DEFAULTS ────────────────────── */}
                            {activeTab === 'finance' && (
                                <div>
                                    <SectionBadge icon={DollarSign} label="Currency Configuration" accent="emerald" />
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <StyledInput
                                            label="System Currency"
                                            icon={Globe}
                                            placeholder="LKR"
                                            error={errors.currency?.message}
                                            registration={register('currency')}
                                        />
                                        <StyledInput
                                            label="Currency Symbol"
                                            icon={DollarSign}
                                            placeholder="Rs."
                                            error={errors.currencySymbol?.message}
                                            registration={register('currencySymbol')}
                                        />
                                        <StyledInput
                                            label="Default Tax Rate (%)"
                                            icon={Hash}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            error={errors.defaultTaxRate?.message}
                                            registration={register('defaultTaxRate')}
                                        />
                                    </div>

                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
                                        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-700">Sri Lanka Rupee (LKR)</p>
                                            <p className="text-xs text-emerald-600/70 mt-0.5">
                                                All quotations, invoices, and cost summaries will use these currency settings system-wide.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── INVENTORY SETTINGS ────────────────────── */}
                            {activeTab === 'inventory' && (
                                <div>
                                    <SectionBadge icon={Package} label="Stock Alert Configuration" accent="amber" />
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <StyledInput
                                            label="Low Stock Alert Threshold (units)"
                                            icon={AlertTriangle}
                                            type="number"
                                            placeholder="10"
                                            error={errors.lowStockThreshold?.message}
                                            registration={register('lowStockThreshold')}
                                        />
                                    </div>

                                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
                                        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">Low Stock Notifications</p>
                                            <p className="text-xs text-amber-600/70 mt-0.5">
                                                When any product's stock drops at or below this threshold, the system triggers a real-time alert and highlights it on the dashboard.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Bottom action bar */}
                        <div className="flex items-center justify-between mt-5 px-1">
                            <p className="text-xs text-gray-400">
                                Changes take effect immediately across all users.
                            </p>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md
                                    ${saved
                                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                                    }`}
                            >
                                {saved ? (
                                    <><CheckCircle2 size={16} /> Settings Saved!</>
                                ) : updateMutation.isPending ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                ) : (
                                    <><Save size={16} /> Save All Settings</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
