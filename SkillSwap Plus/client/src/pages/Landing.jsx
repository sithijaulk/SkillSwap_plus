import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const dashboardUrl = user?.role === 'learner' ? '/learner/dashboard' : 
                        user?.role === 'mentor' ? '/mentor/dashboard' : 
                        '/admin/dashboard';
    return <Navigate to={dashboardUrl} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Share Skills. Learn Together. Grow Better.
        </h1>
        <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
          SkillSwap+ connects university students to exchange skills, book mentoring sessions, and build a supportive learning community—all on campus.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/auth/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
          <Link
            to="/auth/login"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-3">For Learners</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Browse verified mentors</li>
                <li>✓ Book sessions at your schedule</li>
                <li>✓ Learn new skills or exchange</li>
                <li>✓ Track your progress</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="text-4xl mb-4">👨‍🏫</div>
              <h3 className="text-xl font-semibold mb-3">For Mentors</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Set your availability</li>
                <li>✓ Accept qualified learners</li>
                <li>✓ Track session performance</li>
                <li>✓ Build your reputation</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-3">Community</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Ask academic questions</li>
                <li>✓ Share knowledge</li>
                <li>✓ Get peer support</li>
                <li>✓ Earn recognition</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold">Growing</div>
            <p className="text-blue-100">Active Community</p>
          </div>
          <div>
            <div className="text-4xl font-bold">Verified</div>
            <p className="text-blue-100">Scholarly Sessions</p>
          </div>
          <div>
            <div className="text-4xl font-bold">Diverse</div>
            <p className="text-blue-100">Academic Skills</p>
          </div>
          <div>
            <div className="text-4xl font-bold">Elite</div>
            <p className="text-blue-100">Quality Assured</p>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-white py-12 text-center">
        <h3 className="text-2xl font-bold mb-4">Ready to start learning?</h3>
        <Link
          to="/auth/register"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Join Now - It's Free!
        </Link>
      </div>
    </div>
  );
};

export default Landing;
