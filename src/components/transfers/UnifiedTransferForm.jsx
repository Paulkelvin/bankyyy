import OtpFlashScreen from './OtpFlashScreen';

const UnifiedTransferForm = ({ accounts, onTransferSuccess }) => {
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [currentOtp, setCurrentOtp] = useState(null);
  const [transferData, setTransferData] = useState(null);

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    console.log('>>> handleInitiateTransfer: Form submitted');

    if (!validateForm()) {
      return;
    }

    const formData = {
      transferType,
      fromAccountId: selectedFromAccount,
      amount: amount,
      description,
      ...(transferType === 'internal' ? { toAccountId: selectedToAccount } : { recipientAccountNumber })
    };

    console.log('>>> handleInitiateTransfer: Calling api.initiateTransfer with:', formData);

    try {
      const response = await api.initiateTransfer(formData);
      console.log('>>> handleInitiateTransfer: API Response:', response);
      
      if (response.success) {
        setCurrentOtp(response.otp);
        setTransferData(formData);
        setShowOtpScreen(true);
      }
    } catch (error) {
      console.error('>>> handleInitiateTransfer: Error:', error);
      setError(error.message || 'Failed to initiate transfer');
    }
  };

  const handleVerifyOtp = async (otp) => {
    try {
      const response = await api.executeTransfer({
        ...transferData,
        otp
      });
      
      if (response.success) {
        setShowOtpScreen(false);
        setCurrentOtp(null);
        setTransferData(null);
        resetForm();
        onTransferSuccess();
      }
    } catch (error) {
      console.error('>>> handleVerifyOtp: Error:', error);
      setError(error.message || 'Failed to verify OTP');
    }
  };

  const handleCancelOtp = () => {
    setShowOtpScreen(false);
    setCurrentOtp(null);
    setTransferData(null);
  };

  return (
    <>
      <form onSubmit={handleInitiateTransfer}>
        {/* ... existing form fields ... */}
      </form>

      {showOtpScreen && (
        <OtpFlashScreen
          otp={currentOtp}
          onVerify={handleVerifyOtp}
          onCancel={handleCancelOtp}
        />
      )}
    </>
  );
};

export default UnifiedTransferForm; 