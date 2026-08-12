import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ModeleFicheModal from '@/components/bibliotheque/ModeleFicheModal';
import ImportDocumentModal from './ImportDocumentModal';
import CreerModal from './CreerModal';

const DESTINATAIRE_LABELS = {
  extras_salle: '👥 Extras Salle',
  extras_cuisine: '👨‍🍳 Extras Cuisine',
  prestataires: '🎯 Prestataires',
  responsable_soir: '👔 Responsable du soir',
  tous: '🌐 Tous',
};

export default function BlocFichesService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState(null); // null | 'new' | modele
  const [creerModal, setCreerModal] = useState(false);
  const [amandaFile, setAmandaFile] = useState(null);

  const { data: modeles = [] } = useQuery({
    queryKey: ['modeles-fiche-service'],
    queryFn: () => base44.entities.ModeleFicheService.list(),
  });

  const handleDelete = async (id) => {
    await base44.entities.ModeleFicheService.delete(id);
    qc.invalidateQueries({ queryKey: ['modeles-fiche-service'] });
    toast({ title: 'Modèle supprimé' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{modeles.length} modèle{modeles.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-2" onClick={() => setCreerModal(true)}>
          <Plus size={15} /> Créer
        </Button>
      </div>

      {modeles.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">Aucun modèle de fiche</p>
          <p className="text-xs mt-1">Créez des modèles réutilisables pour vos événements</p>
        </div>
      )}

      <div className="space-y-2">
        {modeles.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{m.nom}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(m.destinataires || []).map(d => (
                  <span key={d} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {DESTINATAIRE_LABELS[d] || d}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {m.sections && Object.entries(m.sections)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span key={k} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {SECTION_LABELS[k]}
                    </span>
                  ))}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setModal(m)}>
                <Pencil size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {creerModal && (
        <CreerModal
          title="Fiche de service"
          onManual={() => setModal('new')}
          onImageSimple={async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.ModeleFicheService.create({ nom: file.name.replace(/\.[^/.]+$/, ''), actif: true });
            qc.invalidateQueries({ queryKey: ['modeles-fiche-service'] });
          }}
          onImageAmanda={(file) => setAmandaFile(file)}
          onClose={() => setCreerModal(false)}
        />
      )}
      {amandaFile && (
        <ImportDocumentModal
          preselectedType="fiche_service"
          initialFile={amandaFile}
          onClose={() => setAmandaFile(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['modeles-fiche-service'] })}
        />
      )}

      {modal && (
        <ModeleFicheModal
          modele={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); qc.invalidateQueries({ queryKey: ['modeles-fiche-service'] }); }}
        />
      )}
    </div>
  );
}

export const SECTION_LABELS = {
  infos_evenement: 'Infos événement',
  programme: 'Programme',
  nb_couverts: 'Nb couverts',
  menu: 'Menu',
  allergies: 'Allergies',
  tenue: 'Tenue',
  heure_prise_poste: 'Prise de poste',
  plan_salle: 'Plan de salle',
  coordonnees_urgence: 'Coordonnées urgence',
  responsable_soir: 'Responsable soir',
  infos_logistiques: 'Infos logistiques',
};