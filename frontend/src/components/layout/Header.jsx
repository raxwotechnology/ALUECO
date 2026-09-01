import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../features/auth/authApi';
import NotificationDropdown from '../ui/NotificationDropdown';

export default function Header({ onToggleSidebar }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Even if backend fails, log out locally
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const roleLabel = {
        admin: 'Administrator',
        manager: 'Manager',
        accountant: 'Accountant',
        sales_manager: 'Sales Manager',
        sales_rep: 'Sales Rep',
        warehouse_staff: 'Warehouse Staff',
        production_staff: 'Production Staff',
        staff: 'Staff',
    }[user?.role] || 'User';

    return (
        <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Hamburger toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-blue-50/20 rounded-full border border-primary-100/50 shadow-sm transition hover:shadow duration-200">
                    <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                        <Sparkles size={11} className="animate-pulse" />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[160px] sm:max-w-none font-medium">
                        Welcome, <span className="font-bold text-primary-700">{user?.fullName || user?.firstName || 'User'}</span>
                    </span>
                </div>

                {/* Mobile: compact name only */}
                <span className="sm:hidden text-sm font-semibold text-gray-700 truncate max-w-[100px]">
                    {user?.firstName || 'User'}
                </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
                <NotificationDropdown />

                <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <button onClick={() => navigate('/profile')} className="min-w-[28px] min-h-[28px] flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-primary-600" />
                        </button>
                    </div>
                    <div className="text-sm hidden md:block">
                        <p className="font-medium text-gray-900 leading-tight">
                            {user?.fullName === 'New Admin' ? 'Admin Panel' : (user?.fullName === 'Admin User' ? roleLabel : user?.fullName)}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">{roleLabel}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition min-h-[40px]"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
}