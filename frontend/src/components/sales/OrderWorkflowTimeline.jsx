import { useState } from 'react';
import { Check, ChevronRight, ShoppingCart, Calculator, CreditCard, Store, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

const steps = [
    { id: 'create', label: 'Create Order', icon: ShoppingCart },
    { id: 'calculate', label: 'Calculate Total', icon: Calculator },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'pos', label: 'POS', icon: Store },
    { id: 'complete', label: 'Complete', icon: CheckCircle },
];

export default function OrderWorkflowTimeline({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [orderData, setOrderData] = useState({
        customer: '',
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paymentType: 'full',
        paidAmount: 0,
    });

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete?.(orderData);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const isStepComplete = (stepIndex) => stepIndex < currentStep;
    const isStepActive = (stepIndex) => stepIndex === currentStep;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Success Banner - shown when complete */}
            {currentStep === steps.length && (
                <Card className="mb-6 p-6 bg-green-50 border-green-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-green-800">Order Completed Successfully!</h3>
                            <p className="text-green-600">Order {orderData.orderNumber || 'SO-XXXXX'} has been created and processed.</p>
                        </div>
                    </div>
                    <Button 
                        variant="primary" 
                        className="mt-4"
                        onClick={() => {
                            setCurrentStep(0);
                            setOrderData({
                                customer: '',
                                items: [],
                                subtotal: 0,
                                tax: 0,
                                discount: 0,
                                total: 0,
                                paymentType: 'full',
                                paidAmount: 0,
                            });
                        }}
                    >
                        Create New Order
                    </Button>
                </Card>
            )}

            {/* Timeline Header */}
            <Card className="mb-6 p-6">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isStepComplete(index)
                                            ? 'bg-green-500 text-white'
                                            : isStepActive(index)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }`}
                                >
                                    {isStepComplete(index) ? (
                                        <Check size={18} />
                                    ) : (
                                        <step.icon size={18} />
                                    )}
                                </div>
                                <span
                                    className={`text-xs mt-2 font-medium ${
                                        isStepActive(index) ? 'text-blue-600' : 'text-gray-500'
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <ChevronRight
                                    className={`w-6 h-6 mx-2 ${
                                        isStepComplete(index) ? 'text-green-500' : 'text-gray-300'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Step Content */}
            <Card className="p-6">
                {currentStep === 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Create Order</h3>
                        <div className="space-y-4">
                            <Select
                                label="Customer"
                                placeholder="Select customer..."
                                options={[
                                    { value: 'cust1', label: 'Customer A' },
                                    { value: 'cust2', label: 'Customer B' },
                                ]}
                                value={orderData.customer}
                                onChange={(e) => setOrderData({ ...orderData, customer: e.target.value })}
                            />
                            <p className="text-sm text-gray-500">Add items to the order...</p>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Calculate Total</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                                    <Input
                                        type="number"
                                        value={orderData.subtotal}
                                        onChange={(e) => setOrderData({ ...orderData, subtotal: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                                    <Input
                                        type="number"
                                        value={orderData.tax}
                                        onChange={(e) => setOrderData({ ...orderData, tax: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                                <Input
                                    type="number"
                                    value={orderData.discount}
                                    onChange={(e) => setOrderData({ ...orderData, discount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Total:</span>
                                    <span>LKR {(orderData.subtotal + orderData.tax - orderData.discount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Payment</h3>
                        <div className="space-y-4">
                            <Select
                                label="Payment Type"
                                options={[
                                    { value: 'full', label: 'FULL Payment' },
                                    { value: 'partial', label: 'Partial Payment' },
                                ]}
                                value={orderData.paymentType}
                                onChange={(e) => setOrderData({ ...orderData, paymentType: e.target.value })}
                            />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {orderData.paymentType === 'full' ? 'Amount to Pay' : 'Partial Amount'}
                                </label>
                                <Input
                                    type="number"
                                    value={orderData.paidAmount}
                                    onChange={(e) => setOrderData({ ...orderData, paidAmount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    {orderData.paymentType === 'full'
                                        ? 'Full payment will be processed'
                                        : 'Partial payment - remaining balance will be due later'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">POS</h3>
                        <div className="space-y-4">
                            <p className="text-gray-600">Process the order through Point of Sale system...</p>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Order Total:</span>
                                        <p className="font-semibold">LKR {(orderData.subtotal + orderData.tax - orderData.discount).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Paid Amount:</span>
                                        <p className="font-semibold text-green-600">LKR {orderData.paidAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                {currentStep < steps.length && (
                    <div className="flex justify-between mt-6 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 0}
                        >
                            Back
                        </Button>
                        <Button variant="primary" onClick={handleNext}>
                            {currentStep === steps.length - 1 ? 'Complete Order' : 'Next'}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
