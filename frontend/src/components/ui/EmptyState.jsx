import { Package } from 'lucide-react';

export default function EmptyState({
    icon: Icon = Package,
    title = 'No data',
    description,
    action,
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Icon size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-1 max-w-md">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}