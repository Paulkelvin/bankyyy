import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaChartLine, FaMobileAlt, FaGlobe } from 'react-icons/fa';
import { MdSecurity, MdSpeed, MdSupport } from 'react-icons/md';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-screen bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative container mx-auto px-6 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Your Trusted Banking Partner
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Secure, Fast, and Reliable Banking Solutions for Everyone
            </p>
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition duration-300">
              <div className="text-blue-600 text-4xl mb-4 flex justify-center">
                <FaShieldAlt />
              </div>
              <h3 className="text-xl font-semibold mb-4">Secure Banking</h3>
              <p className="text-gray-600">
                State-of-the-art security measures to protect your assets and personal information.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition duration-300">
              <div className="text-blue-600 text-4xl mb-4 flex justify-center">
                <FaMobileAlt />
              </div>
              <h3 className="text-xl font-semibold mb-4">Mobile Banking</h3>
              <p className="text-gray-600">
                Access your accounts anytime, anywhere with our user-friendly mobile app.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition duration-300">
              <div className="text-blue-600 text-4xl mb-4 flex justify-center">
                <FaChartLine />
              </div>
              <h3 className="text-xl font-semibold mb-4">Investment Solutions</h3>
              <p className="text-gray-600">
                Expert guidance and tools to help you grow your wealth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Market Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <MdSecurity className="text-blue-600 text-2xl mr-3" />
                <h3 className="text-xl font-semibold">Security First</h3>
              </div>
              <p className="text-gray-600">
                Our platform uses advanced encryption and security protocols to ensure your data is always protected.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <MdSpeed className="text-blue-600 text-2xl mr-3" />
                <h3 className="text-xl font-semibold">Lightning Fast</h3>
              </div>
              <p className="text-gray-600">
                Experience banking at the speed of light with our optimized platform and real-time processing.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <MdSupport className="text-blue-600 text-2xl mr-3" />
                <h3 className="text-xl font-semibold">24/7 Support</h3>
              </div>
              <p className="text-gray-600">
                Our dedicated support team is always ready to help you with any questions or concerns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-4">About Us</h4>
              <p className="text-gray-400">
                We're committed to providing the best banking experience with cutting-edge technology and exceptional service.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-gray-400 hover:text-white">Login</Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white">Register</Link></li>
                <li><Link to="/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Email: support@bankyyy.com</li>
                <li>Phone: +1 (555) 123-4567</li>
                <li>Address: 123 Banking St, Finance City</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <FaGlobe className="text-2xl" />
                </a>
                {/* Add more social media icons as needed */}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Bankyyy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 