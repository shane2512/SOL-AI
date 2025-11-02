import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface TwitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export default function TwitterModal({ isOpen, onClose, title, children, size = 'medium' }: TwitterModalProps) {
  const sizeClasses = {
    small: 'max-w-[400px]',
    medium: 'max-w-[600px]',
    large: 'max-w-[800px]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="twitter-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={`twitter-modal ${sizeClasses[size]}`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001
            }}
          >
            {/* Header */}
            <div className="twitter-modal-header">
              <button className="twitter-modal-close" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>
                </svg>
              </button>
              <h2 className="twitter-modal-title">{title}</h2>
            </div>

            {/* Body */}
            <div className="twitter-modal-body">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
