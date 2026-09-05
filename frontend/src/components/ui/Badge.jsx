export default function Badge({ children, variant = 'default', size = 'md' }) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        primary: 'bg-primary-100 text-primary-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
            {children}
        </span>
    );
}