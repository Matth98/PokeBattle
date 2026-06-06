import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronRight } from 'lucide-react';

export default function ProductTour({ steps, onDone, onSkip, isDark }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const step = steps[currentStep];
  const PAD = 10;

  const findTarget = useCallback(() => {
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Wait for scroll to settle
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setVisible(true);
      }, 350);
    } else {
      timerRef.current = setTimeout(findTarget, 150);
    }
  }, [step.selector]);

  useEffect(() => {
    setVisible(false);
    setTargetRect(null);
    clearTimeout(timerRef.current);
    if (step.beforeShow) {
      step.beforeShow();
      timerRef.current = setTimeout(findTarget, 400);
    } else {
      timerRef.current = setTimeout(findTarget, 150);
    }
    return () => clearTimeout(timerRef.current);
  }, [currentStep]); // eslint-disable-line

  // Update rect on scroll/resize
  useEffect(() => {
    const update = () => {
      const el = document.querySelector(step.selector);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [step.selector]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onDone();
    }
  };

  const isLast = currentStep === steps.length - 1;

  // Tooltip dimensions
  const TOOLTIP_W = 272;
  const TOOLTIP_H_EST = 140;

  const getTooltipStyle = () => {
    if (!targetRect) return { left: 16, top: '50%' };
    const { x, y, width, height } = targetRect;
    const spotY = y - PAD;
    const spotBottom = y + height + PAD;
    const spotCenterX = x + width / 2;

    const spaceBelow = window.innerHeight - spotBottom;
    const spaceAbove = spotY;
    const showAbove = spaceBelow < TOOLTIP_H_EST + 20 && spaceAbove > TOOLTIP_H_EST + 20;

    let left = spotCenterX - TOOLTIP_W / 2;
    left = Math.max(16, Math.min(window.innerWidth - TOOLTIP_W - 16, left));

    if (showAbove) {
      return { left, bottom: window.innerHeight - spotY + 12, top: 'auto' };
    }
    return { left, top: spotBottom + 12 };
  };

  const tooltipStyle = targetRect ? getTooltipStyle() : {};
  const rx = targetRect ? Math.max(0, targetRect.x - PAD) : 0;
  const ry = targetRect ? Math.max(0, targetRect.y - PAD) : 0;
  const rw = targetRect ? targetRect.width + PAD * 2 : 0;
  const rh = targetRect ? targetRect.height + PAD * 2 : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* SVG Overlay with cutout */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect x={rx} y={ry} width={rw} height={rh} rx="12" ry="12" fill="black" />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill={isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.55)'}
          mask="url(#tour-spotlight-mask)"
          onClick={onSkip}
          style={{ cursor: 'pointer' }}
        />
      </svg>

      {/* Tooltip */}
      {visible && targetRect && (
        <div
          style={{
            position: 'fixed',
            width: TOOLTIP_W,
            ...tooltipStyle,
            animation: 'tourFadeIn 0.22s ease',
          }}
          className={`rounded-2xl shadow-2xl p-4 ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-gray-100'}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`font-black text-sm leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {step.title}
            </p>
            <button
              onClick={onSkip}
              className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              <X size={14} />
            </button>
          </div>
          <p className={`text-sm mb-3 leading-snug ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {step.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all duration-200 ${
                    i === currentStep
                      ? 'w-4 h-1.5 bg-indigo-500'
                      : 'w-1.5 h-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-full pl-3 pr-2.5 py-1.5 flex items-center gap-1 transition-colors"
            >
              {isLast ? 'Terminer' : 'Suivant'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
