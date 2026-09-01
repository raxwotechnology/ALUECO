import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsApi } from './productsApi';

// List products with filters
export const useProducts = (filters = {}) => {
    return useQuery({
        queryKey: ['products', filters],
        queryFn: () => productsApi.list(filters),
        keepPreviousData: true,
    });
};

// Single product
export const useProduct = (id) => {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => productsApi.getById(id),
        enabled: !!id,
    });
};

// Create product
export const useCreateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product created');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create product');
        },
    });
};

// Update product
export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => productsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product updated');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update product');
        },
    });
};

// Delete product
export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete product');
        },
    });
};

// Reference data (categories, brands, uoms)
export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: () => productsApi.listCategories({ isActive: true }),
        staleTime: 5 * 60 * 1000,
    });
};

export const useBrands = () => {
    return useQuery({
        queryKey: ['brands'],
        queryFn: () => productsApi.listBrands(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useUoms = () => {
    return useQuery({
        queryKey: ['uoms'],
        queryFn: () => productsApi.listUoms(),
        staleTime: 10 * 60 * 1000,
    });
};