/**
 * ApercuPage — Sous-page « Aperçu » de Ma Vitrine.
 * 4 sous-onglets : Prospect, Annuaire, Recommandation, Client.
 *
 * Fidélité : chaque sous-onglet réutilise le VRAI composant de rendu utilisé
 * dans l'app, pas une reconstruction approximative.
 *  - Prospect      → ProspectSection (mêmes données fictives que ProspectPreview.jsx)
 *  - Annuaire      → PrestataireCard context="annuaire" (composant de l'AnnuaireTab)
 *  - Recommandation → VitrineProfil mode_decouverte + mode_recommandation (inchangé)
 *  - Client        → PrestataireCard de PrestatairesCardsSection (composant de l'espace client)
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ExternalLink } from 'lucide-react';
import VitrineProfil from '@/components/vitrine/VitrineProfil';
import ProspectSection from '@/components/client-portal/ProspectSection';
import AnnuairePrestataireCard from '@/components/client-portal/PrestataireCard';
import { PrestataireCard as ClientPrestataireCard } from '@/components/client-portal/PrestatairesCardsSection';
import { buildFictifProspect } from '@/pages/ProspectPreview';
import { getDomaineFromMetier } from '@/config/metierConfig';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const TABS = [
  { id: 'prospect', label: 'Prospect', emoji: '✨' },
  { id: 'annuaire', label: 'Annuaire', emoji: '🔍' },
  { id: 'recommandation', label: 'Recommandé', emoji: '🤝' },
  { id: 'client', label: 'Client', emoji: '👤' },
];

function PreviewHeader({ text }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
      <span className="text-amber-600 text-sm">👁️</span>
      <p className="text-xs text-amber-700 font-medium">{text}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <span className="text-3xl">🔗</span>
      <p className="text-sm text-muted-foreground max-w-xs">
        Aucune fiche prestataire liée. Enregistrez votre identité dans la sous-page
        « Identité & Visuel » pour générer votre fiche publique.
      </p>
    </div>
  );
}

export default function ApercuPage() {
  const [activeTab, setActiveTab] = useState('prospect');

  const { settings: cs } = useOwnerCompanySettings();

  const prestataireId = cs?.prestataire_id;

  const { data: prestataire = null } = useQuery({
    queryKey: ['prestataire-apercu', prestataireId],
    queryFn: () => base44.entities.Prestataire.filter({ id: prestataireId }).then(r => r[0] || null),
    enabled: !!prestataireId,
  });

  const prospectFictif = cs ? buildFictifProspect(cs) : null;

  // Mock EvenementPrestataire pour l'aperçu côté client (statut Confirmé, pas de documents)
  const mockEp = prestataireId ? {
    details: prestataire,
    prestataire_domaine: getDomaineFromMetier(cs?.metier) || '',
    statut: 'Confirmé',
    prestataire_nom: cs?.company_name || 'Mon établissement',
    prestataire_id: prestataireId,
    hasQuestionnaire: false,
    hasContrat: false,
    hasDevis: false,
    notes: null,
  } : null;

  const renderTabContent = () => {
    // ── Prospect ──
    if (activeTab === 'prospect') {
      if (!prospectFictif || !cs) return <EmptyState />;
      return (
        <div className="rounded-2xl overflow-hidden border border-border bg-white">
          <PreviewHeader text="Ce que voit un prospect qui reçoit votre lien" />
          <div className="max-h-[560px] overflow-y-auto">
            <ProspectSection prospect={prospectFictif} settings={cs} />
          </div>
        </div>
      );
    }

    // ── Annuaire ──
    if (activeTab === 'annuaire') {
      if (!cs) return <EmptyState />;
      return (
        <div className="rounded-2xl overflow-hidden border border-border bg-white">
          <PreviewHeader text="Votre carte telle qu'elle apparaît dans l'annuaire géolocalisé" />
          <div className="p-4">
            <div className="space-y-3">
              <AnnuairePrestataireCard
                context="annuaire"
                cs={cs}
                d={prestataire}
                onOpen={() => {}}
                onToggleFavori={() => {}}
              />
            </div>
          </div>
        </div>
      );
    }

    // ── Recommandation ──
    if (activeTab === 'recommandation') {
      if (!prestataireId) return <EmptyState />;
      return (
        <div className="rounded-2xl overflow-hidden border border-border bg-white">
          <PreviewHeader text="La fiche qu'un client découvre quand vous le recommandez" />
          <div className="max-h-[560px] overflow-y-auto">
            <VitrineProfil
              mode="prestataire"
              prestataire_id={prestataireId}
              mode_decouverte={true}
              mode_recommandation={true}
            />
          </div>
          <div className="px-4 py-3 bg-white border-t border-border" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <button disabled
              className="w-full py-3.5 text-sm font-bold rounded-xl text-white opacity-50 cursor-not-allowed"
              style={{ background: '#1e1b4b' }}>
              🔒 Aperçu — bouton désactivé
            </button>
          </div>
        </div>
      );
    }

    // ── Client ──
    if (activeTab === 'client') {
      if (!cs || !mockEp) return <EmptyState />;
      return (
        <div className="rounded-2xl overflow-hidden border border-border bg-white">
          <PreviewHeader text="Votre carte dans l'espace client (Mes prestataires confirmés)" />
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#1e1b4b' }}>
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059', flexShrink: 0 }} />
              Mes prestataires confirmés
              <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
            </p>
            <div className="space-y-3">
              <ClientPrestataireCard ep={mockEp} cs={cs} onSelectModule={() => {}} onOpenOutil={() => {}} />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-5">
      {/* Barre de sous-onglets */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(30,27,75,0.06)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap"
            style={activeTab === tab.id
              ? { background: '#fff', color: '#1e1b4b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#9ca3af' }}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu du sous-onglet actif */}
      {renderTabContent()}

      {/* Lien vers espace prospect complet */}
      <a
        href={`${window.location.origin}/prospect-preview`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
      >
        <span className="text-sm font-medium">🔍 Voir l'espace prospect complet</span>
        <ExternalLink size={14} className="shrink-0" />
      </a>
    </div>
  );
}