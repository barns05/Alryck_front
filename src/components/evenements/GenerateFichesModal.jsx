import { useState, useEffect } from 'react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, FileText, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Users, MessageSquare, Save, Clock } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SECTION_LABELS } from '@/components/bibliotheque/BlocFichesService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DESTINATAIRE_LABELS = {
  extras_salle: '👥 Extras Salle',
  extras_cuisine: '👨‍🍳 Extras Cuisine',
  prestataires: '🎯 Prestataires',
  responsable_soir: '👔 Responsable du soir',
  tous: '🌐 Tous',
};

export default function GenerateFichesModal({ evenement, onClose }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [etape, setEtape] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [consignes, setConsignes] = useState({});
  const [consigneGlobale, setConsigneGlobale] = useState('');
  const [joursAvant, setJoursAvant] = useState(null); // null = pas encore chargé depuis settings
  const [heureEnvoi, setHeureEnvoi] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const { data: modeles = [], isLoading } = useQuery({
    queryKey: ['modeles-fiche-service'],
    queryFn: () => base44.entities.ModeleFicheService.list(),
  });

  // Fiches déjà existantes pour cet événement
  const { data: fichesExistantes = [] } = useQuery({
    queryKey: ['fiches', evenement.id],
    queryFn: () => base44.entities.FicheService.filter({ evenement_id: evenement.id }),
  });

  // Paramètres d'envoi depuis Mon entreprise (pré-remplissage)
  const { settings: _ownerSettings } = useOwnerCompanySettings();
  useEffect(() => {
    if (joursAvant === null && _ownerSettings) {
      setJoursAvant(_ownerSettings.fiche_envoi_jours_avant ?? 1);
      setHeureEnvoi(_ownerSettings.fiche_envoi_heure ?? '09:00');
    }
  }, [_ownerSettings, joursAvant]);

  // Valeurs affichées (fallback si settings pas encore chargés)
  const joursAvantVal = joursAvant ?? 1;
  const heureEnvoiVal = heureEnvoi ?? '09:00';

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedModeles = modeles.filter(m => selected.has(m.id));

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);

    for (const modele of selectedModeles) {
      const contenu = {};
      if (modele.sections?.infos_evenement) {
        contenu.nom = evenement.nom;
        contenu.date = evenement.date;
        contenu.lieu = evenement.lieu_nom || '';
        contenu.heure_debut = evenement.heure_debut || '';
        contenu.heure_fin = evenement.heure_fin || '';
      }
      if (modele.sections?.programme) contenu.programme = evenement.programme_journee || [];
      if (modele.sections?.nb_couverts) contenu.nb_invites = evenement.nb_invites || 0;
      if (modele.sections?.menu) contenu.menu = evenement.menu || {};
      if (modele.sections?.allergies) contenu.allergies = '';
      if (modele.sections?.tenue) contenu.tenue = '';
      if (modele.sections?.heure_prise_poste) contenu.heure_prise_poste = '';
      if (modele.sections?.plan_salle) contenu.plan_table_url = evenement.plan_table_url || '';
      if (modele.sections?.coordonnees_urgence) contenu.coordonnees_urgence = evenement.client_telephone || '';
      if (modele.sections?.responsable_soir) contenu.responsable_soir = '';
      if (modele.sections?.infos_logistiques) contenu.infos_logistiques = '';

      const consigneFinale = [consigneGlobale, consignes[modele.id] || ''].filter(Boolean).join('\n');
      const existante = fichesExistantes.find(f => f.modele_id === modele.id);

      if (existante) {
        await base44.entities.FicheService.update(existante.id, {
          contenu,
          consigne: consigneFinale,
          statut: 'Prete',
          envoi_jours_avant: joursAvantVal,
          envoi_heure: heureEnvoiVal,
          date_generation: new Date().toISOString(),
        });
      } else {
        await base44.entities.FicheService.create({
          evenement_id: evenement.id,
          evenement_nom: evenement.nom,
          evenement_date: evenement.date,
          evenement_lieu: evenement.lieu_nom || '',
          modele_id: modele.id,
          modele_nom: modele.nom,
          type: 'custom',
          contenu,
          consigne: consigneFinale,
          statut: 'Prete',
          envoi_jours_avant: joursAvantVal,
          envoi_heure: heureEnvoiVal,
          destinataires: (modele.destinataires || []).map(d => ({ type: d, actif: true, envoye: false, vue: false })),
          date_generation: new Date().toISOString(),
        });
      }
    }

    qc.invalidateQueries({ queryKey: ['fiches', evenement.id] });
    setSaving(false);
    setDone(true);
    toast({ title: `✅ Fiches prêtes — envoi J-${joursAvantVal} à ${heureEnvoiVal}` });
    setTimeout(onClose, 2000);
  };

  // Calcul de la date d'envoi prévisionnelle
  const dateEnvoiPrevue = (() => {
    if (!evenement.date) return `J-${joursAvantVal} à ${heureEnvoiVal}`;
    const d = new Date(evenement.date);
    d.setDate(d.getDate() - joursAvantVal);
    return format(d, "EEEE d MMMM yyyy", { locale: fr }) + ` à ${heureEnvoiVal}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg">📋 Fiches de service</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Progress steps */}
        <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            {[
              { num: 1, label: 'Fiches & équipes', icon: Users },
              { num: 2, label: 'Consignes', icon: MessageSquare },
              { num: 3, label: 'Envoi', icon: Clock },
              { num: 4, label: 'Enregistrer', icon: Save },
            ].map((step) => (
              <div key={step.num} className="flex-1 flex flex-col items-center">
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  etape === step.num
                    ? 'bg-primary text-white shadow-lg scale-105'
                    : etape > step.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <step.icon size={14} />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
            style={{ width: `${((etape - 1) / 3) * 100}%` }}
          />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* ÉTAPE 1 — Choix des fiches */}
          {etape === 1 && (
            <div className="space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && modeles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucun modèle de fiche</p>
                  <p className="text-xs mt-1">Créez d'abord des modèles dans la Bibliothèque</p>
                </div>
              )}
              {!isLoading && modeles.length > 0 && (
                <>
                  {fichesExistantes.some(f => f.statut === 'Envoyee' || f.statut === 'Vue') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      ⚠️ <strong>Des fiches ont déjà été envoyées.</strong> Modifier et enregistrer renverra une version mise à jour aux équipes.
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Sélectionnez quels modèles envoyer à quelles équipes :</p>
                  {modeles.map(m => {
                    const existante = fichesExistantes.find(f => f.modele_id === m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          selected.has(m.id) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)}
                          className="w-4 h-4 accent-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{m.nom}</p>
                            {existante && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                existante.statut === 'Prete' ? 'bg-emerald-100 text-emerald-700' :
                                existante.statut === 'Envoyee' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {existante.statut === 'Prete' ? '🟢 Prête' : existante.statut === 'Envoyee' ? '📤 Envoyée' : '🔵 Générée'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(m.destinataires || []).map(d => (
                              <span key={d} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                {DESTINATAIRE_LABELS[d] || d}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.sections && Object.entries(m.sections).filter(([, v]) => v).map(([k]) => (
                              <span key={k} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                {SECTION_LABELS[k]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ÉTAPE 2 — Consignes */}
          {etape === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">📝 Consigne globale (optionnel)</label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">S'applique à toutes les fiches sélectionnées</p>
                <textarea
                  value={consigneGlobale}
                  onChange={e => setConsigneGlobale(e.target.value)}
                  rows={3}
                  placeholder="ex: Tenue : chemise blanche et pantalon noir obligatoire"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Consignes spécifiques par fiche (optionnel)</p>
                {selectedModeles.map(m => (
                  <div key={m.id}>
                    <label className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                      <FileText size={12} className="text-primary" />
                      {m.nom}
                    </label>
                    <textarea
                      value={consignes[m.id] || ''}
                      onChange={e => setConsignes(prev => ({ ...prev, [m.id]: e.target.value }))}
                      rows={2}
                      placeholder="ex: Entrée par le portail latéral uniquement"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Paramètres d'envoi */}
          {etape === 3 && !done && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5"><Clock size={14} className="text-primary" /> Délai d'envoi</p>
                <p className="text-xs text-muted-foreground mb-3">Pré-rempli depuis vos paramètres d'entreprise. Modifiable ici pour cet événement uniquement.</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Envoyer</span>
                  <span className="text-sm font-semibold">J -</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={joursAvantVal}
                    onChange={e => setJoursAvant(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1.5 text-sm rounded-lg border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  />
                  <span className="text-sm text-muted-foreground">jour{joursAvantVal > 1 ? 's' : ''} avant l'événement</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">🕘 Heure d'envoi</p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={heureEnvoiVal}
                    onChange={e => setHeureEnvoi(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-medium text-blue-800">📅 Envoi automatique prévu :</p>
                <p className="text-sm font-semibold text-blue-700 mt-0.5 capitalize">{dateEnvoiPrevue}</p>
                <p className="text-[11px] text-blue-600 mt-1">Vous pouvez aussi envoyer manuellement à tout moment</p>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Confirmation */}
          {etape === 4 && !done && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-emerald-800 mb-1">✅ Récapitulatif</p>
                <p className="text-2xl font-bold text-emerald-700">{selected.size} fiche{selected.size > 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2">
                {selectedModeles.map(m => (
                  <div key={m.id} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-sm font-semibold">{m.nom}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(m.destinataires || []).map(d => (
                        <span key={d} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {DESTINATAIRE_LABELS[d] || d}
                        </span>
                      ))}
                    </div>
                    {(consigneGlobale || consignes[m.id]) && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        📝 {[consigneGlobale, consignes[m.id]].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-medium text-blue-800">📅 Envoi automatique prévu :</p>
                <p className="text-sm font-semibold text-blue-700 mt-0.5 capitalize">{dateEnvoiPrevue}</p>
                <p className="text-[11px] text-blue-600 mt-1">Vous pouvez aussi envoyer manuellement à tout moment</p>
              </div>
            </div>
          )}

          {done && (
            <div className="py-4">
              <AmandaMessage
                type="success"
                message={`Les fiches de service sont prêtes ! Envoi automatique programmé ${dateEnvoiPrevue}.`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="p-5 border-t border-border shrink-0 flex gap-3">
            {etape > 1 && (
              <Button variant="outline" onClick={() => setEtape(e => e - 1)} className="h-11 px-5">
                <ChevronLeft size={16} /> Retour
              </Button>
            )}
            {etape < 4 ? (
              <Button onClick={() => setEtape(e => e + 1)} disabled={etape === 1 && selected.size === 0}
                className="flex-1 h-11 gap-2">
                Suivant <ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-11 gap-2 bg-emerald-600 hover:bg-emerald-700">
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                ) : (
                  <><Save size={16} /> Enregistrer</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}