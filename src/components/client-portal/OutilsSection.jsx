/**
 * OutilsSection — Section "Outils disponibles pour votre événement"
 * Cartes globales (communes à l'événement) :
 *   🗓️ Déroulé · 📘 Brochures & prestations · 🪑 Plan de salle (si lieu confirmé avec espace)
 *
 * Les outils Questionnaires / Contrats / Devis & Factures sont rattachés
 * par prestataire et affichés sur chaque carte « Mes prestataires confirmés ».
 *
 * Largeur adaptative : la grille est 2 colonnes ; si le nombre de cartes visibles
 * est impair, la dernière carte prend toute la largeur (col-span-2) pour éviter
 * un trou à côté. Si une seule carte, pleine largeur.
 *
 * Résolution « Plan de salle » : reprend la même logique que PrestatairesCardsSection
 * (clés de cache identiques → pas de requête réseau dupliquée). Confirmés → isLieu
 * via getMetierConfig → isEventVenue (lieu_id normalisé ?? null) → EspaceLieu actifs
 * du prestataire.
 */
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, BookOpen, Armchair, ClipboardList } from 'lucide-react';
import { getMetierConfig } from '@/config/metierConfig';


// ── Carte outil ────────────────────────────────────────────────────────────────
function OutilCard({ icon: Icon, title, lines, onClick, accentColor = '#1e1b4b', badge }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="premium-card flex flex-col items-start gap-2 p-5 text-left w-full"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
        <Icon size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
      </div>
      <div className="space-y-0.5 w-full relative z-[3]">
        <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>{title}</p>
        {lines.map((line, i) => (
          <p key={i} className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>
            {line.text}
          </p>
        ))}
        {badge && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 relative z-[3]"
            style={{ background: `${accentColor}20`, color: accentColor }}>
            {badge}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function OutilsSection({ evenement, onSelectTile, onOpen, onOpenPlanSalle }) {
  const nbEtapes = (evenement.programme_journee || []).length;

  // Brochures
  const { data: brochures = [] } = useQuery({
    queryKey: ['outils-brochures'],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
    staleTime: 300000,
  });

  // ── Résolution « Plan de salle » (clés de cache partagées avec PrestatairesCardsSection).
  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenement.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id }),
  });
  const { data: tousPrestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
    enabled: evPrestataires.length > 0,
  });
  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
    enabled: evPrestataires.length > 0,
  });
  const { data: allEspaces = [] } = useQuery({
    queryKey: ['espaces-lieu-by-prestataire', evenement.id],
    queryFn: () => base44.entities.EspaceLieu.filter({ actif: true }),
    enabled: evPrestataires.length > 0,
    staleTime: 30000,
  });

  // Questionnaires envoyés par les prestataires confirmés (carte dédiée).
  const { data: formulaires = [] } = useQuery({
    queryKey: ['outils-formulaires-ev', evenement.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id }),
    enabled: evPrestataires.length > 0,
    staleTime: 60000,
  });

  // Espaces du lieu confirmé de l'événement (toutes confondues si plusieurs prestataires lieu).
  const espacesLieu = (() => {
    const confirmes = evPrestataires.filter(ep => ep.statut === 'Confirmé');
    if (confirmes.length === 0) return [];
    const espaces = [];
    for (const ep of confirmes) {
      const details = tousPrestataires.find(p => p.id === ep.prestataire_id) || null;
      const cs = allCompanySettings.find(c => c.prestataire_id === ep.prestataire_id) || null;
      if (getMetierConfig(cs?.metier).groupe !== 'Lieux et réception') continue;
      // Normalisation null/undefined : Prestataire.lieu_id peut être absent (undefined)
      // tandis qu'Evenement.lieu_id vaut null. On ramène les deux à null pour comparer.
      const isEventVenue = (details?.lieu_id ?? null) === (evenement?.lieu_id ?? null);
      if (!isEventVenue) continue;
      const own = allEspaces.filter(e => e.prestataire_id === ep.prestataire_id);
      if (own.length > 0) espaces.push(...own);
    }
    return espaces;
  })();

  const showPlanSalle = espacesLieu.length > 0;

  // Questionnaires : un prestataire confirmé peut avoir envoyé plusieurs formulaires.
  // La carte n'apparaît que s'il existe au moins un questionnaire actif.
  const confirmesIds = new Set(evPrestataires.filter(ep => ep.statut === 'Confirmé').map(ep => ep.prestataire_id));
  const nbQuestionnaires = formulaires.filter(f => f.statut !== 'Brouillon' && f.prestataire_id && confirmesIds.has(f.prestataire_id)).length;
  const showQuestionnaires = nbQuestionnaires > 0;

  const brochuresLines = () => {
    if (brochures.length === 0) return [{ text: 'Aucune brochure disponible', muted: true }];
    return [{ text: `${brochures.length} document${brochures.length > 1 ? 's' : ''} disponible${brochures.length > 1 ? 's' : ''}`, muted: false }];
  };

  // Construction de la liste des cartes visibles (ordre fixe : Déroulé, Brochures, Plan de salle).
  const cards = [
    {
      key: 'programme',
      node: (
        <OutilCard
          icon={Calendar}
          title="Déroulé de l'événement"
          lines={[{ text: 'Timeline collaborative', muted: false }]}
          badge={nbEtapes > 0 ? `${nbEtapes} étape${nbEtapes > 1 ? 's' : ''}` : null}
          accentColor="#1e1b4b"
          onClick={() => onOpen?.('programme')}
        />
      ),
    },
    {
      key: 'brochures',
      node: (
        <OutilCard
          icon={BookOpen}
          title="Brochures & prestations"
          lines={brochuresLines()}
          accentColor="#1e1b4b"
          onClick={() => onOpen?.('brochures')}
        />
      ),
    },
  ];
  if (showQuestionnaires) {
    cards.push({
      key: 'questionnaires',
      node: (
        <OutilCard
          icon={ClipboardList}
          title="Questionnaires"
          lines={[{ text: `${nbQuestionnaires} questionnaire${nbQuestionnaires > 1 ? 's' : ''} à remplir`, muted: false }]}
          badge={nbQuestionnaires > 1 ? `${nbQuestionnaires}` : null}
          accentColor="#1e1b4b"
          onClick={() => onOpen?.('questionnaires')}
        />
      ),
    });
  }
  if (showPlanSalle) {
    cards.push({
      key: 'plan-salle',
      node: (
        <OutilCard
          icon={Armchair}
          title="Plan de salle"
          lines={[{ text: 'Choisissez une configuration du lieu', muted: false }]}
          badge={espacesLieu.length > 1 ? `${espacesLieu.length} espaces` : null}
          accentColor="#C5A059"
          onClick={() => onOpenPlanSalle?.(espacesLieu)}
        />
      ),
    });
  }

  const total = cards.length;
  const isOdd = total % 2 === 1;

  return (
    <div className="px-4 pt-5 space-y-3">
      {/* Titre section */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#1e1b4b' }}>
          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059', flexShrink: 0 }} />
          Outils disponibles pour votre événement
          <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
        </p>
      </div>

      {/* Cartes globales en grille 2 colonnes — dernière carte pleine largeur si total impair */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => {
          const last = i === cards.length - 1;
          return (
            <div key={c.key} className={last && isOdd ? 'col-span-2' : ''}>
              {c.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}