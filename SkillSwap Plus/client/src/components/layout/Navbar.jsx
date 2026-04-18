import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { User, LogOut, LayoutDashboard, ChevronDown, Menu, X, Sun, Moon } from 'lucide-react';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsProfileOpen(false);
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Programs', path: '/programs' },
        { name: 'Community', path: '/community' },
        { name: 'About Us', path: '/about' },
        { name: 'Contact Us', path: '/contact' },
    ];

    const getDashboardLink = (role) => {
        switch (role) {
            case 'admin': return '/admin/dashboard';
            case 'mentor': return '/mentor/dashboard';
            case 'professional': return '/professional/dashboard';
            default: return '/learner/dashboard';
        }
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
            <div className="container mx-auto px-6">
                <div className={`backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between shadow-xl transition-all duration-300`}>
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-xl">S+</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-slate-400">
                            SkillSwap+
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link 
                                key={link.path} 
                                to={link.path} 
                                className={`text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-indigo-600 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-white'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Profile & Theme Section */}
                    <div className="flex items-center space-x-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-amber-400 hover:scale-110 transition-all outline-none border border-slate-200 dark:border-white/10"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all outline-none"
                            >
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-white/10">
                                    {user?.profileImage ? (
                                        <img src={user.profileImage} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                {isAuthenticated && (
                                    <span className="hidden md:block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {user?.firstName}
                                    </span>
                                )}
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Profile Dropdown */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    {!isAuthenticated ? (
                                        <>
                                            <Link 
                                                to="/auth/login" 
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                Login
                                            </Link>
                                            <Link 
                                                to="/auth/register" 
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center px-4 py-3 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl mt-1 shadow-lg shadow-indigo-500/20 transition-all font-medium"
                                            >
                                                Register
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 mb-1">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Role: {user.role}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                            </div>
                                            <Link 
                                                to={getDashboardLink(user.role)} 
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center space-x-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span>Dashboard</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left flex items-center space-x-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl transition-all mt-1"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button 
                            className="md:hidden p-2 text-slate-600 dark:text-slate-300"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav Overlay */}
            {isMenuOpen && (
                <div className="md:hidden mt-2 px-6 animate-in slide-in-from-top duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col space-y-2">
                        {navLinks.map((link) => (
                            <Link 
                                key={link.path} 
                                to={link.path} 
                                onClick={() => setIsMenuOpen(false)}
                                className="px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
