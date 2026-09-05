import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { customerFormSchema } from './customerSchemas';
import { useCustomerGroups, useCreateCustomer, useUpdateCustomer } from './useCustomers';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../users/usersApi';

const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'contacts', label: 'Contacts' },
];

const emptyAddress = {
    label: '', line1: '', line2: '', city: '', state: '',
    country: 'Sri Lanka', postalCode: '', phone: '',
    deliveryInstructions: '', isDefault: false,
};

const emptyContact = {
    name: '', designation: '', email: '', phone: '',
    role: 'other', isPrimary: false,
};

export default function CustomerFormModal({ isOpen, onClose, customer = null }) {
    const [activeTab, setActiveTab] = useState('basic');
    const isEdit = !!customer;

    const { data: groupsData } = useCustomerGroups();
    const { data: usersData } = useQuery({
        queryKey: ['users', 'sales_reps'],
        queryFn: () => usersApi.list({ role: 'sales_rep', isActive: true }),
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();

    const {
        register, handleSubmit, reset, control, watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            customerType: 'company',
            businessType: 'retailer',
            status: 'active',
            paymentTermsType: 'cod',
            creditDays: 0,
            creditLimit: 0,
            defaultDiscountPercent: 0,
            shippingAddresses: [{ ...emptyAddress, isDefault: true }],
            contacts: [],
            billingAddress: { ...emptyAddress, isDefault: true },
        },
    });

    const customerType = watch('customerType');
    const paymentType = watch('paymentTermsType');

    const {
        fields: shippingFields,
        append: appendShipping,
        remove: removeShipping,
    } = useFieldArray({ control, name: 'shippingAddresses' });

    const {
        fields: contactFields,
        append: appendContact,
        remove: removeContact,
    } = useFieldArray({ control, name: 'contacts' });

    useEffect(() => {
        if (isOpen && customer) {
            reset({
                customerType: customer.customerType || 'company',
                businessType: customer.businessType || 'retailer',
                companyName: customer.companyName || '',
                displayName: customer.displayName || '',
                firstName: customer.firstName || '',
                lastName: customer.lastName || '',
                customerGroupId: customer.customerGroupId?._id || customer.customerGroupId || '',
                taxRegistrationNumber: customer.taxRegistrationNumber || '',
                businessRegistrationNumber: customer.businessRegistrationNumber || '',
                industry: customer.industry || '',
                primaryContact: customer.primaryContact || {},
                billingAddress: customer.billingAddress || { ...emptyAddress, isDefault: true },
                shippingAddresses: customer.shippingAddresses?.length
                    ? customer.shippingAddresses
                    : [{ ...emptyAddress, isDefault: true }],
                contacts: customer.contacts || [],
                assignedSalesRep: customer.assignedSalesRep?._id || customer.assignedSalesRep || '',
                paymentTermsType: customer.paymentTerms?.type || 'cod',
                creditDays: customer.paymentTerms?.creditDays || 0,
                creditLimit: customer.paymentTerms?.creditLimit || 0,
                defaultDiscountPercent: customer.defaultDiscountPercent || 0,
                status: customer.status || 'active',
                notes: customer.notes || '',
            });
        } else if (isOpen && !customer) {
            reset({
                customerType: 'company',
                businessType: 'retailer',
                status: 'active',
                paymentTermsType: 'cod',
                creditDays: 0,
                creditLimit: 0,
                defaultDiscountPercent: 0,
                shippingAddresses: [{ ...emptyAddress, isDefault: true }],
                contacts: [],
                billingAddress: { ...emptyAddress, isDefault: true },
            });
        }
        setActiveTab('basic');
    }, [isOpen, customer, reset]);

    const onSubmit = async (data) => {
        const payload = {
            customerType: data.customerType,
            businessType: data.businessType,
            companyName: data.companyName || undefined,
            displayName: data.displayName,
            firstName: data.firstName || undefined,
            lastName: data.lastName || undefined,
            customerGroupId: data.customerGroupId || undefined,
            taxRegistrationNumber: data.taxRegistrationNumber || undefined,
            businessRegistrationNumber: data.businessRegistrationNumber || undefined,
            industry: data.industry || undefined,
            primaryContact: data.primaryContact,
            billingAddress: data.billingAddress,
            shippingAddresses: data.shippingAddresses?.filter((a) => a.line1),
            contacts: data.contacts?.filter((c) => c.name),
            assignedSalesRep: data.assignedSalesRep || undefined,
            paymentTerms: {
                type: data.paymentTermsType,
                creditDays: data.creditDays || 0,
                creditLimit: data.creditLimit || 0,
            },
            defaultDiscountPercent: data.defaultDiscountPercent || 0,
            status: data.status,
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id: customer._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        } catch { }
    };

    const groupOptions = (groupsData?.data || []).map((g) => ({
        value: g._id,
        label: `${g.name} (${g.code})`,
    }));
    const repOptions = (usersData?.data || []).map((u) => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName}`,
    }));

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Customer — ${customer?.customerCode}` : 'New Customer'}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Customer Type" required
                                    options={[
                                        { value: 'company', label: 'Company' },
                                        { value: 'individual', label: 'Individual' },
                                    ]}
                                    error={errors.customerType?.message}
                                    {...register('customerType')}
                                />
                                <Select
                                    label="Business Type" required
                                    options={[
                                        { value: 'wholesaler', label: 'Wholesaler' },
                                        { value: 'retailer', label: 'Retailer' },
                                        { value: 'distributor', label: 'Distributor' },
                                        { value: 'reseller', label: 'Reseller' },
                                        { value: 'end_user', label: 'End User' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    error={errors.businessType?.message}
                                    {...register('businessType')}
                                />
                            </div>

                            {customerType === 'company' ? (
                                <Input label="Company Name" error={errors.companyName?.message} {...register('companyName')} />
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="First Name" {...register('firstName')} />
                                    <Input label="Last Name" {...register('lastName')} />
                                </div>
                            )}

                            <Input
                                label="Display Name" required
                                placeholder="Short name to show in lists"
                                error={errors.displayName?.message}
                                {...register('displayName')}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tax Registration Number (VAT)"
                                    error={errors.taxRegistrationNumber?.message}
                                    {...register('taxRegistrationNumber')}
                                />
                                <Input
                                    label="Business Registration Number"
                                    {...register('businessRegistrationNumber')}
                                />
                            </div>

                            <Input label="Industry" {...register('industry')} />

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Customer Group"
                                    placeholder="-- No group --"
                                    options={groupOptions}
                                    {...register('customerGroupId')}
                                />
                                <Select
                                    label="Assigned Sales Rep"
                                    placeholder="-- Unassigned --"
                                    options={repOptions}
                                    {...register('assignedSalesRep')}
                                />
                            </div>

                            <Select
                                label="Status" required
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'prospect', label: 'Prospect' },
                                    { value: 'on_hold', label: 'On Hold' },
                                    { value: 'blacklisted', label: 'Blacklisted' },
                                ]}
                                {...register('status')}
                            />

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

                    {activeTab === 'addresses' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Billing Address</h4>
                                <div className="space-y-3">
                                    <Input label="Address Line 1" {...register('billingAddress.line1')} />
                                    <Input label="Address Line 2" {...register('billingAddress.line2')} />
                                    <div className="grid grid-cols-3 gap-4">
                                        <Input label="City" {...register('billingAddress.city')} />
                                        <Input label="State/Province" {...register('billingAddress.state')} />
                                        <Input label="Postal Code" {...register('billingAddress.postalCode')} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Country" {...register('billingAddress.country')} />
                                        <Input label="Phone" {...register('billingAddress.phone')} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Shipping Addresses</h4>
                                    <Button
                                        type="button" variant="outline" size="sm"
                                        onClick={() => appendShipping(emptyAddress)}
                                    >
                                        <Plus size={14} className="mr-1" /> Add Address
                                    </Button>
                                </div>

                                {shippingFields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">
                                                Shipping Address {index + 1}
                                            </span>
                                            {shippingFields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeShipping(index)}
                                                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Label" placeholder="Main Shop, Warehouse..." {...register(`shippingAddresses.${index}.label`)} />
                                                <div className="flex items-end gap-2 pb-2">
                                                    <input type="checkbox" id={`ship-default-${index}`} {...register(`shippingAddresses.${index}.isDefault`)} />
                                                    <label htmlFor={`ship-default-${index}`} className="text-sm text-gray-700">Default shipping address</label>
                                                </div>
                                            </div>
                                            <Input label="Address Line 1" {...register(`shippingAddresses.${index}.line1`)} />
                                            <div className="grid grid-cols-3 gap-4">
                                                <Input label="City" {...register(`shippingAddresses.${index}.city`)} />
                                                <Input label="Postal Code" {...register(`shippingAddresses.${index}.postalCode`)} />
                                                <Input label="Phone" {...register(`shippingAddresses.${index}.phone`)} />
                                            </div>
                                            <Input label="Delivery Instructions" {...register(`shippingAddresses.${index}.deliveryInstructions`)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'commercial' && (
                        <div className="space-y-4">
                            <Select
                                label="Payment Terms" required
                                options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'advance', label: 'Advance (pay before delivery)' },
                                    { value: 'cod', label: 'Cash' },
                                    { value: 'credit', label: 'Credit (pay later)' },
                                ]}
                                {...register('paymentTermsType')}
                            />

                            {paymentType === 'credit' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Credit Days" type="number" {...register('creditDays')} />
                                    <Input label="Credit Limit (LKR)" type="number" step="0.01" {...register('creditLimit')} />
                                </div>
                            )}

                            <Input
                                label="Default Discount Percent (%)"
                                type="number" step="0.01"
                                error={errors.defaultDiscountPercent?.message}
                                {...register('defaultDiscountPercent')}
                            />

                            {isEdit && customer?.creditStatus && (
                                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Credit Status</h4>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Outstanding</p>
                                            <p className="font-medium">LKR {customer.creditStatus.currentBalance?.toLocaleString() || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Available</p>
                                            <p className="font-medium text-green-600">LKR {customer.creditStatus.availableCredit?.toLocaleString() || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Overdue</p>
                                            <p className={`font-medium ${customer.creditStatus.isOverdue ? 'text-red-600' : ''}`}>
                                                LKR {customer.creditStatus.overdueAmount?.toLocaleString() || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'contacts' && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700">Additional Contacts</h4>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendContact(emptyContact)}>
                                    <Plus size={14} className="mr-1" /> Add Contact
                                </Button>
                            </div>

                            {contactFields.length === 0 ? (
                                <p className="text-sm text-gray-500 py-8 text-center">
                                    No additional contacts. Click "Add Contact" to include people like accounts or logistics staff.
                                </p>
                            ) : (
                                contactFields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Contact {index + 1}</span>
                                            <button type="button" onClick={() => removeContact(index)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Name" {...register(`contacts.${index}.name`)} />
                                            <Input label="Designation" {...register(`contacts.${index}.designation`)} />
                                            <Input label="Email" type="email" error={errors.contacts?.[index]?.email?.message} {...register(`contacts.${index}.email`)} />
                                            <Input label="Phone" {...register(`contacts.${index}.phone`)} />
                                            <Select
                                                label="Role"
                                                options={[
                                                    { value: 'owner', label: 'Owner' },
                                                    { value: 'purchasing', label: 'Purchasing' },
                                                    { value: 'accounts', label: 'Accounts' },
                                                    { value: 'logistics', label: 'Logistics' },
                                                    { value: 'other', label: 'Other' },
                                                ]}
                                                {...register(`contacts.${index}.role`)}
                                            />
                                            <div className="flex items-end pb-2">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id={`contact-primary-${index}`} {...register(`contacts.${index}.isPrimary`)} />
                                                    <label htmlFor={`contact-primary-${index}`} className="text-sm text-gray-700">Primary contact</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update Customer' : 'Create Customer'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}