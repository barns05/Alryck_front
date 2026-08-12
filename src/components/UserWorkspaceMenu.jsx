import { useState } from 'react';
import { LogOut, ChevronDown, Settings, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function UserWorkspaceMenu({ user, company }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const initiales = company?.company_name
    ? company.company_name.slice(0, 2).toUpperCase()
    : user?.full_name?.slice(0, 2).toUpperCase() || '?';

  const handleLogout = () => {
    base44.auth.logout('/register');
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent/60 transition-all group"
      >
        {/* Logo entreprise */}
        {company?.company_logo_url ? (
          <img
            src={company.company_logo_url}
            alt={company?.company_name}
            className="w-8 h-8 rounded-lg object-contain bg-white/10 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sidebar-primary">{initiales}</span>
          </div>
        )}

        {/* Infos */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-white truncate leading-tight">
            {company?.company_name || 'Mon espace'}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">
            {user?.full_name || user?.email || ''}
          </p>
        </div>

        <ChevronDown
          size={14}
          className={cn('shrink-0 text-sidebar-foreground/40 transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-sidebar-border bg-sidebar shadow-xl overflow-hidden">
            {/* Header dropdown */}
            <div className="px-3 py-2.5 border-b border-sidebar-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Espace de travail</p>
              <p className="text-sm font-semibold text-white truncate mt-0.5">
                {company?.company_name || 'Mon espace'}
              </p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); navigate('/parametres-hub'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white transition-colors"
              >
                <Settings size={14} />
                Paramètres
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/abonnements'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white transition-colors"
              >
                <CreditCard size={14} />
                Mes abonnements
              </button>
              <div className="mx-2 my-1 border-t border-sidebar-border/40" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut size={14} />
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}