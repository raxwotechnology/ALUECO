import { forwardRef } from 'react';

const Textarea = forwardRef(({
    label,
    error,
    required = false,
    rows = 3,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <textarea
                ref={ref}
                rows={rows}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition resize-y ${error
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
});

Textarea.displayName = 'Textarea';
export default Textarea;