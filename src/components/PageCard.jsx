import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Carte de navigation standardisée — style Bibliothèque.
 * Props:
 *   emoji: string
 *   icon: composant Lucide (optionnel, utilisé si pas d'emoji)
 *   iconBg: string (classes Tailwind pour la couleur de fond de l'icône)
 *   title: string
 *   subtitle: string
 *   active: bool
 *   onClick: fn
 *   disabled: bool
 *   badge: node (élément affiché à droite avant la flèche)
 */
export default function PageCard({ emoji, icon: Icon, iconBg = 'bg-primary/10 text-primary', title, subtitle, active, onClick, disabled, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left rounded-2xl border p-5 flex items-center gap-4 transition-all',
        disabled
          ? 'opacity-50 cursor-not-allowed bg-card border-border'
          : active
            ? 'bg-primary/5 border-primary/30 shadow-sm'
            : 'bg-card border-border hover:border-primary/30 hover:shadow-md hover:bg-primary/5 cursor-pointer'
      )}
    >
      {/* Icône */}
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl', !emoji && iconBg)}>
        {emoji ? emoji : Icon ? <Icon size={22} /> : null}
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base leading-tight">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>

      {/* Badge optionnel */}
      {badge && <div className="shrink-0">{badge}</div>}

      {/* Flèche */}
      {!disabled && (
        <ChevronRight size={20} className={cn('shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
      )}
      {disabled && (
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">Bientôt</span>
      )}
    </button>
  );
}