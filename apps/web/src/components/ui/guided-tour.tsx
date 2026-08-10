import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
}

export function GuidedTour({ isOpen, onClose, steps }: Readonly<GuidedTourProps>) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    if (currentStep) {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }
  }, [isOpen, currentStepIndex, currentStep]);

  if (!isOpen || steps.length === 0) {
    return null;
  }

  function handleNext() {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      return;
    }
    onClose();
  }

  function handlePrev() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  let isLastStep = false;
  if (currentStepIndex === steps.length - 1) {
    isLastStep = true;
  }

  let highlightStyle: React.CSSProperties = { display: 'none' };
  if (targetRect) {
    highlightStyle = {
      top: targetRect.top - 6,
      left: targetRect.left - 6,
      width: targetRect.width + 12,
      height: targetRect.height + 12,
      display: 'block',
    };
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Light Dimmed Overlay Without Heavy Blur */}
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />

      {/* Target Spotlight Highlight Box */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-[#7B6CF6] shadow-[0_0_30px_rgba(123,108,246,0.8)] pointer-events-none transition-all duration-300 z-50"
          style={highlightStyle}
        />
      )}

      {/* Floating Tour Tooltip Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101216] p-6 shadow-2xl text-slate-900 dark:text-slate-100 pointer-events-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7B6CF6]" />
                <span className="text-xs font-semibold text-[#7B6CF6] tracking-wider uppercase">
                  {t('tour.step')} {currentStepIndex + 1} {t('tour.of')} {steps.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title="Close Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {currentStep?.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentStep?.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 bg-transparent gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('tour.back')}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {t('tour.skip')}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#7B6CF6] to-[#6a5bf0] text-white gap-1"
                >
                  <span>{isLastStep ? t('tour.finish') : t('tour.next')}</span>
                  {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
