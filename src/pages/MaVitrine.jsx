/**
 * Ma Vitrine — Page d'accueil à cartes cliquables (pattern Bibliothèque).
 * Routing par query param ?section= — montage à la demande réel.
 */
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VitrineCompletionIndicator from '@/components/vitrine/VitrineCompletionIndicator';
import { useVitrineCompletion } from '@/hooks/useVitrineCompletion';
import IdentiteVisuelPage from '@/components/ma-fiche/IdentiteVisuelPage';
import OffrePrestationPage from '@/components/ma-fiche/OffrePrestationPage';
import ContactAvisPage from '@/components/ma-fiche/ContactAvisPage';
import ApercuPage from '@/components/ma-fiche/ApercuPage';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const DOT_COLORS = {
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

function CarteVitrine({ emoji, titre, subtitle, completion, onClick }) {
  const dotColor = completion ? (DOT_COLORS[completion.color] || 'bg-muted-foreground/30') : null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4 transition-all hover:border-primary/40 hover:shadow-md hover:bg-primary/5 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{emoji}</span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-base">{titre}</p>
            {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} title={`${completion.percentage}% complété`} />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <ChevronRight size={20} className="text-muted-foreground shrink-0" />
    </button>
  );
}

const SECTION_TITLES = {
  identite: '🎨 Identité & Visuel',
  offre: '💰 Offre & Prestation',
  contact: '📞 Contact & Avis',
  apercu: '👁️ Aperçu',
};

export default function MaVitrine() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || null;
  const qc = useQueryClient();

  const goToSection = (s) => {
    setSearchParams(s ? { section: s } : {});
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const { settings: cs, isLoading } = useOwnerCompanySettings();

  const completion = useVitrineCompletion();
  const sections = completion?.sections;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {section && (
            <button
              onClick={() => goToSection(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronRight size={14} className="rotate-180" /> Retour
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold">
              {section ? SECTION_TITLES[section] || '🪪 Ma Vitrine' : '🪪 Ma Vitrine'}
            </h2>
            {!section && <p className="text-muted-foreground text-sm mt-0.5">Votre passeport public — éditez et prévisualisez</p>}
          </div>
        </div>
      </div>

      {/* Indicateur de complétion global — replié par défaut */}
      {!section && <VitrineCompletionIndicator completion={completion} />}

      {/* Spinner chargement initial */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Pas de configuration */}
      {!isLoading && !cs && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-4xl">🏗️</p>
          <p className="font-semibold text-foreground">Vitrine non configurée</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Renseignez d'abord les informations de votre entreprise dans la sous-page « Identité & Visuel ».
          </p>
        </div>
      )}

      {/* Accueil — cartes */}
      {!isLoading && cs && !section && (
        <div className="space-y-3">
          <CarteVitrine
            emoji="🎨"
            titre="Identité & Visuel"
            subtitle="Nom, logo, couverture, métier"
            completion={sections?.identite}
            onClick={() => goToSection('identite')}
          />
          <CarteVitrine
            emoji="💰"
            titre="Offre & Prestation"
            subtitle="Tarifs, à propos, points forts, FAQ"
            completion={sections?.offre}
            onClick={() => goToSection('offre')}
          />
          <CarteVitrine
            emoji="📞"
            titre="Contact & Avis"
            subtitle="Coordonnées, réseaux sociaux, avis clients"
            completion={sections?.contact}
            onClick={() => goToSection('contact')}
          />
          <CarteVitrine
            emoji="👁️"
            titre="Aperçu"
            subtitle="Visualisez votre fiche publique"
            onClick={() => goToSection('apercu')}
          />
        </div>
      )}

      {/* Sous-pages — montage à la demande */}
      {!isLoading && cs && section === 'identite' && (
        <IdentiteVisuelPage cs={cs} qc={qc} />
      )}
      {!isLoading && cs && section === 'offre' && (
        <OffrePrestationPage cs={cs} qc={qc} />
      )}
      {!isLoading && cs && section === 'contact' && (
        <ContactAvisPage cs={cs} qc={qc} />
      )}
      {!isLoading && cs && section === 'apercu' && (
        <ApercuPage />
      )}
    </div>
  );
}