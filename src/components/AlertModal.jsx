import React from 'react';
import { createPortal } from 'react-dom';

export const AlertModal = ({ title, message, onClose, t }) => {
  if (!title && !message) return null;
  return createPortal(
    <div className={`fixed inset-0 ${t.overlay} anim-fade-in z-[9999] flex items-center justify-center p-4`}>
      <div className={`${t.surface} rounded-2xl p-6 max-w-sm w-full anim-scale-in`}>
        {title && <p className={`font-black text-lg ${t.text} mb-2`}>{title}</p>}
        {message && <p className={`text-base ${t.textSecondary} mb-5`}>{message}</p>}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold ${t.accentBg} text-white`}
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
};
