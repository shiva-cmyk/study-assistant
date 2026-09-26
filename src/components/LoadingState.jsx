import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const STEPS = [
  'Reading your study material & detecting domain...',
  'Identifying key concepts, mechanisms, and distinctions...',
  'Creating structured flashcards with definitions...',
  'Building practice questions, options, and explanations...',
  'Checking study-set schema and constraints...',
  'Preparing your interactive learning workspace...',
];

export function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCurrentStep(1), 1200);
    const t2 = setTimeout(() => setCurrentStep(2), 2600);
    const t3 = setTimeout(() => setCurrentStep(3), 4200);
    const t4 = setTimeout(() => setCurrentStep(4), 5800);
    const t5 = setTimeout(() => setCurrentStep(5), 7500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  return (
    <div className="loading-card" role="status" aria-live="polite">
      <div className="spinner-orbit">
        <div className="spinner-outer" />
        <div className="spinner-inner" />
      </div>

      <h3 className="loading-title">Building Your Learning Workspace</h3>
      <p className="loading-subtitle">
        Transforming your material into structured active-recall tools...
      </p>

      <div className="loading-steps">
        {STEPS.map((stepText, idx) => {
          const isDone = currentStep > idx;
          const isActive = currentStep === idx;

          let stepClass = 'loading-step';
          if (isDone) stepClass += ' done';
          else if (isActive) stepClass += ' active';

          return (
            <div key={idx} className={stepClass}>
              <div className="step-indicator">
                {isDone ? (
                  <CheckCircle2 size={14} />
                ) : isActive ? (
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span>{stepText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
