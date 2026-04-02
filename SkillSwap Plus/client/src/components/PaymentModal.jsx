import React, { useState, useEffect } from 'react';
import { CreditCard, X, Shield, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const PaymentModal = ({ isOpen, onClose, session, onPaymentSuccess }) => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState('method'); // method, processing, success, failed
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: ''
    });
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchPaymentMethods();
        }
    }, [isOpen]);

    const fetchPaymentMethods = async () => {
        try {
            const response = await api.get('/payments/methods');
            setPaymentMethods(response.data);
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

    const handleInitiatePayment = async () => {
        if (!session) return;

        setLoading(true);
        setStep('processing');

        try {
            const response = await api.post('/payments/initiate', {
                sessionId: session._id,
                paymentMethod: selectedMethod
            });

            const { paymentIntent, transaction } = response.data;

            // Simulate payment processing
            setTimeout(async () => {
                try {
                    const confirmResponse = await api.post('/payments/confirm', {
                        paymentIntentId: paymentIntent.id,
                        transactionId: transaction._id
                    });

                    if (confirmResponse.data.success) {
                        setStep('success');
                        showToast('Payment processed successfully!', 'success');
                        setTimeout(() => {
                            onPaymentSuccess && onPaymentSuccess(confirmResponse.data.data);
                            onClose();
                        }, 2000);
                    } else {
                        setStep('failed');
                        showToast('Payment failed. Please try again.', 'error');
                    }
                } catch (error) {
                    setStep('failed');
                    showToast('Payment confirmation failed.', 'error');
                }
            }, 3000); // Simulate 3 second processing time

        } catch (error) {
            console.error('Error initiating payment:', error);
            setStep('method');
            showToast('Failed to initiate payment', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getMethodIcon = (methodId) => {
        switch (methodId) {
            case 'card': return <CreditCard className="w-5 h-5" />;
            case 'paypal': return <span className="text-blue-600 font-bold text-sm">PayPal</span>;
            case 'bank': return <span className="text-green-600 font-bold text-sm">Bank</span>;
            case 'wallet': return <span className="text-purple-600 font-bold text-sm">Wallet</span>;
            default: return <CreditCard className="w-5 h-5" />;
        }
    };

    const renderPaymentMethod = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                    Complete Payment
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                    Pay for your mentoring session
                </p>
            </div>

            {/* Session Summary */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Session with {session?.mentor?.firstName} {session?.mentor?.lastName}
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">
                        ${session?.amount}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                    <span>Platform Fee (25%)</span>
                    <span>${(session?.amount * 0.25).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-white/10 mt-2 pt-2 flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>${(session?.amount * 1.25).toFixed(2)}</span>
                </div>
            </div>

            {/* Payment Methods */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Select Payment Method
                </h4>
                <div className="space-y-2">
                    {paymentMethods.map((method) => (
                        <label
                            key={method.id}
                            className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                                selectedMethod === method.id
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <input
                                type="radio"
                                name="paymentMethod"
                                value={method.id}
                                checked={selectedMethod === method.id}
                                onChange={(e) => setSelectedMethod(e.target.value)}
                                className="mr-3"
                            />
                            <div className="flex items-center space-x-3">
                                {getMethodIcon(method.id)}
                                <span className="font-medium text-slate-800 dark:text-white">
                                    {method.name}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Mock Card Form for Card Payment */}
            {selectedMethod === 'card' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl">
                        <div className="flex items-start space-x-2">
                            <Shield className="w-4 h-4 text-amber-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                    Mock Payment
                                </p>
                                <p className="text-sm text-amber-600 dark:text-amber-300">
                                    This is a demo payment system. Use any card details - payments will be simulated.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Card Number
                            </label>
                            <input
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                value={cardDetails.number}
                                onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Expiry Date
                            </label>
                            <input
                                type="text"
                                placeholder="MM/YY"
                                value={cardDetails.expiry}
                                onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                CVC
                            </label>
                            <input
                                type="text"
                                placeholder="123"
                                value={cardDetails.cvc}
                                onChange={(e) => setCardDetails({...cardDetails, cvc: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Cardholder Name
                            </label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={cardDetails.name}
                                onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderProcessing = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto">
                <Loader className="w-8 h-8 animate-spin" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                    Processing Payment
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                    Please wait while we process your payment...
                </p>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Amount
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">
                        ${(session?.amount * 1.25).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                    Payment Successful!
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                    Your session has been booked and payment processed.
                </p>
            </div>
        </div>
    );

    const renderFailed = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                    Payment Failed
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                    We couldn't process your payment. Please try again.
                </p>
                <button
                    onClick={() => setStep('method')}
                    className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all"
                >
                    Try Again
                </button>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                Payment
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Secure payment processing
                            </p>
                        </div>
                    </div>
                    {step === 'method' && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {step === 'method' && renderPaymentMethod()}
                    {step === 'processing' && renderProcessing()}
                    {step === 'success' && renderSuccess()}
                    {step === 'failed' && renderFailed()}
                </div>

                {step === 'method' && (
                    <div className="flex items-center justify-end space-x-3 p-8 border-t border-slate-200 dark:border-white/10">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleInitiatePayment}
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all flex items-center space-x-2 disabled:opacity-50"
                        >
                            {loading && <Loader className="w-4 h-4 animate-spin" />}
                            <span>Pay ${(session?.amount * 1.25).toFixed(2)}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;