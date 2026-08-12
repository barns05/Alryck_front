import { useState } from 'react';
import { Plus, Trash2, GripVertical, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PLATFORM_SUGGESTIONS = [
  { name: 'Google', url: 'https://g.page/r/' },
  { name: 'Facebook', url: 'https://www.facebook.com/' },
  { name: 'Mariages.net', url: 'https://www.mariages.net/' },
  { name: 'Trustpilot', url: 'https://www.trustpilot.com/' },
  { name: 'TripAdvisor', url: 'https://www.tripadvisor.fr/' },
];

export default function ReviewPlatformsSection({
  platforms,
  onChange,
  autoEnabled,
  onAutoEnabledChange,
  autoMessage,
  onAutoMessageChange,
}) {
  const [dragIdx, setDragIdx] = useState(null);

  const addPlatform = (suggestion = null) => {
    onChange([...platforms, { name: suggestion?.name || '', url: suggestion?.url || '' }]);
  };

  const removePlatform = (i) => onChange(platforms.filter((_, idx) => idx !== i));

  const updatePlatform = (i, field, value) =>
    onChange(platforms.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const newList = [...platforms];
    const [moved] = newList.splice(dragIdx, 1);
    newList.splice(i, 0, moved);
    setDragIdx(i);
    onChange(newList);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Star size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold">Plateformes d'avis</h3>
      </div>

      {/* Plateformes */}
      <div className="space-y-2">
        {platforms.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucune plateforme ajoutée</p>
        )}
        {platforms.map((p, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${dragIdx === i ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'}`}
          >
            <div className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
              <GripVertical size={14} />
            </div>
            <Input
              value={p.name}
              onChange={(e) => updatePlatform(i, 'name', e.target.value)}
              placeholder="Nom (ex: Google)"
              className="flex-1 text-sm h-8"
            />
            <Input
              value={p.url}
              onChange={(e) => updatePlatform(i, 'url', e.target.value)}
              placeholder="https://..."
              className="flex-[2] text-sm h-8"
            />
            <button
              type="button"
              onClick={() => removePlatform(i)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions ajout */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addPlatform()}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={13} /> Ajouter une plateforme
        </button>
        <span className="text-xs text-muted-foreground self-center">ou</span>
        {PLATFORM_SUGGESTIONS.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => addPlatform(s)}
            className="text-xs bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-lg border border-border transition-colors"
          >
            + {s.name}
          </button>
        ))}
      </div>

      {/* Mode automatique */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Mode automatique</p>
            <p className="text-xs text-muted-foreground">Envoie une demande d'avis J+1 après l'événement</p>
          </div>
          <button
            type="button"
            onClick={() => onAutoEnabledChange(!autoEnabled)}
            className={`transition-colors ${autoEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}
          >
            {autoEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>

        {autoEnabled && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Message personnalisé</label>
            <textarea
              value={autoMessage}
              onChange={(e) => onAutoMessageChange(e.target.value)}
              placeholder="Ex: Bonjour {client}, merci d'avoir fait confiance à notre équipe pour votre {type_evenement}. Votre avis nous aide à progresser ! Retrouvez nos plateformes ci-dessous."
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground">Variables disponibles : <code className="bg-muted px-1 rounded">{"{client}"}</code>, <code className="bg-muted px-1 rounded">{"{type_evenement}"}</code></p>
          </div>
        )}
      </div>
    </div>
  );
}