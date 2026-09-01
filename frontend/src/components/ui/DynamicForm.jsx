import React from 'react';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Textarea from './Textarea';

/**
 * DynamicForm
 * Generates a form based on a schema array.
 * 
 * @param {Array} schema - Array of field objects { name, label, type, options, placeholder, required }
 * @param {Object} formData - Current state of form data
 * @param {Function} onChange - Handler for field changes
 * @param {Function} onSubmit - Form submission handler
 * @param {Boolean} loading - Loading state
 * @param {String} submitLabel - Label for the submit button
 */
const DynamicForm = ({
    schema = [],
    formData = {},
    onChange,
    onSubmit,
    loading = false,
    submitLabel = 'Save Record',
    className = ''
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        onChange(name, type === 'number' ? Number(value) : value);
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.map((field) => {
                    const commonProps = {
                        key: field.name,
                        label: field.label,
                        name: field.name,
                        value: formData[field.name] || '',
                        onChange: handleChange,
                        required: field.required,
                        placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
                    };

                    if (field.type === 'select') {
                        return (
                            <Select
                                {...commonProps}
                                options={field.options}
                            />
                        );
                    }

                    if (field.type === 'textarea') {
                        return (
                            <Textarea
                                {...commonProps}
                                rows={field.rows || 3}
                            />
                        );
                    }

                    return (
                        <Input
                            {...commonProps}
                            type={field.type || 'text'}
                        />
                    );
                })}
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button
                    type="submit"
                    loading={loading}
                    className="w-full md:w-auto"
                >
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
};

export default DynamicForm;
