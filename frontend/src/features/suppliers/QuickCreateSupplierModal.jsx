import { useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateSupplier } from './useSuppliers';

export default function QuickCreateSupplierModal({ isOpen, onClose, onCreated }) {
    const [form, setForm] = useState({
        displayName: '', legalName: '', phone: '', email: '',
        addressLine1: '', city: '',
        paymentTermsType: 'cash', creditDays: 30,
    });

    const createMutation = useCreateSupplier();

    const submit = async () => {
        if (!form.displayName) { toast.error('Supplier name required'); return; }
        if (!form.phone && !form.email) { toast.error('Phone or email required'); return; }

        try {
            const result = await createMutation.mutateAsync({
                displayName: form.displayName,
                legalName: form.legalName || form.displayName,
                primaryContact: {
                    name: form.displayName,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                },
                primaryAddress: form.addressLine1 ? {
                    line1: form.addressLine1, city: form.city, country: 'Sri Lanka',
                } : undefined,
                paymentTerms: {
                    type: form.paymentTermsType,
                    creditDays: form.paymentTermsType === 'credit' ? +form.creditDays : 0,
                },
                status: 'active',
            });

            setForm({
                displayName: '', legalName: '', phone: '', email: '',
                addressLine1: '', city: '', paymentTermsType: 'cash', creditDays: 30,
            });

            toast.success('Supplier created — complete details later');
            onCreated?.(result.data);
            onClose();
        } catch { }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Create Supplier" size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    Capture basics now. Add bank details, full address, tax info from the Suppliers page later.
                </p>

                <Input label="Display Name" required placeholder="ABC Suppliers Pvt Ltd"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />

                <Input label="Legal Name (optional)" placeholder="Same as display"
                    value={form.legalName}
                    onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Phone" value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                    <Input label="Email" type="email" value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>

                <Input label="Address Line 1 (optional)" value={form.addressLine1}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />
                <Input label="City (optional)" value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Select label="Payment Terms"
                        options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'credit', label: 'Credit' },
                        ]}
                        value={form.paymentTermsType}
                        onChange={(e) => setForm((f) => ({ ...f, paymentTermsType: e.target.value }))} />
                    {form.paymentTermsType === 'credit' && (
                        <Input label="Credit Days" type="number" min="0" value={form.creditDays}
                            onChange={(e) => setForm((f) => ({ ...f, creditDays: e.target.value }))} />
                    )}
                </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={createMutation.isPending}>
                    Create Supplier
                </Button>
            </div>
        </Modal>
    );
}