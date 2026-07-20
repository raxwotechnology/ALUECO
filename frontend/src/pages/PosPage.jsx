import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Save, X,
    Package, UserPlus, CreditCard,
    CheckCircle, ArrowLeft, ChevronUp, Tag,
    Zap, SlidersHorizontal, Lock, Unlock, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import CustomerAutocompleteSelect from '../components/ui/CustomerAutocompleteSelect';
import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { stockApi } from '../features/stock/stockApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCategories } from '../features/products/useProducts';
import { useCreateSalesOrder } from '../features/salesOrders/useSalesOrders';
import QuickCreateCustomerModal from '../features/customers/QuickCreateCustomerModal';
import api from '../api/axios';
import Modal from '../components/ui/Modal';

export default function PosPage() {
    const navigate = useNavigate();
    const createOrder = useCreateSalesOrder();
    const queryClient = useQueryClient();

    // Cashier Shift state
    const [activeShift, setActiveShift] = useState(null);
    const [checkingShift, setCheckingShift] = useState(true);
    const [openingFloatVal, setOpeningFloatVal] = useState('5000');
    const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
    const [closingActualCash, setClosingActualCash] = useState(0);
    const [closingActualCard, setClosingActualCard] = useState(0);
    const [closingActualOnline, setClosingActualOnline] = useState(0);
    const [closingNotesVal, setClosingNotesVal] = useState('');

    const fetchActiveShift = async () => {
        try {
            setCheckingShift(true);
            const { data } = await api.get('/pos-shifts/active');
            if (data.success && data.active) {
                setActiveShift(data.data);
                // Pre-fill actuals with expected to make it easier for user
                setClosingActualCash(data.data.paymentsExpected?.cash || 0);
                setClosingActualCard(data.data.paymentsExpected?.card || 0);
                setClosingActualOnline(data.data.paymentsExpected?.online || 0);
            } else {
                setActiveShift(null);
            }
        } catch (err) {
            console.error('Failed to load active shift:', err);
        } finally {
            setCheckingShift(false);
        }
    };

    useEffect(() => {
        fetchActiveShift();
    }, []);

    const handleOpenShift = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/pos-shifts/open', {
                openingFloat: Number(openingFloatVal),
                terminalId: 'TERM-01'
            });
            if (data.success) {
                toast.success('POS Cashier Shift Opened Successfully!');
                fetchActiveShift();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to open shift');
        }
    };

    const handleCloseShift = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/pos-shifts/close', {
                paymentsActual: {
                    cash: Number(closingActualCash),
                    card: Number(closingActualCard),
                    online: Number(closingActualOnline)
                },
                closingNotes: closingNotesVal
            });
            if (data.success) {
                toast.success('POS Cashier Shift Closed Successfully!');
                setIsCloseShiftModalOpen(false);
                setActiveShift(null);
                fetchActiveShift();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to close shift');
        }
    };

    const handleOpenCloseShiftModal = () => {
        fetchActiveShift().then(() => {
            setIsCloseShiftModalOpen(true);
        });
    };

    // Cart state
    const [customerId, setCustomerId] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [taxMode, setTaxMode] = useState('item');
    const [overrideTaxRate, setOverrideTaxRate] = useState(18);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Payment states
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [bankAccountId, setBankAccountId] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [chequeStatus, setChequeStatus] = useState('pending');

    const cartDrawerRef = useRef(null);
    const searchRef = useRef(null);

    // Data
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
        staleTime: 0,
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'pos'],
        queryFn: () => productsApi.list({ status: 'active', canBeSold: true, limit: 500 }),
        staleTime: 0,
    });
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'pos', sourceWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: sourceWarehouseId, limit: 500 }),
        enabled: !!sourceWarehouseId,
        staleTime: 0,
    });
    const { data: bankAccountsData } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        },
        staleTime: 60000,
    });
    const bankAccounts = bankAccountsData || [];

    // Set default bank account
    useEffect(() => {
        if (!bankAccountId && bankAccounts.length > 0) {
            const def = bankAccounts.find((a) => a.isActive) || bankAccounts[0];
            if (def) setBankAccountId(def._id);
        }
    }, [bankAccounts, bankAccountId]);
    const warehouses = warehousesData?.data || [];
    const customers = customersData?.data || [];
    const activeWarehouse = warehouses.find((w) => w._id === sourceWarehouseId);
    const allowNegative = activeWarehouse?.settings?.allowNegativeStock || false;

    // Only show sellable, non-raw-material products in POS
    const NON_SELLABLE_TYPES = ['raw_material', 'packaging', 'consumable', 'service'];
    const products = (productsData?.data || []).filter(
        (p) => p.canBeSold !== false && !NON_SELLABLE_TYPES.includes(p.productType)
    );
    const categories = categoriesData?.data || [];
    const stockItems = stockData?.data || [];

    // Set default warehouse
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const mainWh = warehouses.find((w) => w.name?.toLowerCase().includes('main'))
                || warehouses.find((w) => w.isDefault)
                || warehouses[0];
            if (mainWh) setSourceWarehouseId(mainWh._id);
        }
    }, [warehouses, sourceWarehouseId]);

    // Close cart drawer on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (isCartOpen && cartDrawerRef.current && !cartDrawerRef.current.contains(e.target)) {
                const fab = document.getElementById('pos-cart-fab');
                if (!fab?.contains(e.target)) setIsCartOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isCartOpen]);

    // Build stock map
    const stockMap = useMemo(() => {
        const map = new Map();
        stockItems.forEach((s) => {
            const pid = s.productId?._id || s.productId;
            const existing = map.get(pid) || { openStock: 0, reserved: 0 };
            existing.openStock += s.quantities?.openStock || 0;
            existing.reserved += s.quantities?.reserved || 0;
            map.set(pid, existing);
        });
        return map;
    }, [stockItems]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (activeCategory !== 'all') {
            result = result.filter((p) => (p.categoryId?._id || p.categoryId) === activeCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
                || p.productCode?.toLowerCase().includes(q)
                || p.barcode?.toLowerCase().includes(q)
            );
        }
        return result.slice(0, 80);
    }, [products, activeCategory, searchQuery]);

    const selectedCustomer = customers.find((c) => c._id === customerId);
    const customerOptions = customers.map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`,
    }));

    // Cart actions
    const addToCart = (product) => {
        const stock = stockMap.get(product._id);
        const available = stock ? Math.max(0, stock.openStock - stock.reserved) : 0;

        if (!allowNegative && available <= 0) {
            toast.error(`${product.name} is out of stock`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                if (!allowNegative && existing.qty >= available) {
                    toast.error(`Only ${available} available`);
                    return prev;
                }
                return prev.map((i) => i.productId === product._id
                    ? { ...i, qty: i.qty + 1 } : i);
            }

            let price = product.basePrice || product.costs?.lastPurchaseCost || product.costs?.averageCost || 0;
            if (selectedCustomer?.defaultDiscountPercent) {
                price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }

            return [...prev, {
                productId: product._id,
                name: product.name,
                code: product.productCode,
                price: +price.toFixed(2),
                qty: 1,
                available,
                taxRate: product.tax?.taxRate || 0,
                taxable: product.tax?.taxable !== false,
                unitOfMeasure: product.unitOfMeasure,
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = i.qty + delta;
            if (newQty <= 0) return null;
            if (!allowNegative && newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter(Boolean));
    };

    const setQty = (productId, qty) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = Math.max(0, +qty || 0);
            if (!allowNegative && newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter((i) => i.qty > 0));
    };

    const setPrice = (productId, price) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            return { ...i, price };
        }));
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear all items?')) setCart([]);
    };

    // Totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        cart.forEach((item) => {
            const lineSub = item.qty * (+item.price || 0);
            subtotal += lineSub;
            if (taxMode === 'override') {
                totalTax += lineSub * ((+overrideTaxRate || 0) / 100);
            } else if (item.taxable) {
                totalTax += lineSub * (item.taxRate / 100);
            }
        });
        const orderDisc = subtotal * (+orderDiscountPercent || 0) / 100;
        const grandTotal = subtotal - orderDisc + totalTax;
        return {
            subtotal: +subtotal.toFixed(2),
            orderDiscount: +orderDisc.toFixed(2),
            totalTax: +totalTax.toFixed(2),
            grandTotal: +grandTotal.toFixed(2),
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
        };
    }, [cart, orderDiscountPercent, taxMode, overrideTaxRate]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

    const handleCheckout = async (saveAsDraft = false) => {
        if (!customerId || !customerId.trim()) { toast.error('Select a customer'); return; }
        if (!sourceWarehouseId) { toast.error('Select a warehouse'); return; }
        if (cart.length === 0) { toast.error('Cart is empty'); return; }

        let activeCustomerId = customerId;
        if (!isValidObjectId(customerId)) {
            // Check if there is an exact case-insensitive match in customers list
            const exactMatch = customers.find(
                (c) => c.displayName?.toLowerCase() === customerId.trim().toLowerCase()
            );
            if (exactMatch) {
                activeCustomerId = exactMatch._id;
            } else {
                // New name, auto-create it
                try {
                    const payload = {
                        displayName: customerId.trim(),
                        legalName: customerId.trim(),
                        status: 'active',
                        paymentTerms: {
                            type: 'cod',
                            creditDays: 0,
                            creditLimit: 0,
                        },
                    };
                    const res = await api.post('/customers', payload);
                    if (res.data?.success && res.data?.data) {
                        const newCust = res.data.data;
                        toast.success(`Created customer: ${newCust.displayName}`);
                        activeCustomerId = newCust._id;
                        queryClient.invalidateQueries({ queryKey: ['customers'] });
                    } else {
                        toast.error('Failed to auto-create customer');
                        return;
                    }
                } catch (err) {
                    console.error('Customer auto-creation failed during checkout:', err);
                    toast.error(err.response?.data?.message || 'Failed to auto-create new customer');
                    return;
                }
            }
        }

        if (!saveAsDraft) {
            if (paymentMethod !== 'cash' && !bankAccountId) { toast.error('Select Bank/Cash Account'); return; }
            if (paymentMethod === 'cheque') {
                if (!chequeNumber) { toast.error('Enter Cheque Number'); return; }
                if (!chequeDate) { toast.error('Select Cheque Date'); return; }
                if (!bankName) { toast.error('Enter Bank Name'); return; }
            }
        }

        const payload = {
            customerId: activeCustomerId,
            sourceWarehouseId,
            source: 'pos',
            items: cart.map((i) => ({
                productId: i.productId,
                orderedQuantity: i.qty,
                unitPrice: +i.price || 0,
                taxRate: taxMode === 'override' ? (+overrideTaxRate || 0) : i.taxRate,
                taxable: taxMode === 'override' ? (+overrideTaxRate || 0) > 0 : i.taxable,
                discountPercent: 0,
            })),
            orderDiscount: orderDiscountPercent > 0
                ? { type: 'percentage', value: +orderDiscountPercent }
                : undefined,
            status: saveAsDraft ? 'draft' : 'approved',
            paymentMethod: saveAsDraft ? undefined : paymentMethod,
            bankAccountId: (saveAsDraft || paymentMethod === 'cash') ? undefined : bankAccountId,
            paymentReference: saveAsDraft ? undefined : (paymentMethod === 'card' || paymentMethod === 'bank_transfer') ? paymentReference : undefined,
            chequeNumber: saveAsDraft ? undefined : paymentMethod === 'cheque' ? chequeNumber : undefined,
            chequeDate: saveAsDraft ? undefined : paymentMethod === 'cheque' ? chequeDate : undefined,
            bankName: saveAsDraft ? undefined : paymentMethod === 'cheque' ? bankName : undefined,
            chequeStatus: saveAsDraft ? undefined : paymentMethod === 'cheque' ? chequeStatus : undefined,
        };

        try {
            const result = await createOrder.mutateAsync(payload);
            toast.success(saveAsDraft ? 'Order saved as draft' : 'Order created!');
            setCart([]);
            setCustomerId('');
            setOrderDiscountPercent(0);
            setTaxMode('item');
            setIsCartOpen(false);
            navigate(`/sales-orders/${result.data._id}`);
        } catch { }
    };


    const selectedWarehouse = warehouses.find((w) => w._id === sourceWarehouseId);
    const totalItems = totals.itemCount;

    if (checkingShift) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900 text-white flex-col space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-400">Loading Cashier Session...</p>
            </div>
        );
    }

    if (!activeShift) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Lock size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-extrabold text-white tracking-tight">POS Cashier Shift Locked</h2>
                        <p className="text-slate-400 text-sm">
                            An active cashier shift session is required to process showroom POS sales. Please enter your initial cash float to open the shift.
                        </p>
                    </div>

                    <form onSubmit={handleOpenShift} className="space-y-4 text-left">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Cash Float (LKR)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">Rs.</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={openingFloatVal}
                                    onChange={(e) => setOpeningFloatVal(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                                    placeholder="e.g. 5000"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl text-sm transition shadow-lg shadow-indigo-600/20"
                        >
                            Open Cashier Shift & Unlock POS
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 -m-6 overflow-hidden">

            {/* ─── TOP BAR ─── */}
            <div className="bg-white shadow-sm z-20 flex-shrink-0">
                {/* Main top bar */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                    <button
                        onClick={() => navigate('/sales-orders')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                            <CustomerAutocompleteSelect
                                placeholder="Select or type customer..."
                                customers={customers}
                                value={customerId}
                                onChange={(val) => setCustomerId(val)}
                                onCreated={(newCust) => {
                                    queryClient.invalidateQueries({ queryKey: ['customers'] });
                                }}
                            />
                        </div>
                        <button
                            onClick={() => setIsCustomerModalOpen(true)}
                            className="p-2 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors flex-shrink-0"
                            title="Quick add customer"
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleOpenCloseShiftModal}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 flex-shrink-0 font-bold text-xs"
                        title="Cashier Shift Controls"
                    >
                        <Clock size={14} /> {activeShift.shiftNumber} (Close)
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isSettingsOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
                        title="Settings"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>

                {/* Collapsible settings panel */}
                {isSettingsOpen && (
                    <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center text-sm">
                        <div className="flex items-center gap-2 min-w-[180px] flex-1">
                            <Package size={14} className="text-gray-400 flex-shrink-0" />
                            <div className="flex-1">
                                <Select
                                    placeholder="Warehouse"
                                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                                    value={sourceWarehouseId}
                                    onChange={(e) => { setSourceWarehouseId(e.target.value); setCart([]); }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Tag size={14} className="text-gray-400" />
                            <span className="text-gray-600 text-xs">Discount:</span>
                            <input
                                type="number" min="0" max="100" step="0.5"
                                value={orderDiscountPercent}
                                onChange={(e) => setOrderDiscountPercent(e.target.value)}
                                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white"
                            />
                            <span className="text-gray-500 text-xs">%</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-gray-400" />
                            <span className="text-gray-600 text-xs">Tax:</span>
                            {taxMode === 'item' ? (
                                <>
                                    <span className="text-xs text-gray-500">Per-item rates</span>
                                    <button
                                        onClick={() => setTaxMode('override')}
                                        className="text-xs text-primary-600 hover:underline"
                                    >Override</button>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="number" min="0" max="100" step="0.5"
                                        value={overrideTaxRate}
                                        onChange={(e) => setOverrideTaxRate(e.target.value)}
                                        className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                    <button
                                        onClick={() => setTaxMode('item')}
                                        className="text-xs text-gray-500 hover:text-gray-800"
                                    >Reset ↺</button>
                                </>
                            )}
                        </div>

                        {selectedCustomer && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                                <CheckCircle size={12} />
                                <span>Credit: <strong>{fmt(selectedCustomer.creditStatus?.availableCredit || 0)}</strong></span>
                                {selectedCustomer.creditStatus?.onCreditHold && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">Hold</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Search bar */}
                <div className="px-3 py-2">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search products by name, code or barcode..."
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category tabs */}
                <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === 'all'
                            ? 'bg-primary-600 text-white shadow-sm shadow-primary-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        All ({products.length})
                    </button>
                    {categories.map((c) => {
                        const count = products.filter(p => (p.categoryId?._id || p.categoryId) === c._id).length;
                        return (
                            <button
                                key={c._id}
                                onClick={() => setActiveCategory(c._id)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === c._id
                                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {c.name} {count > 0 && `(${count})`}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MAIN AREA ─── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ─── PRODUCT GRID ─── */}
                <div className="flex-1 overflow-y-auto p-3">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Package size={48} className="mb-3 text-gray-300" />
                            <p className="font-medium text-gray-500">No products found</p>
                            <p className="text-sm mt-1">Try a different search or category</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                            {filteredProducts.map((p) => {
                                const stock = stockMap.get(p._id);
                                const available = stock ? Math.max(0, stock.openStock - stock.reserved) : 0;
                                const inCart = cart.find((i) => i.productId === p._id);
                                const outOfStock = !allowNegative && available <= 0;
                                const lowStock = available > 0 && available <= 5;

                                return (
                                    <button
                                        key={p._id}
                                        onClick={() => addToCart(p)}
                                        disabled={outOfStock}
                                        className={`
                                            relative text-left bg-white rounded-2xl p-3 transition-all duration-150 active:scale-95
                                            ${outOfStock
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                                            }
                                            ${inCart
                                                ? 'ring-2 ring-primary-500 shadow-md shadow-primary-100'
                                                : 'shadow-sm'
                                            }
                                        `}
                                    >
                                        {/* Cart quantity badge */}
                                        {inCart && (
                                            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md z-10">
                                                {inCart.qty}
                                            </div>
                                        )}

                                        {/* Product image placeholder */}
                                        <div className={`aspect-square rounded-xl mb-2.5 flex items-center justify-center ${inCart ? 'bg-primary-50' : 'bg-gray-50'}`}>
                                            <Package size={28} className={inCart ? 'text-primary-400' : 'text-gray-300'} />
                                        </div>

                                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1 leading-tight">{p.name}</p>
                                        <p className="text-xs text-gray-400 font-mono mb-2">{p.productCode}</p>

                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-sm font-bold text-primary-600">
                                                {fmt(p.basePrice || p.costs?.lastPurchaseCost || p.costs?.averageCost || 0)}
                                            </p>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${outOfStock
                                                    ? 'bg-red-100 text-red-600'
                                                    : lowStock
                                                        ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-green-100 text-green-600'
                                                }`}>
                                                {outOfStock ? 'Out of Stock' : `${available} in stock`}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* Bottom padding for FAB */}
                    <div className="h-24 lg:hidden" />
                </div>

                {/* ─── DESKTOP CART (lg+) ─── */}
                <div className="hidden lg:flex w-[360px] xl:w-[400px] bg-white border-l border-gray-200 flex-col shadow-xl">
                    <CartPanel
                        cart={cart}
                        totals={totals}
                        fmt={fmt}
                        taxMode={taxMode}
                        overrideTaxRate={overrideTaxRate}
                        setTaxMode={setTaxMode}
                        setOverrideTaxRate={setOverrideTaxRate}
                        orderDiscountPercent={orderDiscountPercent}
                        setOrderDiscountPercent={setOrderDiscountPercent}
                        updateQty={updateQty}
                        setQty={setQty}
                        setPrice={setPrice}
                        removeFromCart={removeFromCart}
                        clearCart={clearCart}
                        handleCheckout={handleCheckout}
                        isPending={createOrder.isPending}
                        customerId={customerId}
                        embedded
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        bankAccountId={bankAccountId}
                        setBankAccountId={setBankAccountId}
                        paymentReference={paymentReference}
                        setPaymentReference={setPaymentReference}
                        chequeNumber={chequeNumber}
                        setChequeNumber={setChequeNumber}
                        chequeDate={chequeDate}
                        setChequeDate={setChequeDate}
                        bankName={bankName}
                        setBankName={setBankName}
                        chequeStatus={chequeStatus}
                        setChequeStatus={setChequeStatus}
                        bankAccounts={bankAccounts}
                    />
                </div>
            </div>

            {/* ─── MOBILE FLOATING CART BUTTON ─── */}
            <div className="lg:hidden fixed bottom-5 inset-x-0 flex justify-center z-30 pointer-events-none">
                <button
                    id="pos-cart-fab"
                    onClick={() => setIsCartOpen(true)}
                    disabled={cart.length === 0}
                    className={`
                        pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-200
                        ${cart.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                        }
                    `}
                >
                    <div className="relative">
                        <ShoppingCart size={22} />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary-700 text-xs font-bold rounded-full flex items-center justify-center">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <div className="text-left">
                        <div className="text-xs opacity-80 font-medium leading-none mb-0.5">
                            {totalItems === 0 ? 'Cart is empty' : `${totalItems} item${totalItems !== 1 ? 's' : ''}`}
                        </div>
                        <div className="font-bold text-base leading-none">{fmt(totals.grandTotal)}</div>
                    </div>
                    <ChevronUp size={18} className="opacity-70" />
                </button>
            </div>

            {/* ─── MOBILE CART DRAWER ─── */}
            {isCartOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsCartOpen(false)}
                    />

                    {/* Drawer */}
                    <div
                        ref={cartDrawerRef}
                        className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slideUp"
                        style={{
                            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* Drawer header */}
                        <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center">
                                    <ShoppingCart size={16} className="text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900">Your Cart</h2>
                                    {totals.itemCount > 0 && (
                                        <p className="text-xs text-gray-500">{totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <CartPanel
                            cart={cart}
                            totals={totals}
                            fmt={fmt}
                            taxMode={taxMode}
                            overrideTaxRate={overrideTaxRate}
                            setTaxMode={setTaxMode}
                            setOverrideTaxRate={setOverrideTaxRate}
                            orderDiscountPercent={orderDiscountPercent}
                            setOrderDiscountPercent={setOrderDiscountPercent}
                            updateQty={updateQty}
                            setQty={setQty}
                            setPrice={setPrice}
                            removeFromCart={removeFromCart}
                            clearCart={clearCart}
                            handleCheckout={handleCheckout}
                            isPending={createOrder.isPending}
                            customerId={customerId}
                            onCheckoutSuccess={() => setIsCartOpen(false)}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                            bankAccountId={bankAccountId}
                            setBankAccountId={setBankAccountId}
                            paymentReference={paymentReference}
                            setPaymentReference={setPaymentReference}
                            chequeNumber={chequeNumber}
                            setChequeNumber={setChequeNumber}
                            chequeDate={chequeDate}
                            setChequeDate={setChequeDate}
                            bankName={bankName}
                            setBankName={setBankName}
                            chequeStatus={chequeStatus}
                            setChequeStatus={setChequeStatus}
                            bankAccounts={bankAccounts}
                        />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <QuickCreateCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onCreated={(c) => setCustomerId(c._id)}
            />

            <Modal isOpen={isCloseShiftModalOpen} onClose={() => setIsCloseShiftModalOpen(false)} title="Close Cashier Shift">
                <form onSubmit={handleCloseShift} className="space-y-4">
                    <div className="bg-slate-50 border rounded-2xl p-4 space-y-2 text-xs">
                        <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">Session Expected Totals</span>
                        <div className="flex justify-between border-b pb-1.5">
                            <span>Opening Float:</span>
                            <span className="font-mono font-bold text-slate-700">Rs. {activeShift?.openingFloat?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                            <span>Expected Cash (incl. float):</span>
                            <span className="font-mono font-bold text-slate-700">Rs. {activeShift?.paymentsExpected?.cash?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                            <span>Expected Card:</span>
                            <span className="font-mono font-bold text-slate-700">Rs. {activeShift?.paymentsExpected?.card?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pb-0.5">
                            <span>Expected Online / Bank Transfer:</span>
                            <span className="font-mono font-bold text-slate-700">Rs. {activeShift?.paymentsExpected?.online?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Physical/Actual Counts</span>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Actual Cash (Rs.)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={closingActualCash}
                                    onChange={(e) => setClosingActualCash(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span className={`text-[10px] font-bold ${Number(closingActualCash) - (activeShift?.paymentsExpected?.cash || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    Var: Rs. {(Number(closingActualCash) - (activeShift?.paymentsExpected?.cash || 0)).toFixed(2)}
                                </span>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Actual Card (Rs.)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={closingActualCard}
                                    onChange={(e) => setClosingActualCard(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span className={`text-[10px] font-bold ${Number(closingActualCard) - (activeShift?.paymentsExpected?.card || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    Var: Rs. {(Number(closingActualCard) - (activeShift?.paymentsExpected?.card || 0)).toFixed(2)}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Actual Online (Rs.)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={closingActualOnline}
                                    onChange={(e) => setClosingActualOnline(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span className={`text-[10px] font-bold ${Number(closingActualOnline) - (activeShift?.paymentsExpected?.online || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    Var: Rs. {(Number(closingActualOnline) - (activeShift?.paymentsExpected?.online || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Closing Notes / Discrepancy Reason</label>
                        <textarea
                            rows="2"
                            placeholder="Explain any cash float variances..."
                            value={closingNotesVal}
                            onChange={(e) => setClosingNotesVal(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCloseShiftModalOpen(false)}
                            className="flex-1 py-2 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 text-xs rounded-xl shadow transition"
                        >
                            Confirm & Close Shift
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ─── REUSABLE CART PANEL (used in both desktop sidebar & mobile drawer) ───
function CartPanel({
    cart, totals, fmt, taxMode, overrideTaxRate, setTaxMode, setOverrideTaxRate,
    orderDiscountPercent, setOrderDiscountPercent,
    updateQty, setQty, setPrice, removeFromCart, clearCart, handleCheckout,
    isPending, customerId, embedded,
    paymentMethod, setPaymentMethod,
    bankAccountId, setBankAccountId,
    paymentReference, setPaymentReference,
    chequeNumber, setChequeNumber,
    chequeDate, setChequeDate,
    bankName, setBankName,
    chequeStatus, setChequeStatus,
    bankAccounts,
}) {
    return (
        <>
            {/* Cart items */}
            <div className={`flex-1 overflow-y-auto ${embedded ? 'p-4' : 'px-4 pt-2 pb-3'} space-y-2`}>
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <ShoppingCart size={40} className="mb-3 text-gray-200" />
                        <p className="font-medium text-gray-400">Cart is empty</p>
                        <p className="text-xs mt-1 text-gray-300">Tap products to add them</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</span>
                            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                                Clear all
                            </button>
                        </div>
                        {cart.map((item) => (
                            <div key={item.productId} className="bg-gray-50 rounded-2xl p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono mt-0.5">
                                            <span>{item.code}</span>
                                            <span>·</span>
                                            <span className="text-green-600 font-medium">{item.available} Avail</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    {/* Qty stepper */}
                                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => updateQty(item.productId, -1)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            min="1"
                                            max={item.available}
                                            onChange={(e) => setQty(item.productId, e.target.value)}
                                            className="w-10 text-center text-sm font-semibold bg-transparent border-0 focus:ring-0 p-0"
                                        />
                                        <button
                                            onClick={() => updateQty(item.productId, 1)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    <div className="text-right flex flex-col items-end">
                                        <p className="text-sm font-bold text-gray-800">{fmt(item.qty * (+item.price || 0))}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <input
                                                type="number"
                                                value={item.price}
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => setPrice(item.productId, e.target.value)}
                                                className="w-20 text-right text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium font-mono"
                                            />
                                            <span className="text-xs text-gray-400">each</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Order summary & checkout */}
            {cart.length > 0 && (
                <div className="border-t border-gray-100 bg-white flex-shrink-0 px-4 pt-3 pb-5 space-y-2.5">
                    {/* Summary rows */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{fmt(totals.subtotal)}</span>
                        </div>

                        {totals.orderDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount ({orderDiscountPercent}%)</span>
                                <span className="font-medium">-{fmt(totals.orderDiscount)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Tax</span>
                            <span className="font-medium">{fmt(totals.totalTax)}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="font-bold text-gray-900 text-base">Total</span>
                        <span className="text-xl font-extrabold text-primary-600">{fmt(totals.grandTotal)}</span>
                    </div>

                    {/* Payment Method & Bank Accounts UI */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</span>
                        <div className="grid grid-cols-4 gap-1">
                            {[
                                { id: 'cash', label: 'Cash' },
                                { id: 'card', label: 'Card' },
                                { id: 'bank_transfer', label: 'Bank' },
                                { id: 'cheque', label: 'Cheque' }
                            ].map((pm) => (
                                <button
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(pm.id)}
                                    className={`py-1.5 px-1 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                                        paymentMethod === pm.id
                                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {pm.label}
                                </button>
                            ))}
                        </div>

                        {/* Company Account Selector */}
                        {paymentMethod !== 'cash' && (
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Account</label>
                                <select
                                    value={bankAccountId}
                                    onChange={(e) => setBankAccountId(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                >
                                    <option value="">-- Select Account --</option>
                                    {bankAccounts.map((acc) => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.bankName} - {acc.accountNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Transaction Reference (Card / Bank Transfer) */}
                        {(paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Reference Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter reference no."
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                />
                            </div>
                        )}

                        {/* Cheque inputs */}
                        {paymentMethod === 'cheque' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Cheque Number</label>
                                    <input
                                        type="text"
                                        placeholder="No."
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Bank Name</label>
                                    <input
                                        type="text"
                                        placeholder="Bank"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Cheque Date</label>
                                    <input
                                        type="date"
                                        value={chequeDate}
                                        onChange={(e) => setChequeDate(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Cheque Status</label>
                                    <select
                                        value={chequeStatus}
                                        onChange={(e) => setChequeStatus(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-300 outline-none"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="cleared">Cleared</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            onClick={() => handleCheckout(true)}
                            disabled={!customerId || isPending}
                            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={15} />
                            Draft
                        </button>
                        <button
                            onClick={() => handleCheckout(false)}
                            disabled={!customerId || isPending}
                            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200"
                        >
                            {isPending ? (
                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                            ) : <CreditCard size={15} />}
                            Checkout
                        </button>
                    </div>

                    {!customerId && (
                        <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
                            <span>⚠</span> Select a customer to checkout
                        </p>
                    )}
                </div>
            )}
        </>
    );
}