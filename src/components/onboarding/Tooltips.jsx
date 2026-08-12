import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TOOLTIPS = {
  '/Dashboard': [
    {
      selector: '[data-tooltip="kpis"]',
      text: 'Voici vos KPIs principaux : événements du mois, chiffre d\'affaires et statut de vos dossiers.',
      position: 'bottom',
    },
    {
      selector: '[data-tooltip="quick-actions"]',
      text: 'Accédez rapidement aux actions principales depuis ce menu.',
      position: 'bottom',
    },
  ],
  '/Evenements': [
    {
      selector: '[data-tooltip="create-event"]',
      text: 'Créez un nouvel événement en un clic pour démarrer la gestion de votre projet.',
      position: 'bottom',
    },
  ],
  '/Clients': [
    {
      selector: '[data-tooltip="create-client"]',
      text: 'Ajoutez un nouveau client en un clic.',
      position: 'bottom',
    },
  ],
  '/parametres-entreprise': [
    {
      selector: '[data-tooltip="company-identity"]',
      text: 'Commencez par configurer l\'identité de votre entreprise : nom, logo, adresse, contact…',
      position: 'bottom',
    },
  ],
  '/bibliotheque': [
    {
      selector: '[data-tooltip="modeles"]',
      text: 'Créez des modèles réutilisables pour vos formulaires, menus, programmes et fiches de service.',
      position: 'bottom',
    },
  ],
};

export default function Tooltips() {
  const [visibleTooltips, setVisibleTooltips] = useState(new Set());

  useEffect(() => {
    const pathname = window.location.pathname;
    const pageTooltips = TOOLTIPS[pathname] || [];

    const tooltipIds = new Set();
    pageTooltips.forEach((_, idx) => {
      const id = `tooltip-${pathname}-${idx}`;
      const dismissed = localStorage.getItem(id);
      if (!dismissed) {
        tooltipIds.add(id);
      }
    });

    setVisibleTooltips(tooltipIds);
  }, [window.location.pathname]);

  const pathname = window.location.pathname;
  const pageTooltips = TOOLTIPS[pathname] || [];

  if (pageTooltips.length === 0) return null;

  return (
    <>
      {pageTooltips.map((tooltip, idx) => {
        const id = `tooltip-${pathname}-${idx}`;
        if (!visibleTooltips.has(id)) return null;

        const element = document.querySelector(tooltip.selector);
        if (!element) return null;

        return (
          <TooltipBubble
            key={id}
            element={element}
            text={tooltip.text}
            onClose={() => {
              localStorage.setItem(id, '1');
              setVisibleTooltips(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }}
          />
        );
      })}
    </>
  );
}

function TooltipBubble({ element, text, onClose }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [element]);

  return (
    <div
      className="fixed z-40 bg-slate-900 text-white rounded-lg shadow-xl p-3 max-w-xs text-sm animate-in fade-in slide-in-from-bottom-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex gap-2">
        <p className="flex-1">{text}</p>
        <button
          onClick={onClose}
          className="shrink-0 hover:bg-slate-700 rounded p-0.5"
        >
          <X size={14} />
        </button>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-slate-900 rotate-45" />
    </div>
  );
}