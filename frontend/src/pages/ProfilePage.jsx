import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { useUpdateUser } from '../features/users/useUsers';
import { getRoleConfig } from '../features/users/roleConfig';
import api from '../api/axios';

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const updateMutation = useUpdateUser();

    const profileForm = useForm({
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
        },
    });

    const passwordForm = useForm();

    const saveProfile = async (data) => {
        try {
            const result = await updateMutation.mutateAsync({
                id: user._id,
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone || undefined,
                    role: user.role,
                    isActive: true,
                },
            });
            setUser({ ...user, ...result.data });
        } catch { }
    };

    const changePassword = async (data) => {
        if (data.newPassword !== data.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (data.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        try {
            await api.post('/auth/change-password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            toast.success('Password changed successfully');
            passwordForm.reset();
            setIsChangingPassword(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        }
    };

    const roleConfig = getRoleConfig(user?.role);

    return (
        <div>
            <PageHeader title="My Profile" description="Update your personal information and security" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <User size={20} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Personal Information</h3>
                        </div>
                        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="First Name" required {...profileForm.register('firstName', { required: true })} />
                                <Input label="Last Name" required {...profileForm.register('lastName', { required: true })} />
                            </div>
                            <Input label="Email (read-only)" value={user?.email} disabled />
                            <Input label="Phone" type="tel" {...profileForm.register('phone')} />
                            <div className="pt-4 border-t">
                                <Button type="submit" variant="primary" loading={updateMutation.isPending}>
                                    <Save size={14} className="mr-1.5" /> Save Profile
                                </Button>
                            </div>
                        </form>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-gray-600" />
                                <h3 className="text-sm font-semibold">Password & Security</h3>
                            </div>
                            {!isChangingPassword && (
                                <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                                    Change Password
                                </Button>
                            )}
                        </div>

                        {isChangingPassword ? (
                            <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                                <Input label="Current Password" type="password" required
                                    {...passwordForm.register('currentPassword', { required: true })} />
                                <Input label="New Password" type="password" required
                                    placeholder="At least 6 characters"
                                    {...passwordForm.register('newPassword', { required: true, minLength: 6 })} />
                                <Input label="Confirm New Password" type="password" required
                                    {...passwordForm.register('confirmPassword', { required: true })} />
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button type="submit" variant="primary">Update Password</Button>
                                    <Button type="button" variant="outline" onClick={() => {
                                        passwordForm.reset();
                                        setIsChangingPassword(false);
                                    }}>Cancel</Button>
                                </div>
                            </form>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Your password is encrypted. Change it regularly for security.
                            </p>
                        )}
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold mb-4">Account Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="font-medium break-all">{user?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Role</p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: roleConfig.color }}>
                                    {roleConfig.label}
                                </span>
                                <p className="text-xs text-gray-600 mt-2">{roleConfig.description}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Account Status</p>
                                <Badge variant="success">Active</Badge>
                            </div>
                            {user?.lastLoginAt && (
                                <div>
                                    <p className="text-xs text-gray-500">Last Login</p>
                                    <p className="text-sm">{new Date(user.lastLoginAt).toLocaleString('en-LK')}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}