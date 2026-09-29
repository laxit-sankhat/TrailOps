import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { isAxiosError } from 'axios';
import api from '../api/axiosInstance';
import type { BatchAssignmentSummary, CheckpointSummary } from '../types';

type AttendanceScannerProps = {
  assignments: BatchAssignmentSummary[];
  checkpoints: CheckpointSummary[];
  onBatchSelect: (batchId: string) => void;
};

export default function AttendanceScanner({ assignments, checkpoints, onBatchSelect }: AttendanceScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const checkpointIdRef = useRef('');
  const [batchId, setBatchId] = useState('');
  const [checkpointId, setCheckpointId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkpointIdRef.current = checkpointId;
  }, [checkpointId]);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    try {
      await api.post('/attendance/scan', {
        qrCodeValue: decodedText,
        checkpointId: checkpointIdRef.current
      });
      setMessage('Attendance marked successfully');
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setMessage(errorMessage || 'Something went wrong');
    }
  }, []);

  const onScanError = useCallback(() => {
    // Fires continuously while no QR is in view; this is not a scan failure.
  }, []);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scannerRef.current.render(onScanSuccess, onScanError);
    }

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [onScanError, onScanSuccess]);

  return (
    <div>
      <div className="form-group" style={{ maxWidth: '320px', marginBottom: '1rem' }}>
        <label>Batch</label>
        <select
          value={batchId}
          onChange={(e) => {
            setBatchId(e.target.value);
            setCheckpointId('');
            onBatchSelect(e.target.value);
          }}
        >
          <option value="">Select a Batch</option>
          {assignments.map((assignment) => assignment.batchId && (
            <option key={assignment._id} value={assignment.batchId._id}>{assignment.batchId.batchName}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ maxWidth: '320px', marginBottom: '1rem' }}>
        <label>Checkpoint</label>
        <select value={checkpointId} onChange={(e) => setCheckpointId(e.target.value)} disabled={!batchId} required>
          <option value="">Select a Checkpoint</option>
          {checkpoints.map((checkpoint) => (
            <option key={checkpoint._id} value={checkpoint._id}>{checkpoint.name}</option>
          ))}
        </select>
      </div>
      <div id="qr-reader" style={{ width: '100%', maxWidth: '320px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}></div>
      {message && (
        <p className={message.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
          {message}
        </p>
      )}
    </div>
  );
}