import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import './CancelBookingModal.css';

export interface CancelBookingModalProps {
  isOpen: boolean;
  tripName: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CancelBookingModal({
  isOpen,
  tripName,
  isProcessing,
  onConfirm,
  onClose
}: CancelBookingModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cancel-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <section
        className="cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        aria-describedby="cancel-modal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="cancel-modal__close"
          type="button"
          aria-label="Close dialog"
          disabled={isProcessing}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="cancel-modal__header">
          <div className="cancel-modal__icon-wrap">
            <AlertCircle size={24} aria-hidden="true" />
          </div>
          <div className="cancel-modal__title-area">
            <h2 id="cancel-modal-title" className="cancel-modal__title">
              Cancel Booking?
            </h2>
            <p id="cancel-modal-desc" className="cancel-modal__message">
              Are you sure you want to cancel your booking for <strong>{tripName}</strong>?
            </p>
          </div>
        </div>

        <div className="cancel-modal__warning-box">
          <AlertTriangle size={17} aria-hidden="true" />
          <span>This action cannot be undone.</span>
        </div>

        <div className="cancel-modal__actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isProcessing}
            onClick={onClose}
          >
            Keep Booking
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isProcessing}
            onClick={onConfirm}
          >
            {isProcessing ? 'Cancelling…' : 'Yes, Cancel Booking'}
          </button>
        </div>
      </section>
    </div>
  );
}
