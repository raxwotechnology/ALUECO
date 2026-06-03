import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { supplierFormSchema } from './supplierSchemas';
import { useCreateSupplier, useUpdateSupplier } from './useSuppliers';

const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'address', label: 'Addresses' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'banking', label: 'Banking' },
];

export default function SupplierFormModal({ isOpen, onClose, supplier = null }) {
    const [activeTab, setActiveTab] = useState('basic');
    const isEdit = !!supplier;

    const createMutation = useCreateSupplier();
    const updateMutation = useUpdateSupplier();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: {
            type: 'company',
            category: 'raw_material',
            paymentTermsType: 'credit',
            creditDays: 30,
            creditLimit: 0,
            status: 'active',
            averageLeadTimeDays: 7,
            supplierSource: 'external_farmer',
            supplierShortCode: '',
        },
    });

    const type = watch('type');

    useEffect(() => {
        if (isOpen && supplier) {
            reset({
                type: supplier.type || 'company',
                companyName: supplier.companyName || '',
                displayName: supplier.displayName || '',
                firstName: supplier.firstName || '',
                lastName: supplier.lastName || '',
                category: supplier.category || 'raw_material',
                taxRegistrationNumber: supplier.taxRegistrationNumber || '',
                businessRegistrationNumber: supplier.businessRegistrationNumber || '',
                primaryContact: supplier.primaryContact || {},
                billingAddress: supplier.billingAddress || {},
                shippingAddress: supplier.shippingAddress || {},
                paymentTermsType: supplier.paymentTerms?.type || 'credit',
                creditDays: supplier.paymentTerms?.creditDays || 30,
                creditLimit: supplier.paymentTerms?.creditLimit || 0,
                bankName: supplier.bankDetails?.bankName || '',
                branchName: supplier.bankDetails?.branchName || '',
                accountNumber: supplier.bankDetails?.accountNumber || '',
                accountName: supplier.bankDetails?.accountName || '',
                swiftCode: supplier.bankDetails?.swiftCode || '',
                averageLeadTimeDays: supplier.averageLeadTimeDays || 7,
                status: supplier.status || 'active',
                notes: supplier.notes || '',
                supplierSource: supplier.supplierSource || 'external_farmer',
                supplierShortCode: supplier.supplierShortCode || '',
            });
        } else if (isOpen) {
            reset({
                type: 'company',
                category: 'raw_material',
                paymentTermsType: 'credit',
                creditDays: 30,
                creditLimit: 0,
                status: 'active',
                averageLeadTimeDays: 7,
                supplierSource: 'external_farmer',
                supplierShortCode: '',
            });
        }
        setActiveTab('basic');
    }, [isOpen, supplier, reset]);

    const onSubmit = async (data) => {
        const payload = {
            type: data.type,
            companyName: data.companyName || undefined,
            displayName: data.displayName,
            firstName: data.firstName || undefined,
            lastName: data.lastName || undefined,
            category: data.category,
            taxRegistrationNumber: data.taxRegistrationNumber || undefined,
            businessRegistrationNumber: data.businessRegistrationNumber || undefined,
            primaryContact: data.primaryContact,
            billingAddress: data.billingAddress,
            shippingAddress: data.shippingAddress,
            paymentTerms: {
                type: data.paymentTermsType,
                creditDays: data.creditDays || 0,
                creditLimit: data.creditLimit || 0,
            },
            bankDetails: {
                bankName: data.bankName || undefined,
                branchName: data.branchName || undefined,
                accountNumber: data.accountNumber || undefined,
                accountName: data.accountName || undefined,
                swiftCode: data.swiftCode || undefined,
            },
            averageLeadTimeDays: data.averageLeadTimeDays || 0,
            status: data.status,
            notes: data.notes || undefined,
            supplierSource: data.supplierSource,
            supplierShortCode: data.supplierShortCode,
        };

        try {
            if (isEdit) await updateMutation.mutateAsync({ id: supplier._id, data: payload });
            else await createMutation.mutateAsync(payload);
            onClose();
        } catch { }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen} onClose={onClose}
            title={isEdit ? `Edit Supplier — ${supplier?.supplierCode}` : 'New Supplier'}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 px-6">
                        {tabs.map((t) => (
                            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === t.id ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}>{t.label}</button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Type" required
                                    options={[{ value: 'company', label: 'Company' }, { value: 'individual', label: 'Individual' }]}
                                    {...register('type')} />
                                <Select label="Category" required
                                    options={[
                                        { value: 'raw_material', label: 'Raw Material' },
                                        { value: 'packaging', label: 'Packaging' },
                                        { value: 'finished_goods', label: 'Finished Goods' },
                                        { value: 'services', label: 'Services' },
                                        { value: 'equipment', label: 'Equipment' },
                                        { value: 'multiple', label: 'Multiple' },
                                    ]}
                                    {...register('category')} />
                            </div>

                            {type === 'company' ? (
                                <Input label="Company Name" error={errors.companyName?.message} {...register('companyName')} />
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="First Name" {...register('firstName')} />
                                    <Input label="Last Name" {...register('lastName')} />
                                </div>
                            )}

                            <Input label="Display Name" required placeholder="Short name for lists"
                                error={errors.displayName?.message} {...register('displayName')} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Tax Registration (VAT)" {...register('taxRegistrationNumber')} />
                                <Input label="Business Registration" {...register('businessRegistrationNumber')} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Supplier Source" required
                                    options={[
                                        { value: 'own_farm', label: 'Internal / Own Farm' },
                                        { value: 'external_farmer', label: 'External Farmer' },
                                        { value: 'import', label: 'Import' },
                                    ]}
                                    {...register('supplierSource')} />
                                <Input label="Supplier Short Code (for Batch Tracking)" placeholder="e.g. ISHAN" {...register('supplierShortCode')} />
                            </div>

                            <Select label="Status" required
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'on_hold', label: 'On Hold' },
                                    { value: 'blacklisted', label: 'Blacklisted' },
                                ]}
                                {...register('status')} />

                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Primary Contact</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Name" {...register('primaryContact.name')} />
                                    <Input label="Email" type="email" error={errors.primaryContact?.email?.message} {...register('primaryContact.email')} />
                                    <Input label="Phone" {...register('primaryContact.phone')} />
                                    <Input label="Mobile" {...register('primaryContact.mobile')} />
                                </div>
                            </div>

                            <Textarea label="Notes" rows={3} {...register('notes')} />
                        </div>
                    )}

                    {activeTab === 'address' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Billing Address</h4>
                                <div className="space-y-3">
                                    <Input label="Address Line 1" {...register('billingAddress.line1')} />
                                    <Input label="Address Line 2" {...register('billingAddress.line2')} />
                                    <div className="grid grid-cols-3 gap-4">
                                        <Input label="City" {...register('billingAddress.city')} />
                                        <Input label="Postal Code" {...register('billingAddress.postalCode')} />
                                        <Input label="Country" {...register('billingAddress.country')} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Shipping Address (if different)</h4>
                                <div className="space-y-3">
                                    <Input label="Address Line 1" {...register('shippingAddress.line1')} />
                                    <div className="grid grid-cols-3 gap-4">
                                        <Input label="City" {...register('shippingAddress.city')} />
                                        <Input label="Postal Code" {...register('shippingAddress.postalCode')} />
                                        <Input label="Country" {...register('shippingAddress.country')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'commercial' && (
                        <div className="space-y-4">
                            <Select label="Payment Terms" required
                                options={[
                                    { value: 'advance', label: 'Advance (pay before goods)' },
                                    { value: 'cod', label: 'COD (pay on delivery)' },
                                    { value: 'credit', label: 'Credit' },
                                    { value: 'consignment', label: 'Consignment' },
                                ]}
                                {...register('paymentTermsType')} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Credit Days" type="number" {...register('creditDays')} />
                                <Input label="Credit Limit (LKR)" type="number" step="0.01" {...register('creditLimit')} />
                            </div>

                            <Input label="Average Lead Time (Days)" type="number" {...register('averageLeadTimeDays')} />
                        </div>
                    )}

                    {activeTab === 'banking' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Supplier's bank details (for payments to them). Optional.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Bank Name" {...register('bankName')} />
                                <Input label="Branch Name" {...register('branchName')} />
                                <Input label="Account Name" {...register('accountName')} />
                                <Input label="Account Number" {...register('accountNumber')} />
                                <Input label="SWIFT Code" {...register('swiftCode')} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update Supplier' : 'Create Supplier'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}