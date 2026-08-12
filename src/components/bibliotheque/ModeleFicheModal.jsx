import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const SECTIONS = [
  { key: 'infos_evenement', label: 'Informations événement (nom, date, lieu)' },
  { key: 'programme', label: 'Programme de la journée' },
  { key: 'nb_couverts', label: 'Nombre de couverts' },
  { key: 'menu', label: 'Menu complet' },
  { key: 'allergies', label: 'Allergies / régimes spéciaux' },
  { key: 'tenue', label: 'Tenue vestimentaire' },
  { key: 'heure_prise_poste', label: 'Horaire de prise de poste' },
  { key: 'plan_salle', label: 'Plan de salle' },
  { key: 'coordonnees_urgence', label: 'Coordonnées d\'urgence' },
  { key: 'responsable_soir', label: 'Nom du responsable du soir' },
  { key: 'infos_logistiques', label: 'Infos logistiques (accès, parking…)' },
];

const DESTINATAIRES = [
  { key: 'extras_salle', label: '👥 Extras Salle' },
  { key: 'extras_cuisine', label: '👨‍🍳 Extras Cuisine' },
  { key: 'prestataires', label: '🎯 Prestataires' },
  { key: 'responsable_soir', label: '👔 Responsable du soir' },
  { key: 'tous', label: '🌐 Tous' },
];

const DEFAULT_SECTIONS = {
  infos_evenement: true,
  programme: true,
  nb_couverts: true,
  menu: true,
  allergies: false,
  tenue: false,
  heure_prise_poste: true,
  plan_salle: false,
  coordonnees_urgence: false,
  responsable_soir: true,
  infos_logistiques: false,
};

export default function ModeleFicheModal({ modele, onClose, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState(modele?.nom || '');
  const [sections, setSections] = useState(modele?.sections || DEFAULT_SECTIONS);
  const [destinataires, setDestinataires] = useState(modele?.destinataires || []);

  const toggleSection = (key) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDestinataire = (key) => {
    setDestinataires(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    const data = { nom: nom.trim(), sections, destinataires };
    if (modele) {
      await base44.entities.ModeleFicheService.update(modele.id, data);
    } else {
      await base44.entities.ModeleFicheService.create(data);
    }
    toast({ title: modele ? 'Modèle modifié' : 'Modèle créé', duration: 3000 });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h3 className="font-bold text-lg">{modele ? 'Modifier le modèle' : 'Nouvelle fiche de service'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Nom */}
          <div>
            <label className="text-sm font-medium">Nom de la fiche</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="ex: Fiche Salle, Fiche Cuisine…"
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Sections */}
          <div>
            <label className="text-sm font-medium">Sections à inclure</label>
            <div className="mt-2 space-y-2">
              {SECTIONS.map(s => (
                <label key={s.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!sections[s.key]}
                    onChange={() => toggleSection(s.key)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Destinataires */}
          <div>
            <label className="text-sm font-medium">Destinataires</label>
            <div className="mt-2 space-y-2">
              {DESTINATAIRES.map(d => (
                <label key={d.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={destinataires.includes(d.key)}
                    onChange={() => toggleDestinataire(d.key)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0">
          <Button
            onClick={handleSave}
            disabled={!nom.trim() || saving}
            className="w-full h-11"
          >
            {saving ? 'Enregistrement…' : modele ? 'Enregistrer' : 'Créer le modèle'}
          </Button>
        </div>
      </div>
    </div>
  );
}