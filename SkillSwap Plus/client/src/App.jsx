import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './routes/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Programs from './pages/Programs';
import ProgramDetails from './pages/ProgramDetails';
import Community from './pages/Community';
// import PostDetails from './pages/community/PostDetails';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';

// Dashboard Components
import MentorDashboard from './pages/dashboard/MentorDashboard';
import LearnerDashboard from './pages/dashboard/LearnerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ProfessionalDashboard from './pages/dashboard/ProfessionalDashboard';

// Session Pages
import BookSession from './pages/sessions/BookSession';

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    
    // Hide footer on all dashboard routes
    const isDashboard = location.pathname.includes('/dashboard');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            <Navbar />
            <div className="flex-grow pt-24">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/programs" element={<Programs />} />
                    <Route path="/programs/:id" element={<ProgramDetails />} />
                    <Route path="/community" element={<Community />} />
                    {/* <Route path="/community/post/:id" element={<PostDetails />} /> */}
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/auth/login" element={!isAuthenticated ? <Login /> : <Navigate to="/learner/dashboard" />} />
                    <Route path="/auth/register" element={!isAuthenticated ? <Register /> : <Navigate to="/auth/login" />} />
                    
                    {/* Legacy Redirects for Login/Register */}
                    <Route path="/login" element={<Navigate to="/auth/login" />} />
                    <Route path="/register" element={<Navigate to="/auth/register" />} />

                    {/* Learner Protected Routes */}
                    <Route
                        path="/learner/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['learner']}>
                                <LearnerDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/sessions/book/:mentorId"
                        element={
                            <ProtectedRoute allowedRoles={['learner']}>
                                <BookSession />
                            </ProtectedRoute>
                        }
                    />

                    {/* Mentor Protected Routes */}
                    <Route
                        path="/mentor/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['mentor']}>
                                <MentorDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Professional Protected Routes */}
                    <Route
                        path="/professional/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['professional']}>
                                <ProfessionalDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Protected Routes */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
            {!isDashboard && <Footer />}
        </div>
    );
};

function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export default App;
