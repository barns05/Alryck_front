import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useModules } from '@/hooks/useModules';
import { Check, ChevronLeft, Settings, MapPin, Users, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeEvenementDate } from '@/lib/evenementDate';
import { gererChangementDate } from '@/lib/propositionDate';

const TYPES = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];

const TACHES_DEF = [
  { key: 'formulaire',    label: 'Formulaire de préparation', emoji: '📝', hasModele: true },
  { key: 'programme',     label: 'Programme de la journée',   emoji: '📋', hasModele: true },
  { key: 'menu',          label: 'Menu / Formule',            emoji: '🍽️', hasModele: true },
  { key: 'plan_table',    label: 'Plan de table',             emoji: '🗺️', hasModele: true },
  { key: 'fiche_service', label: 'Fiche de service',          emoji: '🗒️', hasModele: true },
  { key: 'equipe_extras', label: 'Extras & planning',         emoji: '👥', hasModele: false },
  { key: 'logistique',    label: 'Logistique & Livraisons',   emoji: '📦', hasModele: false,
    description: ['Choisir le type de prestation', 'Assigner véhicule et chauffeur si livraison', 'Vérifier la checklist matériel'],
    moduleKey: 'logistique' },
];

function SectionTitle({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{number}</div>
      <div>
        <h3 className="font-bold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="text-xs font-medium text-muted-foreground mb-1 block">{children}</label>;
}

export default function ConfigurerEvenement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const modules = useModules();
  const urlParams = new URLSearchParams(window.location.search);
  const evenementId = urlParams.get('id');

  const [evenement, setEvenement] = useState(null);
  const [saving, setSaving] = useState(false);

  // Bloc 1 — infos
  const [infos, setInfos] = useState({});

  // Bloc 2 — tâches
  const [taches, setTaches] = useState({});
  const [modeles, setModeles] = useState({});

  // Bloc 3 — lieux & prestataires (multi-sélection)
  // [{id, nom, ville?, isDefault}]
  const [lieuxAssocies, setLieuxAssocies] = useState([]);
  // [{id, nom, domaine?, isDefault}]
  const [prestataireAssocies, setPrestataireAssocies] = useState([]);
  const [showLieuPicker, setShowLieuPicker] = useState(false);
  const [showPrestatairePicker, setShowPrestatairePicker] = useState(false);

  // Données bibliothèque
  const { data: modelesFormulaires = [] } = useQuery({ queryKey: ['modeles-formulaires'], queryFn: () => base44.entities.ModeleFormulaire.list() });
  const { data: modelesProgram = [] } = useQuery({ queryKey: ['modeles-programme'], queryFn: () => base44.entities.ModeleProgramme.list() });
  const { data: menus = [] } = useQuery({ queryKey: ['menus-catalogue'], queryFn: () => base44.entities.MenuCatalogue.list() });
  const { data: plansTable = [] } = useQuery({ queryKey: ['plans-salle'], queryFn: () => base44.entities.PlanSalle.list() });
  const { data: modelsFiche = [] } = useQuery({ queryKey: ['modeles-fiche'], queryFn: () => base44.entities.ModeleFicheService.list() });
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });
  const { data: prestataires = [] } = useQuery({ queryKey: ['prestataires'], queryFn: () => base44.entities.Prestataire.list() });
  const { data: effectifSettings = [] } = useQuery({ queryKey: ['effectif-settings'], queryFn: () => base44.entities.EffectifSettings.list() });
  const { data: prospects = [] } = useQuery({ queryKey: ['prospects'], queryFn: () => base44.entities.Prospect.list() });

  useEffect(() => {
    if (!evenementId) { navigate('/Evenements'); return; }
    base44.entities.Evenement.filter({ id: evenementId }).then(async res => {
      const ev = res[0];
      if (!ev) { navigate('/Evenements'); return; }
      setEvenement(ev);

      // Pré-remplir depuis la fiche prospect si disponible
      const prospect = prospects.find(p => p.evenement_id === ev.id);

      setInfos({
        nom: ev.nom || '',
        type_evenement: ev.type_evenement || prospect?.type_evenement || '',
        date: ev.date || '',
        date_type: ev.date_type || 'exacte',
        date_mois: ev.date_mois || '',
        date_periode: ev.date_periode || '',
        heure_debut: ev.heure_debut || '',
        heure_fin: ev.heure_fin || '',
        client_nom: ev.client_nom || '',
        client_email: ev.client_email || '',
        client_telephone: ev.client_telephone || '',
        nb_adultes: ev.nb_adultes ?? '',
        nb_adolescents: ev.nb_adolescents ?? '',
        nb_enfants: ev.nb_enfants ?? '',
        nb_prestataires: ev.nb_prestataires ?? '',
        formule_id: ev.formule_id || prospect?.formule_id || '',
        formule_nom: ev.formule_nom || prospect?.formule_nom || '',
        options_validees: ev.options_validees || prospect?.notes_visite || '',
        notes_contrat: ev.notes_contrat || '',
        budget: ev.budget || '',
      });

      // Tâches selon config ou type d'événement
      const defaut = ev.taches_requises || {};
      const setting = effectifSettings.find(s => s.type_evenement === (ev.type_evenement || prospect?.type_evenement));
      const tachesInit = {};
      TACHES_DEF.forEach(t => {
        tachesInit[t.key] = defaut[t.key] !== undefined ? defaut[t.key] : true;
      });
      setTaches(tachesInit);
      setModeles(ev.modeles_config || {});

      // Pré-remplir lieux & prestataires par défaut selon le type
      const typeEv = ev.type_evenement || prospect?.type_evenement || '';

      // Charger lieux et prestataires en parallèle pour les defaults
      const [allLieux, allPrestataires, lieuxEvent, prestataireEvent] = await Promise.all([
        base44.entities.Lieu.list(),
        base44.entities.Prestataire.list(),
        base44.entities.LieuEvenement.filter({ evenement_id: ev.id }),
        base44.entities.EvenementPrestataire ? base44.entities.EvenementPrestataire.filter({ evenement_id: ev.id }) : Promise.resolve([]),
      ]);

      // Lieux : d'abord les lieux déjà associés, puis ajouter les defaults manquants
      const lieuxInit = [];
      // Lieux déjà associés à l'événement
      lieuxEvent.forEach(le => {
        const l = allLieux.find(x => x.id === le.lieu_id);
        if (l) lieuxInit.push({ id: l.id, nom: l.nom, ville: l.ville, type: le.type, isDefault: false });
      });
      // Si aucun lieu associé, pré-remplir avec les defaults du type
      if (lieuxInit.length === 0 && typeEv) {
        allLieux.filter(l => (l.types_evenement_defaut || []).includes(typeEv)).forEach(l => {
          lieuxInit.push({ id: l.id, nom: l.nom, ville: l.ville, isDefault: true });
        });
      }
      // Fallback : lieu principal de l'événement si défini
      if (lieuxInit.length === 0 && ev.lieu_id) {
        const l = allLieux.find(x => x.id === ev.lieu_id);
        if (l) lieuxInit.push({ id: l.id, nom: l.nom, ville: l.ville, isDefault: false });
      }
      setLieuxAssocies(lieuxInit);

      // Prestataires : d'abord ceux déjà associés, puis les defaults manquants
      const prestaInit = [];
      prestataireEvent.forEach(pe => {
        const p = allPrestataires.find(x => x.id === pe.prestataire_id);
        if (p) prestaInit.push({ id: p.id, nom: p.nom, domaine: p.domaine, isDefault: false });
      });
      if (prestaInit.length === 0 && typeEv) {
        allPrestataires.filter(p => p.actif !== false && (p.types_evenement_defaut || []).includes(typeEv)).forEach(p => {
          prestaInit.push({ id: p.id, nom: p.nom, domaine: p.domaine, isDefault: true });
        });
      }
      setPrestataireAssocies(prestaInit);
    });
  }, [evenementId, prospects.length]);

  const setInfo = (k, v) => setInfos(p => ({ ...p, [k]: v }));

  const isDateExacte = !['mois', 'periode'].includes(infos.date_type);

  const getModelesForTache = (key) => {
    if (key === 'formulaire') return modelesFormulaires.map(m => ({ id: m.id, label: m.nom }));
    if (key === 'programme') return modelesProgram.map(m => ({ id: m.id, label: m.nom }));
    if (key === 'menu') return menus.filter(m => m.actif !== false).map(m => ({ id: m.id, label: m.nom + (m.prix_par_personne ? ` — ${m.prix_par_personne}€/pers.` : '') }));
    if (key === 'plan_table') return plansTable.filter(p => p.actif !== false).map(m => ({ id: m.id, label: m.nom }));
    if (key === 'fiche_service') return modelsFiche.map(m => ({ id: m.id, label: m.nom }));
    return [];
  };

  const setModeleForTache = (key, id, label) => {
    setModeles(p => ({ ...p, [`${key}_id`]: id, [`${key}_nom`]: label }));
  };

  const handleValider = async () => {
    setSaving(true);
    const tachesRequises = {};
    TACHES_DEF.forEach(t => { tachesRequises[t.key] = !!taches[t.key]; });

    // Lieu principal = premier lieu associé (pour compatibilité avec le reste de l'app)
    const lieuPrincipal = lieuxAssocies[0] || null;

    const normalized = normalizeEvenementDate({
      date_type: infos.date_type || 'exacte',
      date: infos.date,
      date_mois: infos.date_mois || null,
      date_periode: infos.date_periode || null,
    });
    let dateTech = normalized.date;
    if (!dateTech) {
      dateTech = new Date().toISOString().split('T')[0];
    }

    // ── Workflow changement de date (prestataires confirmés) ──
    // Si la date change et que l'événement a des prestataires confirmés, on crée
    // une proposition plutôt que d'appliquer la date directement.
    let appliedDate = dateTech;
    let appliedType = normalized.date_type;
    let appliedMois = normalized.date_mois;
    let appliedPeriode = normalized.date_periode;
    try {
      const { propositionCreated } = await gererChangementDate({
        evenementId,
        originalDate: evenement.date,
        proposed: { date: dateTech, date_type: normalized.date_type, date_mois: normalized.date_mois, date_periode: normalized.date_periode },
        initiee_par: 'admin',
      });
      if (propositionCreated) {
        appliedDate = evenement.date;
        appliedType = evenement.date_type || 'exacte';
        appliedMois = evenement.date_mois || null;
        appliedPeriode = evenement.date_periode || null;
      }
    } catch { /* erreur déjà toastée */ }

    await base44.entities.Evenement.update(evenementId, {
      statut: 'En préparation',
      nom: infos.nom,
      type_evenement: infos.type_evenement || null,
      date: appliedDate,
      date_type: appliedType,
      date_mois: appliedMois,
      date_periode: appliedPeriode,
      heure_debut: infos.heure_debut || null,
      heure_fin: infos.heure_fin || null,
      client_nom: infos.client_nom,
      client_email: infos.client_email || null,
      client_telephone: infos.client_telephone || null,
      nb_adultes: infos.nb_adultes ? parseInt(infos.nb_adultes) : null,
      nb_adolescents: infos.nb_adolescents ? parseInt(infos.nb_adolescents) : null,
      nb_enfants: infos.nb_enfants ? parseInt(infos.nb_enfants) : null,
      nb_prestataires: infos.nb_prestataires ? parseInt(infos.nb_prestataires) : null,
      nb_invites: (parseInt(infos.nb_adultes) || 0) + (parseInt(infos.nb_adolescents) || 0) + (parseInt(infos.nb_enfants) || 0),
      formule_id: infos.formule_id || null,
      formule_nom: infos.formule_nom || null,
      options_validees: infos.options_validees || null,
      notes_contrat: infos.notes_contrat || null,
      budget: infos.budget ? parseFloat(infos.budget) : null,
      lieu_id: lieuPrincipal?.id || null,
      lieu_nom: lieuPrincipal?.nom || null,
      taches_requises: tachesRequises,
      modeles_config: modeles,
    });

    // Créer les entrées LieuEvenement pour les lieux multiples
    const existingLieux = await base44.entities.LieuEvenement.filter({ evenement_id: evenementId });
    for (const le of existingLieux) {
      await base44.entities.LieuEvenement.delete(le.id);
    }
    for (const l of lieuxAssocies) {
      await base44.entities.LieuEvenement.create({
        evenement_id: evenementId,
        lieu_id: l.id,
        lieu_nom: l.nom,
        lieu_ville: l.ville || '',
        type: 'Réception',
        ordre: lieuxAssocies.indexOf(l),
      });
    }

    qc.invalidateQueries(['evenements']);
    setSaving(false);
    navigate('/Evenements');
  };

  if (!evenement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/Evenements')} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={18} className="text-orange-500" /> Configuration de l'événement
          </h2>
          <p className="text-sm text-muted-foreground">{evenement.nom}</p>
        </div>
      </div>

      <div className="space-y-8">

        {/* ── BLOC 1 ── Informations */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle
            number="1"
            title="Informations de l'événement"
            subtitle="Pré-remplis depuis la fiche prospect. Modifiez si nécessaire."
          />

          {/* Nom de l'événement */}
          <div className="mb-4">
            <FieldLabel>Nom de l'événement *</FieldLabel>
            <Input value={infos.nom || ''} onChange={e => setInfo('nom', e.target.value)} placeholder="Mariage Dupont" />
          </div>

          {/* Client */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-1">
              <FieldLabel>Nom du client</FieldLabel>
              <Input value={infos.client_nom || ''} onChange={e => setInfo('client_nom', e.target.value)} placeholder="Dupont" />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input value={infos.client_email || ''} onChange={e => setInfo('client_email', e.target.value)} placeholder="jean@mail.com" />
            </div>
            <div>
              <FieldLabel>Téléphone</FieldLabel>
              <Input value={infos.client_telephone || ''} onChange={e => setInfo('client_telephone', e.target.value)} placeholder="06 00 00 00 00" />
            </div>
          </div>

          {/* Date et horaires */}
          <div className="space-y-3 mb-4">
            <div>
              <FieldLabel>Date de l'événement</FieldLabel>
              <Input type="date" value={infos.date || ''} onChange={e => setInfo('date', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Heure de début</FieldLabel>
                <Input type="time" value={infos.heure_debut || ''} onChange={e => setInfo('heure_debut', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Heure de fin</FieldLabel>
                <Input type="time" value={infos.heure_fin || ''} onChange={e => setInfo('heure_fin', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Type d'événement */}
          <div className="mb-4">
            <FieldLabel>Type d'événement</FieldLabel>
            <select
              value={infos.type_evenement || ''}
              onChange={e => setInfo('type_evenement', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Choisir —</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Nombre de personnes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { key: 'nb_adultes', label: 'Adultes' },
              { key: 'nb_adolescents', label: 'Adolescents' },
              { key: 'nb_enfants', label: 'Enfants' },
              { key: 'nb_prestataires', label: 'Prestataires' },
            ].map(f => (
              <div key={f.key}>
                <FieldLabel>{f.label}</FieldLabel>
                <Input type="number" min="0" value={infos[f.key] ?? ''} onChange={e => setInfo(f.key, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>

          {/* Formule */}
          <div className="mb-4">
            <FieldLabel>Formule choisie</FieldLabel>
            <select
              value={infos.formule_id || ''}
              onChange={e => {
                const m = menus.find(m => m.id === e.target.value);
                setInfo('formule_id', e.target.value);
                setInfo('formule_nom', m?.nom || '');
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Aucune —</option>
              {menus.filter(m => m.actif !== false).map(m => (
                <option key={m.id} value={m.id}>{m.nom}{m.prix_par_personne ? ` — ${m.prix_par_personne} €/pers.` : ''}</option>
              ))}
            </select>
          </div>

          {/* Options validées */}
          <div className="mb-4">
            <FieldLabel>Options déjà validées</FieldLabel>
            <textarea
              value={infos.options_validees || ''}
              onChange={e => setInfo('options_validees', e.target.value)}
              rows={2}
              placeholder="Cocktail, Animation…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Notes contrat */}
          <div className="mb-4">
            <FieldLabel>Notes du contrat</FieldLabel>
            <textarea
              value={infos.notes_contrat || ''}
              onChange={e => setInfo('notes_contrat', e.target.value)}
              rows={3}
              placeholder="Conditions particulières, demandes spéciales…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Budget (optionnel) */}
          <div>
            <FieldLabel>Budget estimé (€) — optionnel</FieldLabel>
            <Input type="number" value={infos.budget || ''} onChange={e => setInfo('budget', e.target.value)} placeholder="Ex : 8000" />
          </div>
        </div>

        {isDateExacte ? (
        <>
        {/* ── BLOC 2 ── Checklist */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle
            number="2"
            title="Ce dont on a besoin pour cet événement"
            subtitle="Cochez les éléments à préparer et sélectionnez le modèle correspondant."
          />

          <div className="space-y-3">
            {TACHES_DEF.filter(t => !t.moduleKey || modules[t.moduleKey]).map(t => {
              const checked = !!taches[t.key];
              const modelesDispos = getModelesForTache(t.key);
              return (
                <div key={t.key} className={`rounded-xl border transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setTaches(p => ({ ...p, [t.key]: !p[t.key] }))}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                      {checked && <Check size={11} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium">{t.emoji} {t.label}</span>
                  </label>

                  {/* Description pour les tâches avec sous-points */}
                  {t.description && (
                    <ul className="px-3 pb-3 space-y-0.5">
                      {t.description.map((d, i) => (
                        <li key={i} className="text-xs text-muted-foreground">· {d}</li>
                      ))}
                    </ul>
                  )}

                  {/* Sélection du modèle si coché et modèles disponibles */}
                  {checked && t.hasModele && modelesDispos.length > 0 && (
                    <div className="px-3 pb-3">
                      <select
                        value={modeles[`${t.key}_id`] || ''}
                        onChange={e => {
                          const opt = modelesDispos.find(m => m.id === e.target.value);
                          setModeleForTache(t.key, e.target.value, opt?.label || '');
                        }}
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— Sélectionner un modèle —</option>
                        {modelesDispos.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                  )}
                  {checked && t.hasModele && modelesDispos.length === 0 && (
                    <p className="px-3 pb-3 text-xs text-muted-foreground">Aucun modèle disponible dans la bibliothèque.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BLOC 3 ── Lieux & Prestataires */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionTitle
            number="3"
            title="Lieux & Prestataires"
            subtitle="Associez les lieux et prestataires à cet événement. Les éléments marqués 'Par défaut' sont pré-sélectionnés depuis votre configuration."
          />

          {/* Lieux */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Lieux associés</FieldLabel>
              <button
                type="button"
                onClick={() => setShowLieuPicker(v => !v)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={13} /> Associer un lieu
              </button>
            </div>

            {/* Picker lieux */}
            {showLieuPicker && (
              <div className="border border-border rounded-xl p-2 mb-2 max-h-44 overflow-y-auto bg-muted/20 space-y-1">
                {lieux.filter(l => !lieuxAssocies.find(x => x.id === l.id)).map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLieuxAssocies(prev => [...prev, { id: l.id, nom: l.nom, ville: l.ville, isDefault: false }]);
                      setShowLieuPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card text-left transition-colors text-sm"
                  >
                    <MapPin size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-medium">{l.nom}</span>
                    {l.ville && <span className="text-muted-foreground text-xs">— {l.ville}</span>}
                    {(l.types_evenement_defaut || []).includes(infos.type_evenement) && (
                      <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Par défaut</span>
                    )}
                  </button>
                ))}
                {lieux.filter(l => !lieuxAssocies.find(x => x.id === l.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Tous les lieux sont déjà associés.</p>
                )}
              </div>
            )}

            {/* Liste des lieux associés */}
            {lieuxAssocies.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun lieu associé pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                {lieuxAssocies.map((l, idx) => (
                  <div key={l.id} className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2">
                    <MapPin size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.nom}</p>
                      {l.ville && <p className="text-xs text-muted-foreground">{l.ville}</p>}
                    </div>
                    {l.isDefault && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Par défaut</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setLieuxAssocies(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prestataires */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Prestataires associés</FieldLabel>
              <button
                type="button"
                onClick={() => setShowPrestatairePicker(v => !v)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={13} /> Associer un prestataire
              </button>
            </div>

            {/* Picker prestataires */}
            {showPrestatairePicker && (
              <div className="border border-border rounded-xl p-2 mb-2 max-h-44 overflow-y-auto bg-muted/20 space-y-1">
                {prestataires.filter(p => p.actif !== false && !prestataireAssocies.find(x => x.id === p.id)).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPrestataireAssocies(prev => [...prev, { id: p.id, nom: p.nom, domaine: p.domaine, isDefault: false }]);
                      setShowPrestatairePicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card text-left transition-colors text-sm"
                  >
                    <Users size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-medium">{p.nom}</span>
                    {p.domaine && <span className="text-muted-foreground text-xs">— {p.domaine}</span>}
                    {(p.types_evenement_defaut || []).includes(infos.type_evenement) && (
                      <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Par défaut</span>
                    )}
                  </button>
                ))}
                {prestataires.filter(p => p.actif !== false && !prestataireAssocies.find(x => x.id === p.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Tous les prestataires sont déjà associés.</p>
                )}
              </div>
            )}

            {/* Liste des prestataires associés */}
            {prestataireAssocies.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun prestataire associé pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                {prestataireAssocies.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2">
                    <Users size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nom}</p>
                      {p.domaine && <p className="text-xs text-muted-foreground">{p.domaine}</p>}
                    </div>
                    {p.isDefault && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Par défaut</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPrestataireAssocies(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-2xl shrink-0">🔒</span>
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Date à fixer avant la configuration</p>
              <p className="text-amber-700 mt-1">Fixez une date exacte dans le bloc ci-dessus pour débloquer la configuration complète de l'événement.</p>
              <p className="text-amber-600 text-xs mt-2">Choisissez « 📅 Date exacte » puis renseignez le jour prévu.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bouton sticky en bas — visible sur iOS Safari */}
      <div style={{ position: 'sticky', bottom: '80px', width: '100%', background: 'white', padding: '16px', borderTop: '1px solid #e5e7eb', zIndex: 10 }} className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/Evenements')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour sans enregistrer
        </button>
        <Button
          onClick={handleValider}
          disabled={saving || !isDateExacte || !infos.nom?.trim() || !infos.date}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
          Valider — Passer en préparation
        </Button>
      </div>
    </div>
  );
}