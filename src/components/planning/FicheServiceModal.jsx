import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPES = ['Mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Cocktail', 'Gala', 'Autre'];

const NumberField = ({ label, fieldKey, value, onChange }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, (value || 0) - 1))}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold"
      >−</button>
      <span className="w-10 text-center font-semibold text-sm">{value || 0}</span>
      <button
        type="button"
        onClick={() => onChange((value || 0) + 1)}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold"
      >+</button>
    </div>
  </div>
);

export default function FicheServiceModal({ service, assignments, onClose }) {
  const qc = useQueryClient();

  const { data: existingFiches = [] } = useQuery({
    queryKey: ['fiches', service.id],
    queryFn: () => base44.entities.FicheService.filter({ service_id: service.id }),
  });

  const existing = existingFiches[0] || null;

  const [form, setForm] = useState({
    service_id: service.id,
    type_evenement: '',
    nom_client: '',
    telephone_client: '',
    email_client: '',
    nb_adultes: 0,
    nb_enfants: 0,
    nb_ados: 0,
    nb_prestataires: 0,
    tables_adultes: 0,
    tables_enfants: 0,
    tables_ados: 0,
    tables_prestataires: 0,
    heure_arrivee_staff: service.heure_debut || '',
    options_choisies: '',
    commentaire: '',
    envoyee: false,
  });

  useEffect(() => {
    if (existing) setForm(f => ({ ...f, ...existing }));
  }, [existing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buildEmailBody = (fiche) => {
    const dateStr = service.date ? format(parseISO(service.date), "EEEE d MMMM yyyy", { locale: fr }) : '—';
    const totalPers = (fiche.nb_adultes || 0) + (fiche.nb_enfants || 0) + (fiche.nb_ados || 0) + (fiche.nb_prestataires || 0);
    const totalTables = (fiche.tables_adultes || 0) + (fiche.tables_enfants || 0) + (fiche.tables_ados || 0) + (fiche.tables_prestataires || 0);

    return `Bonjour,

Veuillez trouver ci-dessous la fiche de service pour l'événement du ${dateStr}.

═══════════════════════════════
📋 FICHE DE SERVICE
═══════════════════════════════

🎉 Type d'événement : ${fiche.type_evenement || '—'}
👤 Client : ${fiche.nom_client || '—'}${fiche.telephone_client ? `\n📞 Tél. client : ${fiche.telephone_client}` : ''}

⏰ HORAIRES
- Heure d'arrivée du staff : ${fiche.heure_arrivee_staff || '—'}
- Horaires du service : ${service.heure_debut || '—'} → ${service.heure_fin || '—'}

👥 INVITÉS (total : ${totalPers})
- Adultes : ${fiche.nb_adultes || 0}
- Adolescents : ${fiche.nb_ados || 0}
- Enfants : ${fiche.nb_enfants || 0}
- Prestataires : ${fiche.nb_prestataires || 0}

🪑 PLAN DE SALLE (${totalTables} tables)
- Tables adultes : ${fiche.tables_adultes || 0}
- Tables ados : ${fiche.tables_ados || 0}
- Tables enfants : ${fiche.tables_enfants || 0}
- Tables prestataires : ${fiche.tables_prestataires || 0}

${fiche.options_choisies ? `✅ OPTIONS / MENUS\n${fiche.options_choisies}\n` : ''}
${fiche.commentaire ? `💬 COMMENTAIRES\n${fiche.commentaire}\n` : ''}
═══════════════════════════════

Consultez votre espace Mon Planning pour plus de détails.
Bonne journée !`;
  };

  const saveMutation = useMutation({
    mutationFn: async (shouldSend) => {
      let fiche;
      if (existing) {
        fiche = await base44.entities.FicheService.update(existing.id, form);
      } else {
        fiche = await base44.entities.FicheService.create(form);
      }
      if (shouldSend) {
        const emailBody = buildEmailBody(form);
        for (const a of assignments) {
          if (a.extra_email) {
            await base44.integrations.Core.SendEmail({
              to: a.extra_email,
              subject: `📋 Fiche de service — ${form.type_evenement || 'Événement'} du ${service.date}`,
              body: `Bonjour ${a.extra_nom},\n\n${emailBody}`,
            });
          }
        }
        await base44.entities.FicheService.update(fiche.id, { envoyee: true });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['fiches']);
      onClose();
    },
  });

  const totalPersonnes = (form.nb_adultes || 0) + (form.nb_enfants || 0) + (form.nb_ados || 0) + (form.nb_prestataires || 0);
  const totalTables = (form.tables_adultes || 0) + (form.tables_enfants || 0) + (form.tables_ados || 0) + (form.tables_prestataires || 0);
  const extrasAvecEmail = assignments.filter(a => a.extra_email).length;

  const personnesFields = [
    { key: 'nb_adultes', label: 'Adultes' },
    { key: 'nb_ados', label: 'Ados' },
    { key: 'nb_enfants', label: 'Enfants' },
    { key: 'nb_prestataires', label: 'Prestataires' },
  ];

  const tablesFields = [
    { key: 'tables_adultes', label: 'Table adultes' },
    { key: 'tables_ados', label: 'Table ados' },
    { key: 'tables_enfants', label: 'Table enfants' },
    { key: 'tables_prestataires', label: 'Table prestataires' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h3 className="font-semibold text-lg">Fiche de service</h3>
            {existing?.envoyee && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Envoyée</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Événement */}
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Événement</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type d'événement</Label>
                <Select value={form.type_evenement} onValueChange={v => set('type_evenement', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Heure d'arrivée du staff</Label>
                <Input type="time" value={form.heure_arrivee_staff} onChange={e => set('heure_arrivee_staff', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Client */}
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fiche client</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nom du client / famille</Label>
                <Input value={form.nom_client} onChange={e => set('nom_client', e.target.value)} placeholder="Famille Dupont" />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.telephone_client} onChange={e => set('telephone_client', e.target.value)} placeholder="06 00 00 00 00" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email_client} onChange={e => set('email_client', e.target.value)} placeholder="client@mail.com" />
              </div>
            </div>
          </section>

          {/* Nombre de personnes */}
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Nombre de personnes <span className="text-primary font-bold">({totalPersonnes} total)</span>
            </h4>
            <div className="grid grid-cols-4 gap-4">
              {personnesFields.map(({ key, label }) => (
                <NumberField key={key} label={label} fieldKey={key} value={form[key]} onChange={v => set(key, v)} />
              ))}
            </div>
          </section>

          {/* Plan de salle */}
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Plan de salle <span className="text-primary font-bold">({totalTables} tables)</span>
            </h4>
            <div className="grid grid-cols-4 gap-4">
              {tablesFields.map(({ key, label }) => (
                <NumberField key={key} label={label} fieldKey={key} value={form[key]} onChange={v => set(key, v)} />
              ))}
            </div>
          </section>

          {/* Options & Commentaires */}
          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations complémentaires</h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Options / Menu choisi</Label>
                <textarea
                  value={form.options_choisies}
                  onChange={e => set('options_choisies', e.target.value)}
                  placeholder="Cocktail dînatoire, menu 3 plats, allergies..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Commentaire libre</Label>
                <textarea
                  value={form.commentaire}
                  onChange={e => set('commentaire', e.target.value)}
                  placeholder="Consignes particulières, informations complémentaires..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 border-t border-border pt-4 flex flex-col gap-3">
          {extrasAvecEmail > 0 && (
            <p className="text-xs text-muted-foreground">
              📧 {extrasAvecEmail} extra{extrasAvecEmail > 1 ? 's' : ''} avec email sur {assignments.length} assigné{assignments.length > 1 ? 's' : ''}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              onClick={() => saveMutation.mutate(true)}
              disabled={saveMutation.isPending || extrasAvecEmail === 0}
              className="gap-2"
            >
              <Send size={14} />
              {saveMutation.isPending ? 'Envoi...' : `Enregistrer & Envoyer (${extrasAvecEmail})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}