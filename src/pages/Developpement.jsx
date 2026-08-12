import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';
import PageCard from '@/components/PageCard';
import SettingsAvisClients from '@/components/settings/SettingsAvisClients';
import SettingsPresenceEnLigne from '@/components/settings/SettingsPresenceEnLigne';
import SettingsGalerie from '@/components/settings/SettingsGalerie';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

function DeveloppementHub({ onSelect }) {
  const { query } = useOwnerCompanySettings();
  const companyList = query.data ?? [];
  const { data: galerie = [] } = useQuery({
    queryKey: ['galerie-vitrine'],
    queryFn: () => base44.entities.GalerieVitrine.list('-created_date', 200),
  });

  const company = companyList[0] || null;
  const reviewPlatforms = company?.review_platforms?.length || 0;
  const socialNetworks = company?.social_networks?.length || 0;

  return (
    <div className="space-y-3">
      <PageCard
        emoji="⭐"
        iconBg="bg-amber-100 text-amber-700"
        title="Avis clients"
        subtitle={`${reviewPlatforms} plateforme${reviewPlatforms !== 1 ? 's' : ''} configurée${reviewPlatforms !== 1 ? 's' : ''} · envoi automatique J+1`}
        onClick={() => onSelect('avis')}
      />
      <PageCard
        emoji="🌐"
        iconBg="bg-pink-100 text-pink-600"
        title="Présence en ligne"
        subtitle={`${socialNetworks} réseau${socialNetworks !== 1 ? 'x' : ''} social configuré${socialNetworks !== 1 ? 's' : ''}`}
        onClick={() => onSelect('presence')}
      />
      <PageCard
        emoji="🖼️"
        iconBg="bg-teal-100 text-teal-700"
        title="Galerie vitrine"
        subtitle={`${galerie.length} photo${galerie.length !== 1 ? 's' : ''} dans la vitrine prospect`}
        onClick={() => onSelect('galerie')}
      />
    </div>
  );
}

const TITLES = {
  avis: 'Avis clients',
  presence: 'Présence en ligne',
  galerie: 'Galerie vitrine',
};

export default function Developpement() {
  const [view, setView] = useState(null);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        {view && (
          <button
            onClick={() => setView(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" /> Retour
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold">
            {view ? TITLES[view] : 'Développement'}
          </h2>
          {!view && <p className="text-muted-foreground text-sm mt-1">Avis clients, présence en ligne et vitrine</p>}
        </div>
      </div>

      {!view && <DeveloppementHub onSelect={setView} />}
      {view === 'avis' && <SettingsAvisClients />}
      {view === 'presence' && <SettingsPresenceEnLigne />}
      {view === 'galerie' && <SettingsGalerie />}
    </div>
  );
}