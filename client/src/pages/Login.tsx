import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight, Sparkles, BarChart3, TrendingUp, Users } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);
        if (result.ok) {
            navigate('/dashboard');
        } else {
            setError(result.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Half - Branding Section */}
            <div className="lg:w-1/2 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-accent-blue/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-green/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Logo */}
                    <div className="mb-12 animate-slide-down">
                        <div className="inline-block mb-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-3xl flex items-center justify-center shadow-modern-xl rotate-12 hover:rotate-0 transition-all duration-500 hover:scale-110">
                                <Sparkles className="w-12 h-12 text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent mb-4 leading-tight">
                            STUDIO 1947
                        </h1>
                        <p className="text-xl text-primary-200 font-semibold mb-2">Analytics Dashboard</p>
                        <p className="text-sm text-primary-400 italic max-w-md">
                            "Local Wisdom for Global Impact"
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-6 max-w-md animate-fade-in">
                        <div className="flex items-start gap-4 group">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <BarChart3 className="w-6 h-6 text-accent-blue" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Real-Time Analytics</h3>
                                <p className="text-primary-300 text-sm">Track your social media performance with comprehensive insights</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 group">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <TrendingUp className="w-6 h-6 text-accent-purple" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Growth Tracking</h3>
                                <p className="text-primary-300 text-sm">Monitor engagement, reach, and follower growth over time</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 group">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <Users className="w-6 h-6 text-accent-green" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Community Insights</h3>
                                <p className="text-primary-300 text-sm">Understand your audience and optimize your content strategy</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-primary-400 text-sm relative z-10 animate-fade-in">
                    © 2025 Studio 1947. All rights reserved.
                </p>
            </div>

            {/* Right Half - Login Form */}
            <div className="lg:w-1/2 bg-gradient-to-br from-primary-50 via-white to-primary-50 p-8 lg:p-16 flex items-center justify-center">
                <div className="w-full max-w-md animate-scale-in">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-primary-900 mb-2">Welcome Back</h2>
                        <p className="text-primary-600">Sign in to access your analytics dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="relative group">
                            <label className="block text-sm font-semibold text-primary-900 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 group-focus-within:text-accent-blue transition-colors" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    className="w-full bg-white border-2 border-primary-200 rounded-xl pl-12 pr-4 py-3.5 text-primary-900 placeholder:text-primary-400 focus:outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="relative group">
                            <label className="block text-sm font-semibold text-primary-900 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 group-focus-within:text-accent-purple transition-colors" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full bg-white border-2 border-primary-200 rounded-xl pl-12 pr-4 py-3.5 text-primary-900 placeholder:text-primary-400 focus:outline-none focus:border-accent-purple focus:ring-4 focus:ring-accent-purple/10 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-accent-red/10 border-2 border-accent-red/50 rounded-xl p-4 animate-slide-up">
                                <p className="text-accent-red text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold py-4 rounded-xl shadow-modern-lg hover:shadow-modern-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In to Dashboard</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-primary-500 text-center leading-relaxed">
                        Don't have an account? Ask a Social Flow admin to add you.
                    </p>
                </div>
            </div>
        </div>
    );
};
