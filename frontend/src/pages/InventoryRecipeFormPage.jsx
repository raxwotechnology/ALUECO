import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

import api from '../api/axios';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';

export default function InventoryRecipeFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [sourceProductId, setSourceProductId] = useState('');
    const [destinationProductId, setDestinationProductId] = useState('');
    const [inputQuantity, setInputQuantity] = useState(1);
    const [outputQuantity, setOutputQuantity] = useState(1);
    const [status, setStatus] = useState('active');
    const [notes, setNotes] = useState('');

    // Fetch products to populate the autocomplete selections
    const { data: productsRes } = useQuery({
        queryKey: ['products', 'all'],
        queryFn: async () => {
            const res = await api.get('/products?status=all&limit=500');
            return res.data;
        }
    });

    const products = productsRes?.data || [];

    // Filter products
    const rawMaterials = useMemo(() => {
        return products.filter(p => p.productType === 'raw_material');
    }, [products]);

    const finishedGoods = useMemo(() => {
        return products.filter(p => p.productType === 'finished_good' || p.productType === 'semi_finished' || p.canBeManufactured);
    }, [products]);

    // Fetch existing recipe details if editing
    const { data: recipeRes, isLoading: isLoadingRecipe } = useQuery({
        queryKey: ['inventoryRecipe', id],
        queryFn: async () => {
            const res = await api.get(`/inventory-recipes/${id}`);
            return res.data;
        },
        enabled: isEdit,
    });

    useEffect(() => {
        if (isEdit && recipeRes?.data) {
            const recipe = recipeRes.data;
            setName(recipe.name);
            setSourceProductId(recipe.sourceProductId?._id || recipe.sourceProductId);
            setDestinationProductId(recipe.destinationProductId?._id || recipe.destinationProductId);
            setInputQuantity(recipe.inputQuantity);
            setOutputQuantity(recipe.outputQuantity);
            setStatus(recipe.status);
            setNotes(recipe.notes || '');
        }
    }, [isEdit, recipeRes]);

    // Auto-generate name when products are selected if name is empty
    useEffect(() => {
        if (!isEdit && sourceProductId && destinationProductId) {
            const src = products.find(p => p._id === sourceProductId);
            const dest = products.find(p => p._id === destinationProductId);
            if (src && dest && !name) {
                setName(`${src.name} to ${dest.name} Formula`);
            }
        }
    }, [sourceProductId, destinationProductId, products, name, isEdit]);

    const saveMutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                return await api.put(`/inventory-recipes/${id}`, payload);
            } else {
                return await api.post('/inventory-recipes', payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventoryRecipes'] });
            toast.success(isEdit ? 'Formula updated successfully!' : 'Formula created successfully!');
            navigate('/inventory-recipes');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to save formula');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Formula name is required');
        if (!sourceProductId) return toast.error('Source raw material is required');
        if (!destinationProductId) return toast.error('Destination output product is required');
        if (Number(inputQuantity) <= 0) return toast.error('Standard input quantity must be positive');
        if (Number(outputQuantity) <= 0) return toast.error('Standard yield quantity must be positive');

        saveMutation.mutate({
            name: name.trim(),
            sourceProductId,
            destinationProductId,
            inputQuantity: Number(inputQuantity),
            outputQuantity: Number(outputQuantity),
            status,
            notes,
        });
    };

    if (isEdit && isLoadingRecipe) {
        return <div className="py-20 text-center text-gray-500 font-medium">Loading formula details...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/inventory-recipes')} className="p-2">
                    <ArrowLeft size={18} />
                </Button>
                <PageHeader 
                    title={isEdit ? 'Edit Inventory Formula' : 'New Inventory Formula'} 
                    description={isEdit ? 'Modify crop conversion yield parameters' : 'Define conversion ratio from crop to finished product'}
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-6 space-y-5">
                    <div>
                        <Input 
                            label="Formula Name *" 
                            placeholder="e.g. Raw Moringa Leaves to Moringa Powder Formula"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <ProductAutocompleteSelect 
                                label="Source Raw Material *"
                                placeholder="Select crop..."
                                products={rawMaterials}
                                value={sourceProductId}
                                onChange={(val) => setSourceProductId(val)}
                                productType="raw_material"
                                required
                            />
                        </div>

                        <div>
                            <ProductAutocompleteSelect 
                                label="Destination Output Product *"
                                placeholder="Select output product..."
                                products={finishedGoods}
                                value={destinationProductId}
                                onChange={(val) => setDestinationProductId(val)}
                                productType="finished_good"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-5">
                        <div>
                            <Input 
                                label="Standard Input Quantity (Kg) *"
                                type="number"
                                step="0.001"
                                min="0.001"
                                placeholder="e.g. 5"
                                value={inputQuantity}
                                onChange={(e) => setInputQuantity(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Input 
                                label="Standard Output Yield (Kg) *"
                                type="number"
                                step="0.001"
                                min="0.001"
                                placeholder="e.g. 1"
                                value={outputQuantity}
                                onChange={(e) => setOutputQuantity(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-5">
                        <div>
                            <Select 
                                label="Status *"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                ]}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Textarea 
                            label="Notes / Instructions"
                            placeholder="Add drying or conversion instructions here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/inventory-recipes')}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                        <Save size={16} className="mr-1.5" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Formula'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
