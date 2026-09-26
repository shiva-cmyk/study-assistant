import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'Please confirm this action to continue.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="420px">
      <div className="confirm-dialog-body">
        <div className={`confirm-icon-wrapper ${isDanger ? 'danger' : 'primary'}`}>
          {isDanger ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
        </div>
        <div className="confirm-text">
          <h4 className="confirm-title">{title}</h4>
          <p className="confirm-desc">{message}</p>
        </div>
      </div>

      <div className="confirm-dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          <span>{cancelText}</span>
        </button>
        <button
          type="button"
          className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  );
}
