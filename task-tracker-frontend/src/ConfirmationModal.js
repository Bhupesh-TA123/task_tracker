import React from 'react';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-md m-4 transform animate-slide-in-up">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
          <p className="text-gray-300 mb-6">{children}</p>
        </div>
        <div className="flex justify-end space-x-4 bg-gray-900/50 p-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-lg font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2.5 px-6 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;