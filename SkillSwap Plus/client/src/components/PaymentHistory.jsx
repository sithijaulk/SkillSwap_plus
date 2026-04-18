import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, RefreshCw, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const PaymentHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, completed, pending, failed, refunded
    const { showToast } = useToast();

    useEffect(() => {
        fetchPaymentData();
    }, []);

    const fetchPaymentData = async () => {
        try {
            const [historyResponse, statsResponse] = await Promise.all([
                api.get('/payments/history'),
                api.get('/payments/stats')
            ]);

            setTransactions(historyResponse.data);
            setStats(statsResponse.data);
        } catch (error) {
            console.error('Error fetching payment data:', error);
            showToast('Failed to load payment history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'refunded': return <RefreshCw className="w-4 h-4 text-blue-500" />;
            default: return <Clock className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-emerald-600 dark:text-emerald-400';
            case 'pending': return 'text-amber-600 dark:text-amber-400';
            case 'failed': return 'text-red-600 dark:text-red-400';
            case 'refunded': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-slate-600 dark:text-slate-400';
        }
    };

    const getTransactionIcon = (transaction) => {
        // For learners, money goes out; for mentors, money comes in
        const isIncoming = transaction.mentor?._id === transaction.mentor?._id; // This needs to be checked against current user
        return isIncoming ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />;
    };

    const filteredTransactions = transactions.filter(transaction => {
        if (filter === 'all') return true;
        return transaction.status === filter;
    });

    const formatAmount = (amount, isNegative = false) => {
        const sign = isNegative ? '-' : '';
        return `${sign}$${amount.toFixed(2)}`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-2xl mb-6"></div>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Payment Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Completed</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.completed.count}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ${stats.completed.amount.toFixed(2)} total
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pending.count}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ${stats.pending.amount.toFixed(2)} total
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Failed</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.failed.count}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ${stats.failed.amount.toFixed(2)} total
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Refunded</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.refunded.count}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ${stats.refunded.amount.toFixed(2)} total
                        </p>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Payment History</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Your transaction records</p>
                        </div>
                    </div>

                    {/* Filter */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Transactions</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <DollarSign className="w-12 h-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Transactions</h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {filter === 'all' ? 'You haven\'t made any payments yet.' : `No ${filter} transactions found.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTransactions.map((transaction) => (
                            <div key={transaction._id} className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl">
                                            {getStatusIcon(transaction.status)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white capitalize">
                                                {transaction.skill?.title || 'Skill Session'}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {transaction.paymentMethod} • {new Date(transaction.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-800 dark:text-white">
                                            ${transaction.amountPaid.toFixed(2)}
                                        </p>
                                        <p className={`text-sm font-bold uppercase tracking-widest ${getStatusColor(transaction.status)}`}>
                                            {transaction.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-400 uppercase tracking-widest mb-1">Transaction ID</p>
                                        <p className="font-mono text-slate-600 dark:text-slate-400">{transaction._id.slice(-8)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 uppercase tracking-widest mb-1">Platform Fee</p>
                                        <p className="text-slate-600 dark:text-slate-400">${transaction.platformFee.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 uppercase tracking-widest mb-1">Mentor Earnings</p>
                                        <p className="text-slate-600 dark:text-slate-400">${transaction.mentorEarning.toFixed(2)}</p>
                                    </div>
                                </div>

                                {transaction.status === 'refunded' && transaction.refundReason && (
                                    <div className="mt-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 p-4 rounded-xl">
                                        <div className="flex items-start space-x-2">
                                            <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Refund Reason</p>
                                                <p className="text-sm text-blue-600 dark:text-blue-300">{transaction.refundReason}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentHistory;