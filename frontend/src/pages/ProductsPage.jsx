import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProductFormModal from '../features/products/ProductFormModal';
import { useProducts, useCategories, useDeleteProduct } from '../features/products/useProducts';
import { useAuthStore } from '../store/authStore';
import ExportButtons from '../components/ui/ExportButtons';
import { useExport } from '../hooks/useExport';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    draft: 'warning',
    discontinued: 'danger',
};

export default function ProductsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '',
        categoryId: '',
        status: '',
        page: 1,
        limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);

    const { data, isLoading, isFetching } = useProducts(filters);
    const { data: categoriesData } = useCategories();
    const deleteProduct = useDeleteProduct();

    const products = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const exportColumns = [
        { header: 'Code', dataKey: 'productCode' },
        { header: 'Name', dataKey: 'name' },
        { header: 'SKU', dataKey: 'sku' },
        { header: 'Category', dataKey: 'categoryName' },
        { header: 'Brand', dataKey: 'brandName' },
        { header: 'Price', dataKey: 'basePrice' },
        { header: 'Status', dataKey: 'status' },
    ];

    const { handleExportExcel, handleExportCSV, handleExportPDF } = useExport({
        title: 'Product Catalog Report',
        columns: exportColumns,
        fileName: 'products_export',
        module: 'products'
    });

    // Prepare data for export (flattening nested objects)
    const exportData = products.map(p => ({
        ...p,
        categoryName: p.categoryId?.name || '—',
        brandName: p.brandId?.name || '—',
    }));

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: c.name,
    }));

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const columns = [
        {
            key: 'productCode',
            label: 'Code',
            width: '120px',
            render: (row) => <span className="font-mono text-xs">{row.productCode}</span>,
        },
        {
            key: 'name',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.sku && <p className="text-xs text-gray-500">SKU: {row.sku}</p>}
                </div>
            ),
        },
        {
            key: 'categoryId',
            label: 'Category',
            render: (row) => row.categoryId?.name || '—',
        },
        {
            key: 'brandId',
            label: 'Brand',
            render: (row) => row.brandId?.name || '—',
        },
        {
            key: 'basePrice',
            label: 'Price',
            render: (row) => {
                const displayPrice = row.basePrice || row.costs?.lastPurchaseCost || row.costs?.averageCost || 0;
                return <span className="font-medium">{formatPrice(displayPrice)}</span>;
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (row) => (
                <div className="flex gap-1">
                    {canManage && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProduct(row);
                                    setIsFormOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingProduct(row);
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        if (!deletingProduct) return;
        await deleteProduct.mutateAsync(deletingProduct._id);
        setDeletingProduct(null);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setEditingProduct(null);
    };

    return (
        <div>
            <PageHeader
                title="Products"
                description="Manage your product catalog"
                actions={
                    <div className="flex gap-2">
                        <ExportButtons
                            onExportPDF={() => handleExportPDF(exportData)}
                            onExportExcel={() => handleExportExcel(exportData)}
                            onExportCSV={() => handleExportCSV(exportData)}
                            onExportAllPDF={() => handleExportPDF(null, true, filters)}
                            onExportAllExcel={() => handleExportExcel(null, true, filters)}
                            onExportAllCSV={() => handleExportCSV(null, true, filters)}
                            isDisabled={products.length === 0}
                        />
                        {canManage && (
                            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} className="mr-1.5" />
                                Add Product
                            </Button>
                        )}
                    </div>
                }
            />

            <Card>
                {/* Filters */}
                <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, code..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            placeholder="All Categories"
                            options={categoryOptions}
                            value={filters.categoryId}
                            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-40">
                        <Select
                            placeholder="Active Only"
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'discontinued', label: 'Discontinued' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {/* Table / Empty / Loading */}
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No products found"
                        description={
                            filters.search || filters.categoryId || filters.status
                                ? 'Try adjusting your filters'
                                : 'Get started by adding your first product'
                        }
                        action={
                            canManage && !filters.search && (
                                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                    <Plus size={16} className="mr-1.5" />
                                    Add Product
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <Table columns={columns} data={products} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}

                {isFetching && !isLoading && (
                    <div className="absolute inset-0 bg-white/30 pointer-events-none" />
                )}
            </Card>

            <ProductFormModal
                isOpen={isFormOpen}
                onClose={handleClose}
                product={editingProduct}
            />

            <ConfirmDialog
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deletingProduct?.name}"? This action soft-deletes the product but can be restored by an admin.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteProduct.isPending}
            />
        </div>
    );
}