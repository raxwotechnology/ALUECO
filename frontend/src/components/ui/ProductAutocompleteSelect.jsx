import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ProductAutocompleteSelect({
    label,
    placeholder,
    products = [],
    value,
    onChange,
    productType = 'raw_material', // 'raw_material' or 'finished_good'
    required = false,
    disabled = false
}) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const wrapperRef = useRef(null);

    // Fetch categories on mount to determine RAW category for auto-saving raw materials
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories');
                if (res.data?.success) {
                    setCategories(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to load categories for autocomplete select:', err);
            }
        };
        fetchCategories();
    }, []);

    // Sync input value with external value change
    useEffect(() => {
        const found = products.find(p => p._id === value);
        if (found) {
            setInputValue(found.name);
        } else if (!value) {
            setInputValue('');
        }
    }, [value, products]);

    // Handle clicks outside of dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
        p.productCode?.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleSelectOption = (product) => {
        setInputValue(product.name);
        onChange(product._id, product);
        setIsOpen(false);
    };

    // Auto-create product if it doesn't exist
    const handleAutoCreate = async (nameToCreate) => {
        if (!nameToCreate.trim()) return;
        try {
            // Fetch categories if not already loaded
            let cats = categories;
            if (cats.length === 0) {
                const catRes = await api.get('/categories');
                if (catRes.data?.success) {
                    cats = catRes.data.data || [];
                    setCategories(cats);
                }
            }

            // Find matching category
            let matchedCat = null;
            if (productType === 'raw_material') {
                matchedCat = cats.find(c => c.code === 'RAW' || c.name === 'Raw Material') ||
                             cats.find(c => c.name.toLowerCase().includes('raw')) ||
                             cats[0];
            } else {
                matchedCat = cats.find(c => c.code === 'FIN' || c.name === 'Finished Goods' || c.name === 'Finished Good') ||
                             cats.find(c => c.name.toLowerCase().includes('finish') || c.name.toLowerCase().includes('good')) ||
                             cats[0];
            }

            if (!matchedCat) {
                toast.error('Cannot create product: No category found in the system. Please create a category first.');
                return;
            }

            const payload = {
                name: nameToCreate.trim(),
                productType: productType,
                status: 'active',
                categoryId: matchedCat._id,
                unitOfMeasure: 'Kg',
                basePrice: 0,
                canBeSold: productType === 'raw_material' ? false : true,
                canBePurchased: true,
            };

            const res = await api.post('/products', payload);
            if (res.data?.success && res.data?.data) {
                const newProd = res.data.data;
                toast.success(`Created product: ${newProd.name}`);
                setInputValue(newProd.name);
                onChange(newProd._id, newProd);
            }
        } catch (err) {
            console.error('Auto-creation failed:', err.response?.data || err);
            toast.error(err.response?.data?.message || 'Failed to create new product');
        }
    };

    const handleBlur = () => {
        // Delay to allow item click
        setTimeout(() => {
            if (!inputValue.trim()) {
                onChange('');
                return;
            }
            // Check if exactly matches an option
            const exactMatch = products.find(p => p.name.toLowerCase() === inputValue.trim().toLowerCase());
            if (exactMatch) {
                setInputValue(exactMatch.name);
                onChange(exactMatch._id, exactMatch);
            } else {
                // If it is a new name, create it
                handleAutoCreate(inputValue);
            }
        }, 250);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder || "Search or type to add..."}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary-500 focus:ring-primary-200 rounded-lg text-sm focus:outline-none bg-white font-medium transition"
                />
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(p => (
                        <button
                            key={p._id}
                            type="button"
                            onMouseDown={() => handleSelectOption(p)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition flex items-center justify-between"
                        >
                            <span className="font-medium text-gray-900">{p.name}</span>
                            <span className="text-gray-400 text-xs font-mono">({p.productCode})</span>
                        </button>
                    ))}
                    {inputValue.trim() && !products.some(p => p.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                        <button
                            type="button"
                            onMouseDown={() => handleAutoCreate(inputValue)}
                            className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 font-semibold border-t border-gray-100 flex items-center gap-1.5"
                        >
                            <span>+ Create new: "{inputValue.trim()}"</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
