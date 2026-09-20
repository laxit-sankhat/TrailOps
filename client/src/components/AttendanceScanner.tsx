import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/axiosInstance';

export default function AttendanceScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [checkpointId, setCheckpointId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scannerRef.current.render(onScanSuccess, onScanError);
    }

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    try {
      const response = await api.post('/attendance/scan', {
        qrCodeValue: decodedText,
        checkpointId
      });
      setMessage('Attendance marked successfully');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const onScanError = () => {
    // fires continuously while no QR is in view - intentionally ignored, not a real error
  };

  return (
    <div>
      <input placeholder="Checkpoint ID" value={checkpointId} onChange={(e) => setCheckpointId(e.target.value)} />
      <div id="qr-reader" style={{ width: '300px' }}></div>
      {message && <p>{message}</p>}
    </div>
  );
}