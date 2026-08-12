/**
 * BlocAvisDecouverte — Bloc avis universel de la fiche découverte VitrineProfil.
 *
 * source='externe' (défaut) : lien cliquable "⭐ Voir les avis →" vers lien_avis_externe.
 *   La note chiffrée et le nombre d'avis (note_moyenne_externe, nb_avis_externe) ne sont
 *   PAS affichés : non vérifiables sans contrôle (un prestataire pourrait les déclarer
 *   de manière inexacte). Le bloc est visible dès que lien_avis_externe est renseigné.
 *
 * source='alryck' (futur) : quand les avis Alryck natifs existeront, ce mode pourra
 *   afficher une vraie note vérifiée calculée depuis les avis natifs. Passer
 *   `avisData={ note, nbAvis, lien, sourceNom }` quand disponible — tant que null,
 *   le bloc ne s'affiche pas. La structure du composant est conservée pour cette évolution.
 */
import { Star, ExternalLink } from 'lucide-react';

function formatNoteFr(note) {
  if (note == null) return null;
  return Number(note).toFixed(1).replace('.', ',');
}

function AvisCard({ note, nbAvis, sourceNom, lien, voirLabel = 'Voir les avis', simple = false }) {
  if (simple) {
    // Mode externe : lien seul, pas de note ni de nombre d'avis
    return (
      <a
        href={lien}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-white border border-border rounded-2xl p-4 flex items-center justify-between transition-all hover:border-primary/40"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Star size={16} className="fill-amber-400 text-amber-400" />
          {voirLabel}
        </span>
        <ExternalLink size={16} className="text-muted-foreground" />
      </a>
    );
  }

  // Mode futur 'alryck' : note vérifiée + nombre d'avis
  const noteStr = formatNoteFr(note);
  const arrondi = note != null ? Math.round(note) : 0;

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={16}
              className={i < arrondi ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}
            />
          ))}
        </div>
        {noteStr && (
          <span className="font-bold text-lg leading-none" style={{ color: '#1e1b4b' }}>{noteStr}</span>
        )}
      </div>
      {nbAvis != null && (
        <p className="text-xs mt-1.5" style={{ color: '#6b7280' }}>
          Basé sur {nbAvis} avis{sourceNom ? ` (${sourceNom})` : ''}
        </p>
      )}
      {lien && (
        <a
          href={lien}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          {voirLabel}
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

export default function BlocAvisDecouverte({ vitrineData, source = 'externe', avisData = null }) {
  if (source === 'alryck') {
    if (!avisData) return null;
    return (
      <AvisCard
        note={avisData.note}
        nbAvis={avisData.nbAvis}
        sourceNom={avisData.sourceNom || 'Alryck'}
        lien={avisData.lien}
      />
    );
  }

  // source === 'externe' (défaut) : lien seul, visible dès que lien_avis_externe est renseigné
  const lien = vitrineData?.lien_avis_externe || null;
  if (!lien) return null;

  return <AvisCard lien={lien} simple />;
}