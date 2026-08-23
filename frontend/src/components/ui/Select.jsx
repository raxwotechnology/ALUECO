import { forwardRef } from 'react';

const Select = forwardRef(({
    label,
    error,
    required = false,
    options = [],
    placeholder = 'Select...',
    className = '',
    children,
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
            <select
                ref={ref}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition bg-white text-base sm:text-sm min-h-[44px] ${error
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                {...props}
            >
                {children ? children : (
                    <>
                        <option value="">{placeholder}</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </>
                )}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
});

Select.displayName = 'Select';
export default Select;