import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';
import PageCard from '@/components/PageCard';
import Prestataires from './Prestataires';
import Lieux from './Lieux';

function PartenairesLieuxHub({ onSelect }) {
  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => base44.entities.Prestataire.list(),
  });
  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list('-created_date', 200),
  });

  const prestatairesActifs = prestataires.filter(p => p.actif !== false).length;

  return (
    <div className="space-y-3">
      <PageCard
        emoji="🎵"
        iconBg="bg-indigo-100 text-indigo-700"
        title="Prestataires"
        subtitle={`${prestatairesActifs} actif${prestatairesActifs !== 1 ? 's' : ''} sur ${prestataires.length} prestataire${prestataires.length !== 1 ? 's' : ''}`}
        onClick={() => onSelect('prestataires')}
      />
      <PageCard
        emoji="📍"
        iconBg="bg-teal-100 text-teal-700"
        title="Lieux"
        subtitle={`${lieux.length} lieu${lieux.length > 1 ? 'x' : ''} enregistré${lieux.length > 1 ? 's' : ''}`}
        onClick={() => onSelect('lieux')}
      />
    </div>
  );
}

const TITLES = {
  prestataires: 'Prestataires',
  lieux: 'Lieux',
};

export default function PartenairesLieux() {
  const [view, setView] = useState(null);

  if (view === 'prestataires') return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setView(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Retour
        </button>
        <h2 className="text-2xl font-bold">Prestataires</h2>
      </div>
      <Prestataires embedded />
    </div>
  );

  if (view === 'lieux') return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setView(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Retour
        </button>
        <h2 className="text-2xl font-bold">Lieux</h2>
      </div>
      <Lieux embedded />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Partenaires & Lieux</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos prestataires et vos lieux</p>
      </div>
      <PartenairesLieuxHub onSelect={setView} />
    </div>
  );
}