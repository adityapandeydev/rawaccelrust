import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function CustomModal({ isOpen, title, message, onClose }: CustomModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="modal-header">
              <AlertCircle size={24} color="var(--color-accent)" />
              <span>{title}</span>
            </div>
            <div className="modal-body">
              {message.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={onClose}>OK</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
