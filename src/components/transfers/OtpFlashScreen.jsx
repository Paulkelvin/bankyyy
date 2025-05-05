import React, { useState, useEffect } from 'react';

const OtpFlashScreen = ({ otp, onVerify, onCancel }) => {
  const [showOtp, setShowOtp] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');

  // Flash OTP for 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOtp(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput === otp) {
      onVerify(otp);
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Verify Transfer</h2>
        
        {showOtp ? (
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">Remember this number:</p>
            <div className="text-4xl font-bold text-blue-600 tracking-wider">
              {otp}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Enter the number you saw:</label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full p-2 border rounded"
                maxLength={6}
                placeholder="Enter 6-digit code"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Verify
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OtpFlashScreen; 