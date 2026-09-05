import { ShieldCheck, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import { ROLES } from '../features/users/roleConfig';
import { useUsers } from '../features/users/useUsers';

export default function RolesPage() {
    const { data } = useUsers({ limit: 500 });
    const users = data?.data || [];

    const countForRole = (role) => users.filter((u) => u.role === role && u.isActive).length;

    return (
        <div>
            <PageHeader
                title="Roles & Permissions"
                description="View the roles available in the system and what each can do"
            />

            <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                    <strong>How roles work:</strong> Each user is assigned one role. The role determines what actions they can perform. Roles are currently system-defined and cannot be customized through the UI — this keeps permissions predictable and secure. Contact your developer to add custom roles.
                </p>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                {ROLES.map((role) => (
                    <Card key={role.value} className="p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: role.color }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{role.label}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{role.value}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Users size={14} /> {countForRole(role.value)}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{role.description}</p>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Capabilities</p>
                            <div className="flex flex-wrap gap-1">
                                {role.permissions.map((p) => (
                                    <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 rounded">{p.replace(/_/g, ' ')}</span>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}