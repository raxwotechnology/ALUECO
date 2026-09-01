import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
    const { user } = useAuthStore();

    return (
        <div className="h-screen flex bg-gray-50">
            <Sidebar userRole={user?.role} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}