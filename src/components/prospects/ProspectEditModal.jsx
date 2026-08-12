import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ConvertirProspectModal from '@/components/prospects/ConvertirProspectModal';
import { capitalizeWords } from '@/lib/capitalize';
import { PROSPECT_TYPES as TYPES, PROSPECT_SOURCES as SOURCES, PROSPECT_STATUTS as STATUTS, PROSPECT_STATUT_DOTS as STATUT_DOTS, genProspectToken as genToken } from '@/lib/prospectConstants';

export default function ProspectEditModal({ prospect, onClose, onDelete }) {
  const qc = useQueryClient();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConvertir, setShowConvertir] = useState(false);
  const [datesDemandees, setDatesDemandees] = useState([]);
  const [form, setForm] = useState({
    prenom: prospect?.prenom || '',
    nom: prospect?.nom || '',
    prenom2: prospect?.prenom2 || '',
    nom2: prospect?.nom2 || '',
    telephone: prospect?.telephone || '',
    telephone2: prospect?.telephone2 || '',
    email: prospect?.email || '',
    type_evenement: prospect?.type_evenement || '',
    date_type: prospect?.date_type || 'exacte',
    date_evenement_souhaitee: prospect?.date_evenement_souhaitee || '',
    date_mois: prospect?.date_mois || '',
    date_periode: prospect?.date_periode || '',
    nb_invites_estime: prospect?.nb_invites_estime || '',
    lieu_id: prospect?.lieu_id || '',
    lieu_nom: prospect?.lieu_nom || '',
    formule_id: prospect?.formule_id || '',
    formule_nom: prospect?.formule_nom || '',
    notes_visite: prospect?.notes_visite || '',
    source: prospect?.source || '',
    statut: prospect?.statut || 'Nouveau',
    lien_token: prospect?.lien_token || genToken(),
  });

  const { data: menus = [] } = useQuery({
    queryKey: ['menus-catalogue'],
    queryFn: () => base44.entities.CatalogueItem.filter({ section: 'tarifs', type_tarif: 'formule', actif: true }),
  });

  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list(),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prospect.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['prospects']); onClose(); },
  });

  const handleSelectLieu = (e) => {
    const id = e.target.value;
    if (!id) { set('lieu_id', ''); set('lieu_nom', ''); return; }
    const lieu = lieux.find(l => l.id === id);
    set('lieu_id', id);
    set('lieu_nom', lieu?.nom || '');
  };

  const handleSelectFormule = (e) => {
    const id = e.target.value;
    const menu = menus.find(m => m.id === id);
    set('formule_id', id);
    set('formule_nom', menu?.nom || '');
  };

  const handleSave = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) return;
    const data = {
      ...form,
      nom: capitalizeWords(form.nom),
      prenom: capitalizeWords(form.prenom),
      nb_invites_estime: form.nb_invites_estime ? parseInt(form.nb_invites_estime) : null,
    };

    const wasntSigned = prospect?.statut !== 'Signé';
    const nowSigned = form.statut === 'Signé';
    const notYetConverted = !prospect?.converti;

    if (wasntSigned && nowSigned && notYetConverted) {
      await base44.entities.Prospect.update(prospect.id, data);
      qc.invalidateQueries(['prospects']);
      const demandes = await base44.entities.ProspectDateDemande.filter({ prospect_id: prospect.id });
      const toutesLesDates = demandes.flatMap(d => d.dates_proposees || []).filter(Boolean);
      setDatesDemandees([...new Set(toutesLesDates)]);
      setShowConvertir(true);
      return;
    }

    updateMutation.mutate({ id: prospect.id, data });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Modifier le prospect</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
            <select value={form.statut} onChange={e => set('statut', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_DOTS[s]} {s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prénom *</label>
              <Input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom *</label>
              <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Dupont" />
            </div>
          </div>

          <details className="rounded-xl border border-border bg-muted/20">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted-foreground select-none">Détails (optionnel)</summary>
            <div className="px-3 pb-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">2ème personne</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={form.prenom2} onChange={e => set('prenom2', e.target.value)} placeholder="Prénom" />
                  <Input value={form.nom2} onChange={e => set('nom2', e.target.value)} placeholder="Nom de famille" />
                </div>
                <Input value={form.telephone2} onChange={e => set('telephone2', e.target.value)} placeholder="Téléphone 2ème personne" className="mt-2" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment nous a-t-il connu ?</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">— Choisir —</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone</label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@mail.com" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type d'événement</label>
            <select value={form.type_evenement} onChange={e => set('type_evenement', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">— Choisir —</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lieu souhaité</label>
            <select value={form.lieu_id} onChange={handleSelectLieu} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">— Autre / Non défini —</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}{l.ville ? ` · ${l.ville}` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date souhaitée</label>
            <div className="flex gap-1.5 mb-2">
              {[
                { id: 'exacte', label: '📅 Date exacte' },
                { id: 'mois', label: '🗓️ Mois' },
                { id: 'periode', label: '🌸 Période' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => set('date_type', opt.id)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${form.date_type === opt.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.date_type === 'exacte' && <Input type="date" value={form.date_evenement_souhaitee} onChange={e => set('date_evenement_souhaitee', e.target.value)} />}
            {form.date_type === 'mois' && (
              <div className="flex gap-2">
                <select value={form.date_mois ? form.date_mois.split('-')[1] : ''} onChange={e => { const year = form.date_mois ? form.date_mois.split('-')[0] : new Date().getFullYear(); set('date_mois', e.target.value ? `${year}-${e.target.value}` : ''); }} className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">— Mois —</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => <option key={m} value={m}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][i]}</option>)}
                </select>
                <select value={form.date_mois ? form.date_mois.split('-')[0] : ''} onChange={e => { const month = form.date_mois ? form.date_mois.split('-')[1] : '01'; set('date_mois', e.target.value ? `${e.target.value}-${month}` : ''); }} className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">— Année —</option>
                  {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {form.date_type === 'periode' && <Input value={form.date_periode} onChange={e => set('date_periode', e.target.value)} placeholder="Ex: Printemps 2028, Été 2027…" />}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nb invités estimé</label>
            <Input type="number" value={form.nb_invites_estime} onChange={e => set('nb_invites_estime', e.target.value)} placeholder="100" className="w-full" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Formule qui les intéresse</label>
            <select value={form.formule_id} onChange={handleSelectFormule} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">— Aucune —</option>
              {menus.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes de visite</label>
            <textarea value={form.notes_visite} onChange={e => set('notes_visite', e.target.value)} rows={3} placeholder="Impressions, demandes particulières…" className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button onClick={() => setShowConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 size={14} /> Supprimer
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.prenom.trim() || !form.nom.trim()}>Enregistrer</Button>
            </div>
          </div>
        </div>

        <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
              <AlertDialogDescription>Voulez-vous vraiment supprimer <strong>{form.prenom} {form.nom}</strong> ? Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDelete(prospect.id); setShowConfirmDelete(false); }}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {showConvertir && (
          <ConvertirProspectModal
            prospect={{ ...prospect, ...form }}
            datesDemandees={datesDemandees}
            onClose={() => { setShowConvertir(false); onClose(); }}
            onConverted={() => { setShowConvertir(false); onClose(); }}
          />
        )}
      </div>
    </div>
  );
}