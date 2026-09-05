import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    returnsApi, creditNotesApi, damagesApi, supplierReturnsApi, repairsApi,
} from './returnsApi';

const success = (qc, keys, msg) => () => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    toast.success(msg);
};
const onError = (err) => toast.error(err.response?.data?.message || 'Failed');

// Customer Returns
export const useReturns = (filters = {}) => useQuery({ queryKey: ['returns', filters], queryFn: () => returnsApi.list(filters), keepPreviousData: true });
export const useReturn = (id) => useQuery({ queryKey: ['return', id], queryFn: () => returnsApi.getById(id), enabled: !!id });
export const useCreateReturn = () => { const qc = useQueryClient(); return useMutation({ mutationFn: returnsApi.create, onSuccess: success(qc, ['returns'], 'Return created'), onError }); };
export const useReturnActions = () => {
    const qc = useQueryClient();
    return {
        approve: useMutation({ mutationFn: returnsApi.approve, onSuccess: success(qc, ['returns', 'return'], 'Approved'), onError }),
        reject: useMutation({ mutationFn: ({ id, reason }) => returnsApi.reject(id, reason), onSuccess: success(qc, ['returns', 'return'], 'Rejected'), onError }),
        receive: useMutation({ mutationFn: ({ id, data }) => returnsApi.receive(id, data), onSuccess: success(qc, ['returns', 'return'], 'Received'), onError }),
        process: useMutation({ mutationFn: ({ id, data }) => returnsApi.process(id, data), onSuccess: success(qc, ['returns', 'return', 'stock', 'damages', 'repairs'], 'Processed'), onError }),
        issueCreditNote: useMutation({ mutationFn: returnsApi.issueCreditNote, onSuccess: success(qc, ['returns', 'return', 'creditNotes', 'customers'], 'Credit note issued'), onError }),
        complete: useMutation({ mutationFn: returnsApi.complete, onSuccess: success(qc, ['returns', 'return'], 'Completed'), onError }),
    };
};

// Credit Notes
export const useCreditNotes = (filters = {}) => useQuery({ queryKey: ['creditNotes', filters], queryFn: () => creditNotesApi.list(filters) });
export const useCreditNote = (id) => useQuery({ queryKey: ['creditNote', id], queryFn: () => creditNotesApi.getById(id), enabled: !!id });
export const useCreateCreditNote = () => { const qc = useQueryClient(); return useMutation({ mutationFn: creditNotesApi.create, onSuccess: success(qc, ['creditNotes', 'customers'], 'Credit note created'), onError }); };
export const useApplyCreditNote = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => creditNotesApi.apply(id, data), onSuccess: success(qc, ['creditNotes', 'creditNote', 'invoices', 'customers'], 'Credit applied'), onError }); };

// Damages
export const useDamages = (filters = {}) => useQuery({ queryKey: ['damages', filters], queryFn: () => damagesApi.list(filters), keepPreviousData: true });
export const useDamage = (id) => useQuery({ queryKey: ['damage', id], queryFn: () => damagesApi.getById(id), enabled: !!id });
export const useCreateDamage = () => { const qc = useQueryClient(); return useMutation({ mutationFn: damagesApi.create, onSuccess: success(qc, ['damages', 'stock', 'repairs'], 'Damage recorded'), onError }); };
export const useWriteOffDamage = () => { const qc = useQueryClient(); return useMutation({ mutationFn: damagesApi.writeOff, onSuccess: success(qc, ['damages'], 'Written off'), onError }); };
export const useDamageSummary = () => useQuery({ queryKey: ['damageSummary'], queryFn: damagesApi.summary });

// Supplier Returns
export const useSupplierReturns = (filters = {}) => useQuery({ queryKey: ['supplierReturns', filters], queryFn: () => supplierReturnsApi.list(filters) });
export const useSupplierReturn = (id) => useQuery({ queryKey: ['supplierReturn', id], queryFn: () => supplierReturnsApi.getById(id), enabled: !!id });
export const useCreateSupplierReturn = () => { const qc = useQueryClient(); return useMutation({ mutationFn: supplierReturnsApi.create, onSuccess: success(qc, ['supplierReturns'], 'Return created'), onError }); };
export const useSendSupplierReturn = () => { const qc = useQueryClient(); return useMutation({ mutationFn: supplierReturnsApi.send, onSuccess: success(qc, ['supplierReturns', 'supplierReturn', 'stock'], 'Sent'), onError }); };
export const useRecordSupplierCredit = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => supplierReturnsApi.recordCredit(id, data), onSuccess: success(qc, ['supplierReturns', 'supplierReturn'], 'Credit recorded'), onError }); };

// Repairs
export const useRepairs = (filters = {}) => useQuery({ queryKey: ['repairs', filters], queryFn: () => repairsApi.list(filters) });
export const useRepair = (id) => useQuery({ queryKey: ['repair', id], queryFn: () => repairsApi.getById(id), enabled: !!id });
export const useCreateRepair = () => { const qc = useQueryClient(); return useMutation({ mutationFn: repairsApi.create, onSuccess: success(qc, ['repairs'], 'Repair created'), onError }); };
export const useStartRepair = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => repairsApi.start(id, data), onSuccess: success(qc, ['repairs', 'repair'], 'Started'), onError }); };
export const useCompleteRepair = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }) => repairsApi.complete(id, data), onSuccess: success(qc, ['repairs', 'repair', 'stock'], 'Completed'), onError }); };