import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClientSearchSelector({ onSelect, onManualEntry }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const searchInputRef = useRef(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => base44.entities.Client.list('-date_evenement', 500),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 500),
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects-all'],
    queryFn: () => base44.entities.Prospect.list('-created_date', 500),
  });

  // Map clientId → événement le plus récent
  const evenementParClient = useMemo(() => {
    const map = {};
    evenements.forEach(ev => {
      if (!ev.client_id) return;
      if (!map[ev.client_id]) map[ev.client_id] = ev;
    });
    return map;
  }, [evenements]);

  // Types d'événements disponibles
  const types = useMemo(() => {
    const allTypes = new Set();
    clients.forEach(c => { const t = evenementParClient[c.id]?.type_evenement; if (t) allTypes.add(t); });
    prospects.forEach(p => { if (p.type_evenement) allTypes.add(p.type_evenement); });
    return Array.from(allTypes).sort();
  }, [clients, prospects, evenementParClient]);

  // Dates disponibles
  const dates = useMemo(() => {
    const allDates = new Set();
    clients.forEach(c => { const d = evenementParClient[c.id]?.date; if (d) allDates.add(d.slice(0, 7)); });
    return Array.from(allDates).sort().reverse();
  }, [clients, evenementParClient]);

  // Fusion et filtrage
  const allContacts = [
    ...clients.map(c => {
      const ev = evenementParClient[c.id];
      return {
        ...c,
        _isClient: true,
        type_evenement: ev?.type_evenement || c.type_evenement || '',
        date_evenement: ev?.date || c.date_evenement || '',
      };
    }),
    ...prospects.filter(p => !clients.find(c => c.email === p.email)).map(p => ({ ...p, _isProspect: true, nom: `${p.prenom} ${p.nom}` })),
  ];

  const filtered = useMemo(() => {
    return allContacts.filter(contact => {
      const qLower = searchQuery.toLowerCase();
      const matchSearch = !qLower || contact.nom?.toLowerCase().includes(qLower);
      const matchType = !filterType || contact.type_evenement === filterType;
      const matchDate = !filterDate || contact.date_evenement?.startsWith(filterDate);
      return matchSearch && matchType && matchDate;
    });
  }, [allContacts, searchQuery, filterType, filterDate]);

  const handleSelect = (contact) => {
    onSelect({
      client_nom: contact.nom || '',
      client_email: contact.email || '',
      client_telephone: contact.telephone || '',
      client_adresse: contact.adresse || '',
      prospectId: contact._isProspect ? contact.id : null,
    });
    closeSheet();
  };

  const closeSheet = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Reset filtres à la fermeture + autofocus à l'ouverture
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Client</label>

      <button
        onClick={() => setSearchOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-input bg-background text-sm text-left hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">Rechercher un client...</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>

      {searchOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />

          {/* Bottom sheet */}
          <div className="relative bg-card border border-border rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] h-[85vh]">
            {/* Poignée + header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border shrink-0">
              <div className="flex-1" />
              <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-muted-foreground/30" />
              <button onClick={closeSheet} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Recherche fixe */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nom du client..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-10 text-base"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            {/* Filtres */}
            <div className="px-4 pb-2 grid grid-cols-2 gap-2 shrink-0">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-xs"
              >
                <option value="">Tous types</option>
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-xs"
              >
                <option value="">Toutes dates</option>
                {dates.map(d => (
                  <option key={d} value={d}>{format(parseISO(d + '-01'), 'MMM yyyy', { locale: fr })}</option>
                ))}
              </select>
            </div>

            {/* Liste scrollable — conteneur dédié avec overflow propre (iOS-safe) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Aucun client trouvé</p>
              ) : (
                filtered.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelect(contact)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted active:bg-muted transition-colors text-sm"
                  >
                    <p className="font-medium">
                      {contact.nom}
                      {contact._isProspect && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Prospect</span>}
                    </p>
                    <p className="text-muted-foreground text-xs">{contact.email}</p>
                    {contact.type_evenement && <p className="text-muted-foreground text-[10px] mt-0.5">{contact.type_evenement}{contact.date_evenement ? ` · ${format(parseISO(contact.date_evenement), 'd MMM yyyy', { locale: fr })}` : ''}</p>}
                  </button>
                ))
              )}
            </div>

            {/* Bouton saisie manuelle */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  onManualEntry();
                  closeSheet();
                }}
              >
                Saisir manuellement
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}