'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
  onPlay?: () => void
}

export function HowToPlayModal({ isOpen, onClose, children, title, onPlay }: HowToPlayModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-card border-2 border-primary/30 rounded-2xl p-8 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-6 gradient-text pr-10">
                {title}
              </h2>

              {/* Content */}
              <div className="space-y-4">
                {children}
              </div>

              {/* Play button */}
              {onPlay && (
                <div className="mt-8 pt-6 border-t border-border">
                  <button
                    onClick={onClose}
                    className="w-full px-8 py-4 bg-primary hover:bg-primary/90 text-white uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] border-2 border-primary hover:border-primary/70"
                  >
                    Play Now
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
