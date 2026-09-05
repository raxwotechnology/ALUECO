import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { useCreditNotes, useCreateCreditNote } from '../features/returns/useReturns';
import { useCustomers } from '../features/customers/useCustomers';
import toast from 'react-hot-toast';

export default function CreditNotesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
    const { data, isLoading } = useCreditNotes(filters);
    const notes = data?.data || [];
    
    // Customers for manual Credit Note creation
    const { data: customersRes } = useCustomers({ status: 'active', limit: 1000 });
    const customers = customersRes?.data || [];
    const customerOptions = customers.map(c => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`
    }));

    const createMutation = useCreateCreditNote();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        customerId: '',
        amount: '',
        reason: 'other',
        description: ''
    });

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId) {
            toast.error('Please select a customer');
            return;
        }
        if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setSaving(true);
        try {
            await createMutation.mutateAsync({
                customerId: formData.customerId,
                amount: Number(formData.amount),
                reason: formData.reason,
                description: formData.description
            });
            setIsModalOpen(false);
            setFormData({
                customerId: '',
                amount: '',
                reason: 'other',
                description: ''
            });
        } catch (error) {
            console.error('Failed to create credit note:', error);
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { key: 'creditNoteNumber', label: 'CN #', render: (r) => <span className="font-mono text-xs">{r.creditNoteNumber}</span> },
        { key: 'issueDate', label: 'Date', render: (r) => fmtDate(r.issueDate) },
        { key: 'customer', label: 'Customer', render: (r) => r.customerSnapshot?.name || 'Unknown' },
        { key: 'reason', label: 'Reason', render: (r) => (r.reason || 'other').replace(/_/g, ' ') },
        { key: 'amount', label: 'Amount', render: (r) => fmt(r.amount) },
        { key: 'remainingAmount', label: 'Remaining', render: (r) => fmt(r.remainingAmount) },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'fully_applied' ? 'success' : 'info'}>{(r.status || 'issued').replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/credit-notes/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button>
            )
        },
    ];

    return (
        <div>
            <PageHeader 
                title="Credit Notes" 
                description="Credit issued to customers, typically from returns" 
                actions={
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> New Credit Note
                    </Button>
                }
            />
            <Card>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : notes.length === 0 ? <EmptyState icon={FileText} title="No credit notes" description="Credit notes are issued from processed returns or manually" />
                        : <>
                            <Table columns={columns} data={notes} onRowClick={(r) => navigate(`/credit-notes/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                        </>}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Credit Note" size="md">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Customer</label>
                        <Select 
                            options={customerOptions}
                            value={formData.customerId}
                            onChange={(e) => handleSelectChange('customerId', e.target.value)}
                            placeholder="Select Customer"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input 
                                label="Amount (LKR)"
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleFormChange}
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Reason</label>
                            <Select 
                                options={[
                                    { value: 'return', label: 'Product Return' },
                                    { value: 'discount', label: 'Goodwill Discount' },
                                    { value: 'refund', label: 'Refund' },
                                    { value: 'overcharge', label: 'Billing Overcharge' },
                                    { value: 'other', label: 'Other / Custom' }
                                ]}
                                value={formData.reason}
                                onChange={(e) => handleSelectChange('reason', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Textarea 
                            label="Description / Notes"
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            placeholder="Enter additional details about this credit note..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>Create Credit Note</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}