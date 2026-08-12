/**
 * Section "Mon formulaire" dans l'espace client.
 * Expérience "une question à la fois" — épurée, mobile-first, avec sauvegarde auto.
 * Supporte la logique conditionnelle pour afficher/masquer les questions.
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, CheckCircle2, Lock, Loader2, Upload, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { filterChampsVisibles, isChampVisible } from '@/lib/conditionEngine';
import { useOptionsPrestationsChamp } from '@/hooks/useOptionsPrestationsChamp';
import { useFormulesPivot } from '@/hooks/useFormulesPivot';
import OptionsGroupedField from '@/components/formulaire/OptionsGroupedField';
import { sortChampsUniversel } from '@/lib/formulaireUniverselOrdre';


/* ─── Composant d'input par type ───────────────────────────────────────────── */
function ChampInput({ champ, valeur, onChange, disabled, formuleChoisie, choixMenu }) {
  const base = "w-full rounded-2xl border-2 border-input bg-background text-base focus:outline-none focus:border-primary px-4 py-3 transition-colors";

  // Séparateur de bloc : rendu spécial, pas d'input
  if (champ._separateur) {
    return (
      <div className="py-2 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{champ.label}</p>
      </div>
    );
  }

  switch (champ.type) {
    case 'texte':
      return <textarea value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} rows={4} placeholder={champ.description || 'Votre réponse…'} className={`${base} resize-none`} />;
    case 'nombre':
      return <input type="number" value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="0" className={base} />;
    case 'date':
      return <input type="date" value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={base} />;
    case 'cases_a_cocher':
      return (
        <div className="space-y-3">
          {(champ.options || []).map((opt, i) => {
            const checked = (valeur || []).includes(opt);
            return (
              <label key={i} className={`flex items-center gap-3 cursor-pointer rounded-2xl border-2 px-4 py-3 transition-all ${checked ? 'border-primary bg-primary/5' : 'border-input bg-background hover:border-primary/40'}`}>
                <input type="checkbox" checked={checked} disabled={disabled}
                  onChange={e => {
                    const arr = valeur || [];
                    onChange(e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt));
                  }}
                  className="rounded accent-primary w-4 h-4"
                />
                <span className="text-base">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    case 'choix_unique':
      return (
        <div className="space-y-3">
          {(champ.options || []).map((opt, i) => (
            <label key={i} className={`flex items-center gap-3 cursor-pointer rounded-2xl border-2 px-4 py-3 transition-all ${valeur === opt ? 'border-primary bg-primary/5' : 'border-input bg-background hover:border-primary/40'}`}>
              <input type="radio" name={`champ-${champ.id}`} value={opt} checked={valeur === opt} disabled={disabled}
                onChange={() => onChange(opt)}
                className="accent-primary w-4 h-4"
              />
              <span className="text-base">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'oui_non':
      return (
        <div className="flex gap-3">
          {['Oui', 'Non'].map(opt => (
            <label key={opt} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-2xl border-2 px-4 py-3 transition-all ${valeur === opt ? 'border-primary bg-primary/5 font-semibold' : 'border-input bg-background hover:border-primary/40'}`}>
              <input type="radio" name={`champ-${champ.id}`} value={opt} checked={valeur === opt} disabled={disabled} onChange={() => onChange(opt)} className="accent-primary w-4 h-4" />
              <span className="text-base">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'heure':
      return <input type="time" value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={base} />;
    case 'liste':
      return (
        <select value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={base}>
          <option value="">— Sélectionner</option>
          {(champ.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      );
    case 'options_grouped':
      return <OptionsGroupedField champ={champ} value={valeur} onChange={onChange} disabled={disabled} formuleChoisie={formuleChoisie} choixMenu={choixMenu} />;
    case 'upload':
      if (valeur) {
        return (
          <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-sm flex-1 truncate">Fichier envoyé</span>
            <a href={valeur} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Voir</a>
          </div>
        );
      }
      return (
        <label className={`cursor-pointer block ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <input type="file" className="hidden" onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onChange(file_url);
          }} />
          <div className="flex flex-col items-center gap-2 border-2 border-dashed border-primary/30 rounded-2xl py-8 px-4 text-primary hover:border-primary/60 hover:bg-primary/5 transition-colors">
            <Upload size={28} />
            <span className="text-sm font-medium">Cliquer pour uploader un fichier</span>
          </div>
        </label>
      );
    default:
      return <input type="text" value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={base} />;
  }
}

/* ─── Modale de confirmation d'envoi ───────────────────────────────────────── */
function ConfirmSendModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl border border-border shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">📬</div>
          <h3 className="font-bold text-lg">Envoyer mon questionnaire ?</h3>
          <p className="text-sm text-muted-foreground">Une fois envoyé, vous ne pourrez plus modifier vos réponses.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</> : '✅ Oui, envoyer'}
          </button>
          <button onClick={onCancel} disabled={loading} className="w-full py-3 rounded-2xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Composant principal ───────────────────────────────────────────────────── */
export default function FormulaireClientSection({ evenement }) {
  const qc = useQueryClient();
  const [reponses, setReponses] = useState(null);
  const [indexCourant, setIndexCourant] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingIndex, setSavingIndex] = useState(null);

  const { data: formulaires = [], isLoading } = useQuery({
    queryKey: ['formulaire-client', evenement.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id }),
  });

  const formulaire = formulaires.find(f => ['Envoyé', 'En cours', 'Complété', 'Clôturé'].includes(f.statut)) || null;
  const reponsesLocal = reponses || formulaire?.reponses || {};

  // Champ groupé Options & Prestations (via hook partagé)
  // Priorité : réponse client → type de l'événement (valeur organisateur)
  // undefined = affiche uniquement les universelles ; jamais null
  const typeEvenementPourOptions = reponsesLocal?.['f-pivot-type'] || evenement?.type_evenement;
  const { champOptions } = useOptionsPrestationsChamp(typeEvenementPourOptions);
  const { filtrerOptionsFormule } = useFormulesPivot();

  // Fusion : questions fixes + bloc Options & Prestations, puis tri canonique
  const tousLesChamps = useMemo(() => {
    const fixes = [...(formulaire?.champs || []), ...champOptions];
    return sortChampsUniversel(fixes);
  }, [formulaire?.champs, champOptions]);

  // Tous les hooks doivent être appelés inconditionnellement
  const champsVisibles = useMemo(() => {
    return filterChampsVisibles(tousLesChamps, reponsesLocal, true);
  }, [tousLesChamps, reponsesLocal]);

  // Filtrage dynamique des options du pivot formule selon le type d'événement choisi
  // (doit être avant tout early return — règles des hooks)
  const typeChoisiPourPivot = reponsesLocal?.['f-pivot-type'];
  const champRawPivot = champsVisibles[indexCourant];
  const champAvecOptionsFiltrees = useMemo(() => {
    if (!champRawPivot) return champRawPivot;
    const isPivotFormule = champRawPivot.id === 'f-pivot-formule' || champRawPivot.id === 'formule_choisie';
    if (!isPivotFormule || !champRawPivot.options?.length) return champRawPivot;
    const optionsFiltrees = filtrerOptionsFormule(champRawPivot.options, typeChoisiPourPivot);
    return { ...champRawPivot, options: optionsFiltrees };
  }, [champRawPivot, typeChoisiPourPivot, filtrerOptionsFormule]);

  // Ajuster l'index si le champ courant devient invisible suite à un changement de réponse
  useEffect(() => {
    if (champsVisibles.length > 0 && indexCourant >= champsVisibles.length) {
      setIndexCourant(champsVisibles.length - 1);
    }
  }, [champsVisibles.length]);

  useEffect(() => {
    if (formulaire && reponses === null) {
      const rep = formulaire.reponses || {};
      setReponses(rep);
      const champsVis = tousLesChamps.filter(c => isChampVisible(c, rep));
      const dernier = champsVis.findIndex(c => {
        const v = rep[c.id];
        return v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
      });
      setIndexCourant(dernier >= 0 ? dernier : champsVis.length - 1);
    }
  }, [formulaire?.id]);

  const sauvegarderReponse = useMutation({
    mutationFn: (reponsesAJour) => base44.entities.FormulairePreparation.update(formulaire.id, {
      reponses: reponsesAJour,
      statut: 'En cours',
    }),
    onSuccess: () => qc.invalidateQueries(['formulaire-client', evenement.id]),
  });

  const syncEvenement = async (reponses) => {
    const updates = {};

    const setNum = (key, champId) => {
      const val = reponses[champId];
      if (val !== undefined && val !== '' && val !== null) {
        const n = Number(val);
        if (!isNaN(n)) updates[key] = n;
      }
    };
    const setStr = (key, champId) => {
      const val = reponses[champId];
      if (val !== undefined && val !== '' && val !== null) updates[key] = val;
    };

    setNum('nb_adultes',      'f-gen-adultes');
    setNum('nb_adolescents',  'f-gen-ados');
    setNum('nb_enfants',      'f-gen-enfants');
    setNum('nb_prestataires', 'f-gen-prest-nb');
    setStr('formule_nom',     'f-pivot-formule');
    setStr('type_evenement',  'f-pivot-type');
    setStr('heure_debut',     'f-gen-heure-invites');
    setStr('notes_contrat',   'f-com-infos-supp');

    const adultes     = Number(reponses['f-gen-adultes'])   || 0;
    const adolescents = Number(reponses['f-gen-ados'])      || 0;
    const enfants     = Number(reponses['f-gen-enfants'])   || 0;
    const totalInvites = adultes + adolescents + enfants;
    if (totalInvites > 0) updates.nb_invites = totalInvites;

    if (Object.keys(updates).length > 0 && formulaire.evenement_id) {
      await base44.entities.Evenement.update(formulaire.evenement_id, updates);
    }
  };

  const soumettre = useMutation({
    mutationFn: async () => {
      await base44.entities.FormulairePreparation.update(formulaire.id, {
        reponses: reponsesLocal,
        statut: 'Complété',
        date_soumission: new Date().toISOString(),
      });
      await syncEvenement(reponsesLocal);
      await base44.entities.Notification.create({
        titre: '📋 Questionnaire complété',
        message: `Le questionnaire de préparation de ${evenement.client_nom || 'votre client'} pour "${evenement.nom}" a été soumis.`,
        type: 'evenement',
        lu: false,
      });
    },
    onSuccess: () => {
      setShowConfirm(false);
      qc.invalidateQueries(['formulaire-client', evenement.id]);
    },
  });

  const setReponse = (id, val) => setReponses(r => ({ ...(r || {}), [id]: val }));

  if (isLoading || !formulaire) return null;

  const isClose = ['Complété', 'Clôturé'].includes(formulaire.statut);

  if (tousLesChamps.length === 0) return null;

  const total = champsVisibles.length;
  const champ = champAvecOptionsFiltrees;
  const valeurCourante = reponsesLocal[champ?.id];
  const isRempli = valeurCourante !== undefined && valeurCourante !== '' && !(Array.isArray(valeurCourante) && valeurCourante.length === 0);
  const isObligatoire = champ?.obligatoire && !champ?._separateur;
  const peutAvancer = !isObligatoire || isRempli || !!champ?._separateur;
  const estDerniere = indexCourant === total - 1;

   const formuleChoisie = reponsesLocal?.['f-pivot-formule'] || null;
   const choixMenu = Object.entries(reponsesLocal || {})
     .filter(([key, val]) => 
       key.startsWith('f-choix-') && 
       typeof val === 'string' && 
       val.trim() !== ''
     )
     .map(([, val]) => val);

   const champsRemplis = champsVisibles.filter(c => {
    const v = reponsesLocal[c.id];
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;

  const joursRestants = formulaire.date_limite
    ? differenceInDays(parseISO(formulaire.date_limite), new Date())
    : null;

  const allerSuivant = async () => {
    // Sauvegarde auto
    const rep = { ...reponsesLocal };
    setSavingIndex(indexCourant);
    await sauvegarderReponse.mutateAsync(rep);
    setSavingIndex(null);
    if (!estDerniere) setIndexCourant(i => i + 1);
    else setShowConfirm(true);
  };

  /* ── Formulaire complété ── */
  if (isClose) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-primary" />
          <h3 className="font-semibold text-base">Mon questionnaire de préparation</h3>
          <Lock size={14} className="text-muted-foreground ml-auto" />
        </div>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="text-5xl">🎉</div>
          <p className="font-semibold text-lg text-emerald-700">Questionnaire envoyé !</p>
          <p className="text-sm text-muted-foreground">Merci ! Nous avons bien reçu vos réponses.</p>
          {formulaire.date_soumission && (
            <p className="text-xs text-muted-foreground">Envoyé le {format(parseISO(formulaire.date_soumission), 'd MMMM yyyy', { locale: fr })}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">

      {/* Note d'introduction si c'est un modèle exemple */}
      {formulaire.note_intro && (
        <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">⭐ {formulaire.note_intro}</p>
        </div>
      )}

      {/* Notification délai */}
      {joursRestants !== null && (
        <div className={`px-5 py-3 text-xs font-medium flex items-center gap-2 ${joursRestants <= 2 ? 'bg-red-50 text-red-700' : 'bg-primary/5 text-primary'}`}>
          <Clock size={13} />
          {joursRestants > 0
            ? `Il vous reste ${joursRestants} jour${joursRestants > 1 ? 's' : ''} pour répondre`
            : joursRestants === 0 ? "Dernier jour pour répondre !" : "Délai de réponse dépassé"
          }
          {formulaire.date_limite && ` — avant le ${format(parseISO(formulaire.date_limite), 'd MMMM yyyy', { locale: fr })}`}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Question {indexCourant + 1} sur {total}</span>
            <span className="text-muted-foreground text-xs">{champsRemplis} répondu{champsRemplis > 1 ? 's' : ''}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="rounded-full h-2 bg-primary transition-all duration-500"
              style={{ width: `${((indexCourant + 1) / total) * 100}%` }}
            />
          </div>
          {/* Points de navigation */}
          <div className="flex gap-1.5 flex-wrap">
            {champsVisibles.map((c, i) => {
              const v = reponsesLocal[c.id];
              const rempli = v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
              return (
                <button
                  key={i}
                  onClick={() => setIndexCourant(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === indexCourant ? 'bg-primary w-5' :
                    rempli ? 'bg-emerald-400' : 'bg-muted-foreground/30'
                  }`}
                />
              );
            })}
          </div>
          </div>

         {/* Question */}
         <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold leading-snug">
              {champ.label}
              {champ.obligatoire && <span className="text-red-500 ml-1 text-base">*</span>}
            </h4>
            {champ.description && (
              <p className="text-sm text-muted-foreground">{champ.description}</p>
            )}
          </div>

          <ChampInput
            champ={champ}
            valeur={valeurCourante}
            onChange={val => setReponse(champ.id, val)}
            disabled={false}
            formuleChoisie={formuleChoisie}
            choixMenu={choixMenu}
          />

          {isObligatoire && !isRempli && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <span>⚠️</span> Cette question est obligatoire
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setIndexCourant(i => i - 1)}
            disabled={indexCourant === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} /> Précédent
          </button>

          <button
            onClick={allerSuivant}
            disabled={!peutAvancer || savingIndex === indexCourant}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none ${
              estDerniere
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {savingIndex === indexCourant
              ? <><Loader2 size={15} className="animate-spin" /> Sauvegarde…</>
              : estDerniere
                ? <><Send size={15} /> Envoyer mon questionnaire</>
                : <>Suivant <ChevronRight size={16} /></>
            }
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmSendModal
          onConfirm={() => soumettre.mutate()}
          onCancel={() => setShowConfirm(false)}
          loading={soumettre.isPending}
        />
      )}
    </div>
  );
}