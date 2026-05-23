import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const QRScanTracker = () => {
  const { qrId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const trackAndRedirect = async () => {
      try {
        const response = await axios.post(`http://localhost:5000/api/qrcodes/${qrId}/scan`);
        const { restaurantId, tableName } = response.data;
        
        // Redirect to the customer menu with table tracking
        navigate(`/r/${restaurantId}/table/${encodeURIComponent(tableName)}`);
      } catch (error) {
        console.error('Error tracking QR scan:', error);
        // If there's an error (e.g. inactive table), we could redirect to a generic error page
        alert(error.response?.data?.message || 'Error processing QR Code');
      }
    };

    trackAndRedirect();
  }, [qrId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
      <h2 className="text-xl font-bold text-gray-800">Processing Table Info...</h2>
      <p className="text-gray-500 mt-2">You will be redirected to the menu shortly.</p>
    </div>
  );
};

export default QRScanTracker;
