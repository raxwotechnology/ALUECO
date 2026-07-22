import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Package } from 'lucide-react';

import { authApi } from '../features/auth/authApi';
import { loginSchema } from '../features/auth/authSchemas';
import { useAuthStore } from '../store/authStore';
import { useSettings } from '../features/settings/useSettings';
import Button from '../components/ui/Button';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    // Dynamically update document title & favicon on login page
    useEffect(() => {
        if (settings?.companyName) {
            document.title = settings.companyName;
        }
        if (settings?.companyLogo) {
            let favicon = document.querySelector("link[rel*='icon']");
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(favicon);
            }
            favicon.href = settings.companyLogo;
        }
    }, [settings]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (response) => {
            const { token, ...user } = response.data;
            login(user, token);
            toast.success(`Welcome back, ${user.firstName}!`);
            navigate('/dashboard');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
        },
    });

    // Already logged in? Go to dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = (data) => {
        loginMutation.mutate(data);
    };

    const companyDisplayName = settings?.companyName || 'ALUECO Aluminium Systems';

    return (
        <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
            {/* Soft decorative blur background blobs for mobile / general elegance */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-emerald-100/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Left Side Panel - Brand Pitch & Glassmorphism */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-12 flex-col justify-between relative overflow-hidden">
                {/* Abstract Glass/Aluminium Vector Drawing Background */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                    <div className="w-[500px] h-[500px] border-[16px] border-white grid grid-cols-3 grid-rows-2 gap-4 p-4 rounded-3xl rotate-12">
                        <div className="border-4 border-white rounded-xl"></div>
                        <div className="border-4 border-white rounded-xl"></div>
                        <div className="border-4 border-white rounded-xl"></div>
                        <div className="border-4 border-white rounded-xl col-span-2"></div>
                        <div className="border-4 border-white rounded-xl"></div>
                    </div>
                </div>

                <div className="z-10">
                    <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        {settings?.companyLogo ? (
                            <img src={settings.companyLogo} className="w-6 h-6 object-contain rounded" alt="Logo" />
                        ) : (
                            <Package className="w-5 h-5 text-emerald-400" />
                        )}
                        <span className="text-sm font-bold tracking-wider uppercase">{companyDisplayName}</span>
                    </div>
                </div>

                <div className="space-y-6 z-10 max-w-lg">
                    <h1 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-indigo-100 to-emerald-200 bg-clip-text text-transparent">
                        Automated Quotation & Cost Calculation
                    </h1>
                    <p className="text-slate-300 text-base leading-relaxed">
                        Design aluminium applications, dynamically calculate profile cuts, optimize waste with project-wide 1D packing solvers, and produce instant customer estimates.
                    </p>

                    {/* Features checklist card */}
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 space-y-3.5 shadow-xl">
                        {[
                            'Dynamic BOM formulas by dimension entries',
                            '1D packing solver minimizing profile waste',
                            'Instant Customer & Internal costing PDF exports',
                            'Preservation rate snapshots & revision manager'
                        ].map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</div>
                                <span className="text-sm text-slate-200 font-medium">{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="z-10 text-xs text-slate-500 font-medium">
                    © {new Date().getFullYear()} {companyDisplayName}. All rights reserved.
                </div>
            </div>

            {/* Right Side Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 bg-gradient-to-br from-indigo-50/20 via-white to-emerald-50/15">
                <div className="w-full max-w-md space-y-8">
                    {/* Brand header for mobile */}
                    <div className="text-center lg:hidden space-y-2">
                        {settings?.companyLogo ? (
                            <img src={settings.companyLogo} className="w-14 h-14 object-contain rounded-xl mx-auto mb-2" alt="Logo" />
                        ) : (
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-2">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-slate-800">{companyDisplayName}</h2>
                        <p className="text-sm text-slate-500">Automated Quotation & Calculation</p>
                    </div>

                    <div className="p-8 backdrop-blur-xl bg-white/40 border border-white/60 shadow-[0_30px_70px_rgba(99,_102,_241,_0.08)] rounded-3xl relative overflow-hidden">
                        {/* Soft decorative blur */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl"></div>
                        
                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sign in</h2>
                            <p className="text-sm text-slate-400 mt-1">Access your quotation & database controls</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="admin@example.com"
                                    required
                                    {...register('email')}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition duration-200 ${
                                        errors.email
                                            ? 'border-red-500 focus:ring-red-200'
                                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                                    }`}
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        required
                                        {...register('password')}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition duration-200 font-mono ${
                                            errors.password
                                                ? 'border-red-500 focus:ring-red-200'
                                                : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                loading={loginMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all duration-150 mt-4 text-sm tracking-wide"
                            >
                                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>
                        
                        <p className="text-[11px] text-center text-slate-400 mt-6">
                            System credentials restricted. Contact administrator for help.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}