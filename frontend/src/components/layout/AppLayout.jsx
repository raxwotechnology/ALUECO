import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../hooks/useSocket';
import { useSettings } from '../../features/settings/useSettings';

export default function AppLayout() {
    const { user } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    // Dynamically update page title and favicon based on system settings
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

    // Initialize real-time notifications
    useSocket();

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">
            <Sidebar
                userRole={user?.role}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}