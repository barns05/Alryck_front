/**
 * EspaceSelector — Sélecteur d'espace côté client
 * - 0 EspaceLieu pour le lieu de l'événement → n'affiche rien (fallback niveau 1)
 * - 1 EspaceLieu → auto-sélection (écrit espace_lieu_id sur l'Evenement)
 * - plusieurs → propose le choix via un <select>
 * Notifie le parent via onEspace(espace|null) une fois résolu.
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin } from 'lucide-react';

export default function EspaceSelector({ evenement, onEspace }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(evenement?.espace_lieu_id || null);

  const { data: espaces = [], isLoading } = useQuery({
    queryKey: ['espaces-lieu', evenement?.lieu_id],
    queryFn: () =>
      evenement?.lieu_id
        ? base44.entities.EspaceLieu.filter({ lieu_id: evenement.lieu_id, actif: true })
        : [],
    enabled: !!evenement?.lieu_id,
    staleTime: 30000,
  });

  // Auto-sélection si un seul espace et aucune sélection explicite
  useEffect(() => {
    if (espaces.length === 1 && !selectedId) {
      const id = espaces[0].id;
      setSelectedId(id);
      base44.entities.Evenement
        .update(evenement.id, { espace_lieu_id: id })
        .then(() => qc.invalidateQueries(['evenements']))
        .catch(() => {});
    }
  }, [espaces, selectedId, evenement.id, qc]);

  const selected = espaces.find((e) => e.id === selectedId) || null;

  useEffect(() => {
    onEspace?.(selected);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = async (id) => {
    setSelectedId(id);
    try {
      await base44.entities.Evenement.update(evenement.id, { espace_lieu_id: id });
      qc.invalidateQueries(['evenements']);
    } catch {
      /* ignore */
    }
  };

  if (espaces.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MapPin size={14} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">Espace du lieu :</span>
      {espaces.length === 1 ? (
        <span className="text-xs font-semibold text-foreground">{selected?.nom || '…'}</span>
      ) : (
        <select
          value={selectedId || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 text-base border border-input rounded-lg px-2 bg-background"
          disabled={isLoading}
        >
          <option value="" disabled>
            Choisir un espace…
          </option>
          {espaces.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}