import { useState } from 'react';
import { verifyCertificate } from '../services/certificateService';

export default function VerifyCertificate() {
  const [code, setCode] = useState('');
  const [certificate, setCertificate] = useState<any>(null);
  const [message, setMessage] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await verifyCertificate(code);
      if (response.data?.valid) {
        setCertificate(response.data.certificate);
        setMessage('');
      } else {
        setCertificate(null);
        setMessage('Certificate not found or invalid');
      }
    } catch (err: any) {
      setCertificate(null);
      setMessage(err.response?.data?.message || 'Certificate not found or invalid');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <span className="auth-logo">📜</span>
          <h2>Verify Certificate</h2>
          <p className="auth-subtitle">Verify the authenticity of a TrailOps trek completion certificate</p>
        </div>
        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="cert-code">Certificate Code</label>
            <input
              id="cert-code"
              placeholder="e.g. CERT-1234-ABCD"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">Verify Certificate</button>
        </form>

        {message && <p className="alert alert-error">{message}</p>}

        {certificate && (
          <div className="certificate-result card">
            <h2>Certificate Details</h2>
            <div className="detail-row">
              <span className="detail-label">Certificate Code:</span>
              <span className="detail-value">{certificate.certificateCode}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Participant:</span>
              <span className="detail-value">
                {certificate.participantId?.fullName ||
                  certificate.participantId?.name ||
                  certificate.participantId?._id ||
                  (typeof certificate.participantId === 'object'
                    ? JSON.stringify(certificate.participantId)
                    : certificate.participantId)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Trip:</span>
              <span className="detail-value">
                {certificate.tripId?.name ||
                  certificate.tripId?.title ||
                  certificate.tripId?._id ||
                  (typeof certificate.tripId === 'object'
                    ? JSON.stringify(certificate.tripId)
                    : certificate.tripId)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
