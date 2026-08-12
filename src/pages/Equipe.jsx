import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronRight } from 'lucide-react';
import PageCard from '@/components/PageCard';
import { Button } from '@/components/ui/button';
import ExtrasCardsSection from '@/components/equipe/ExtrasCardsSection';
import CollaborateursCardsSection from '@/components/equipe/CollaborateursCardsSection';
import ExtraModal from '@/components/extras/ExtraModal';

function EquipeViewCards() {
  const [newModalOpen, setNewModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <Button onClick={() => setNewModalOpen(true)} className="gap-2">
          <Plus size={16} /> Ajouter un membre
        </Button>
      </div>

      <ExtrasCardsSection />
      <CollaborateursCardsSection />

      {newModalOpen && <ExtraModal extra={null} onClose={() => setNewModalOpen(false)} />}
    </div>
  );
}



function EquipeHub({ onSelect }) {
  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list('-created_date'),
  });
  const { data: collaborateurs = [] } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list(),
  });

  const actifs = extras.filter(e => e.actif !== false).length;

  return (
    <div className="space-y-3">
      <PageCard
        emoji="👤"
        iconBg="bg-purple-100 text-purple-700"
        title="Extras"
        subtitle={`${actifs} actif${actifs !== 1 ? 's' : ''} sur ${extras.length} extra${extras.length !== 1 ? 's' : ''}`}
        onClick={() => onSelect('extras')}
      />
      <PageCard
        emoji="🤝"
        iconBg="bg-blue-100 text-blue-700"
        title="Collaborateurs"
        subtitle={`${collaborateurs.length} collaborateur${collaborateurs.length !== 1 ? 's' : ''}`}
        onClick={() => onSelect('collaborateurs')}
      />
    </div>
  );
}

export default function Equipe() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Équipe</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos extras et collaborateurs</p>
      </div>

      <EquipeViewCards />
    </div>
  );
}