import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDuree } from '@/lib/programmeUtils';

function genId() { return Math.random().toString(36).slice(2, 9); }

export default function EtapeRow({
  etape,
  index,
  dragHandleProps,
  draggableProps,
  innerRef,
  onUpdateEtape,
  onDeleteEtape,
  onAddSousEtape,
  onUpdateSousEtape,
  onDeleteSousEtape
}) {
  const [showSousEtapes, setShowSousEtapes] = useState(false);
  const hasSousEtapes = etape.sous_etapes && etape.sous_etapes.length > 0;

  const addSousEtape = () => {
    onAddSousEtape(index, { id: genId(), nom: '', duree_heures: 0, duree_minutes: 0 });
  };

  return (
    <div ref={innerRef} {...draggableProps} className="space-y-1">
      {/* Étape principale */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="text-muted-foreground cursor-grab shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="16" cy="5" r="1" />
              <circle cx="16" cy="12" r="1" />
              <circle cx="16" cy="19" r="1" />
            </svg>
          </div>

          {/* Heure calculée */}
          <span className="text-xs font-mono text-primary font-semibold w-12 shrink-0">
            {etape.heure || '--:--'}
          </span>

          {/* Nom */}
          <Input
            value={etape.nom}
            onChange={(e) => onUpdateEtape(index, 'nom', e.target.value)}
            placeholder="Nom de l'étape"
            className="flex-1 h-7 text-sm"
          />

          {/* Durée */}
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="number"
              min={0}
              max={12}
              value={etape.duree_heures ?? 0}
              onChange={(e) => onUpdateEtape(index, 'duree_heures', parseInt(e.target.value) || 0)}
              className="w-12 h-7 text-xs text-center"
            />
            <span className="text-xs text-muted-foreground">h</span>
            <Input
              type="number"
              min={0}
              max={59}
              step={5}
              value={etape.duree_minutes ?? 0}
              onChange={(e) => onUpdateEtape(index, 'duree_minutes', parseInt(e.target.value) || 0)}
              className="w-12 h-7 text-xs text-center"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>

          {/* Bouton toggle sous-étapes */}
          {hasSousEtapes && (
            <button
              onClick={() => setShowSousEtapes(!showSousEtapes)}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              {showSousEtapes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span className="text-xs ml-1 inline">{etape.sous_etapes.length}</span>
            </button>
          )}

          {/* Bouton ajouter sous-étape */}
          <button
            onClick={addSousEtape}
            className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
            title="Ajouter une sous-étape"
          >
            <Plus size={16} />
          </button>

          {/* Bouton supprimer */}
          <button
            onClick={() => onDeleteEtape(index)}
            className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Sous-étapes (affichage) */}
        {hasSousEtapes && showSousEtapes && (
          <div className="ml-6 space-y-1.5 border-l-2 border-primary/30 pl-3 py-1">
            {etape.sous_etapes.map((sousEtape, seIdx) => (
              <div key={sousEtape.id || seIdx} className="flex items-center gap-2 bg-muted/20 rounded-lg px-2 py-1.5">
                <span className="text-xs text-primary/60">└</span>

                {/* Heure calculée (offset depuis l'étape principale) */}
                <span className="text-xs text-muted-foreground min-w-fit">Env.</span>

                {/* Nom */}
                <Input
                  value={sousEtape.nom}
                  onChange={(e) => onUpdateSousEtape(index, seIdx, 'nom', e.target.value)}
                  placeholder="Description..."
                  className="flex-1 h-6 text-xs border-0 bg-transparent"
                />

                {/* Durée optionnelle */}
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={sousEtape.duree_heures ?? 0}
                    onChange={(e) => onUpdateSousEtape(index, seIdx, 'duree_heures', parseInt(e.target.value) || 0)}
                    className="w-10 h-6 text-xs text-center border-0 bg-transparent"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={sousEtape.duree_minutes ?? 0}
                    onChange={(e) => onUpdateSousEtape(index, seIdx, 'duree_minutes', parseInt(e.target.value) || 0)}
                    className="w-10 h-6 text-xs text-center border-0 bg-transparent"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>

                {/* Bouton supprimer */}
                <button
                  onClick={() => onDeleteSousEtape(index, seIdx)}
                  className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}