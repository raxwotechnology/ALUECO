import { useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateCustomer } from './useCustomers';
import { useCustomerGroups } from './useCustomers';

/**
 * Lightweight modal to quickly create a customer with minimum required fields.
 * On success, calls onCreated(customer) so parent can auto-select.
 */
export default function QuickCreateCustomerModal({ isOpen, onClose, onCreated }) {
    const [form, setForm] = useState({
        displayName: '',
        legalName: '',
        customerGroupId: '',
        phone: '',
        email: '',
        addressLine1: '',
        city: '',
        paymentTermsType: 'cash',
        creditLimit: 0,
        creditDays: 0,
    });

    const createMutation = useCreateCustomer();
    const { data: groupsData } = useCustomerGroups({ isActive: 'true' });
    const groups = groupsData?.data || [];

    const submit = async () => {
        if (!form.displayName) { toast.error('Customer name required'); return; }
        if (!form.phone) { toast.error('Phone number is required'); return; }

        try {
            const result = await createMutation.mutateAsync({
                displayName: form.displayName,
                legalName: form.legalName || form.displayName,
                customerGroupId: form.customerGroupId || undefined,
                primaryContact: {
                    name: form.displayName,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                },
                primaryAddress: form.addressLine1 ? {
                    line1: form.addressLine1,
                    city: form.city,
                    country: 'Sri Lanka',
                } : undefined,
                paymentTerms: {
                    type: form.paymentTermsType,
                    creditDays: form.paymentTermsType === 'credit' ? +form.creditDays : 0,
                },
                creditLimit: form.paymentTermsType === 'credit' ? +form.creditLimit : 0,
                status: 'active',
            });

            // Reset and close
            setForm({
                displayName: '', legalName: '', customerGroupId: '',
                phone: '', email: '', addressLine1: '', city: '',
                paymentTermsType: 'cash', creditLimit: 0, creditDays: 0,
            });

            toast.success('Customer created — you can complete details later');
            onCreated?.(result.data);
            onClose();
        } catch { }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Create Customer" size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    Capture the basics now. You can add full address, contacts, tax info, and credit details from the Customers page later.
                </p>

                <Input label="Display Name" required placeholder="ABC Trading"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />

                <Input label="Legal Name (optional)" placeholder="Same as display name"
                    value={form.legalName}
                    onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />

                <Select label="Customer Group" placeholder="None"
                    options={groups.map((g) => ({ value: g._id, label: g.name }))}
                    value={form.customerGroupId}
                    onChange={(e) => setForm((f) => ({ ...f, customerGroupId: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Phone Number" required placeholder="+94 71 XXX XXXX"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                    <Input label="Email (optional)" type="email" placeholder="example@mail.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>

                <Input label="Address Line 1 (optional)"
                    value={form.addressLine1}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />

                <Input label="City (optional)"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />

                <Select label="Payment Terms"
                    options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'credit', label: 'Credit' },
                    ]}
                    value={form.paymentTermsType}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTermsType: e.target.value }))} />

                {form.paymentTermsType === 'credit' && (
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Credit Limit (LKR)" type="number" min="0" value={form.creditLimit}
                            onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
                        <Input label="Credit Days" type="number" min="0" value={form.creditDays}
                            onChange={(e) => setForm((f) => ({ ...f, creditDays: e.target.value }))} />
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={createMutation.isPending}>
                    Create Customer
                </Button>
            </div>
        </Modal>
    );
}