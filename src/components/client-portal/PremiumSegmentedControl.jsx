import { useRef, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'evenement',       label: 'Événement',              emoji: '🤝' },
  { id: 'organisation',    label: 'Organisation',            emoji: '🗓️' },
  { id: 'recommandations', label: 'Trouver un prestataire', emoji: '🔍' },
];

export default function PremiumSegmentedControl({ activeTab, onChange }) {
  const containerRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const itemRefs = useRef({});

  useLayoutEffect(() => {
    const el = itemRefs.current[activeTab];
    const container = containerRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPillStyle({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    });
  }, [activeTab]);

  return (
    <div className="px-4 pt-4 pb-1">
      <div
        ref={containerRef}
        className="relative flex items-center rounded-full"
        style={{
          background: '#f7f7f8',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          padding: 4,
        }}
      >
        {/* Capsule active — fond blanc pur + ombre prononcée */}
        {pillStyle.width > 0 && (
          <motion.div
            className="absolute top-1 bottom-1 rounded-full"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              zIndex: 1,
            }}
            animate={{ left: pillStyle.left, width: pillStyle.width }}
            transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }}
          />
        )}

        {/* Onglets */}
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={el => { itemRefs.current[tab.id] = el; }}
              data-onboarding-target={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className="relative flex-1 flex items-center justify-center py-3.5 px-6 select-none rounded-full transition-all"
              style={{
                zIndex: 2,
                background: isActive ? 'transparent' : 'rgba(0,0,0,0.06)',
                border: isActive ? '1px solid transparent' : '1px solid rgba(0,0,0,0.12)',
                margin: '0 2px',
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  lineHeight: 1,
                  opacity: isActive ? 1 : 0.6,
                  filter: isActive ? 'none' : 'grayscale(0.3)',
                  transition: 'opacity 200ms ease, filter 200ms ease',
                }}
              >
                {tab.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}