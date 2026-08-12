/**
 * ProspectPreview
 *
 * Page de prévisualisation de l'espace prospect pour le prestataire.
 * Charge les vrais CompanySettings mais utilise un prospect fictif en mémoire.
 * Accessible via /prospect-preview (admin uniquement).
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProspectSection from '@/components/client-portal/ProspectSection';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// Prospect fictif généré en mémoire
export function buildFictifProspect(settings) {
  const types = [
    'Mariage', 'Anniversaire', 'Gala', 'Baptême', 'Pacs',
    "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Location', 'Autre',
  ];
  const typeEvenement = types[0]; // Mariage par défaut — générique

  const dateIn30 = new Date();
  dateIn30.setDate(dateIn30.getDate() + 30);
  const dateStr = dateIn30.toISOString().split('T')[0];

  return {
    id: '__preview__',
    prenom: 'Marie',
    nom: 'Dupont',
    prenom2: null,
    nom2: null,
    email: 'marie.dupont@exemple.fr',
    telephone: '06 00 00 00 00',
    type_evenement: typeEvenement,
    date_type: 'exacte',
    date_evenement_souhaitee: dateStr,
    nb_invites_estime: 80,
    lieu_nom: 'Votre lieu',
    lieu_id: null,
    statut: 'Nouveau',
    couleur_theme: null,
    lien_token: '__preview__',
    converti: false,
    archived: false,
  };
}

export default function ProspectPreview() {
  const { settings, isLoading } = useOwnerCompanySettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const prospectFictif = buildFictifProspect(settings);

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau de prévisualisation — fixed z-[200] pour passer au-dessus des drawers z-50 */}
      <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-sm">👁️</span>
          <p className="text-xs font-semibold text-amber-800">
            Mode prévisualisation — Voici ce que verra votre client
          </p>
        </div>
        <button
          onClick={() => { try { window.close(); } catch(e) {} window.history.back(); }}
          className="text-[11px] text-amber-700 underline underline-offset-2 hover:text-amber-900 shrink-0"
          style={{ pointerEvents: 'auto' }}
        >
          Fermer
        </button>
      </div>
      {/* Espace pour compenser le bandeau fixed */}
      <div style={{ height: 41 }} />

      {/* Espace prospect réel avec prospect fictif */}
      <div className="px-4 py-4">
        <ProspectSection prospect={prospectFictif} settings={settings} />
      </div>
    </div>
  );
}