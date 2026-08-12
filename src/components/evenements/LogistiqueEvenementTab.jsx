import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, MapPin, ChevronDown, Plus, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

const TYPES_PRESTATION = [
  { value: 'sur_place',           label: '🏛️ Sur place',           desc: 'Pas de livraison' },
  { value: 'livraison',           label: '🚚 Livraison simple',     desc: 'Sans service' },
  { value: 'prestation_complete', label: '👨‍🍳 Prestation complète', desc: 'Installation + service' },
];

function computeStatut(checklist, typePrestation, currentStatut = 'en_preparation') {
  // Checklist vide + sur place = automatiquement Prêt
  if (!checklist || checklist.length === 0) return typePrestation === 'sur_place' ? 'pret' : 'en_preparation';
  
  // Si checklist incomplète, toujours "en_preparation"
  const allCharged = checklist.every(i => i.charge === true);
  if (!allCharged) return 'en_preparation';
  
  // Si checklist complète, on peut maintenir les statuts avancés sauf pour "sur_place"
  const advancedStatuses = ['en_route', 'livre', 'sur_place', 'realise'];
  if (typePrestation === 'livraison' && ['en_route', 'livre'].includes(currentStatut)) {
    return currentStatut;
  }
  if (typePrestation === 'prestation_complete' && advancedStatuses.includes(currentStatut)) {
    return currentStatut;
  }
  
  // Sinon : checklist complète → "pret"
  return 'pret';
}

function AdressePicker({ lieux, adresseLieuId, setAdresseLieuId, adresseLibre, setAdresseLibre, showAdresseLibre, setShowAdresseLibre, adresseFinale }) {
  return (
    <div>
      {!showAdresseLibre ? (
        <select
          value={adresseLieuId}
          onChange={e => {
            if (e.target.value === '__new__') { setShowAdresseLibre(true); setAdresseLieuId(''); }
            else setAdresseLieuId(e.target.value);
          }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Sélectionner un lieu —</option>
          {lieux.map(l => (
            <option key={l.id} value={l.id}>{l.nom}{l.ville ? ` — ${l.ville}` : ''}</option>
          ))}
          <option value="__new__">+ Nouvelle adresse…</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <Input value={adresseLibre} onChange={e => setAdresseLibre(e.target.value)} placeholder="Ex: 12 rue des Roses, 75001 Paris" className="flex-1" />
          <button onClick={() => { setShowAdresseLibre(false); setAdresseLibre(''); }} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted text-muted-foreground">
            Choisir un lieu
          </button>
        </div>
      )}
      {adresseFinale && <p className="text-xs text-muted-foreground mt-1">📍 {adresseFinale}</p>}
    </div>
  );
}

export default function LogistiqueEvenementTab({ evenement, onSaved }) {
  const qc = useQueryClient();

  const { data: logData = [] } = useQuery({
    queryKey: ['logistique-ev', evenement.id],
    queryFn: () => base44.entities.LogistiqueEvenement.filter({ evenement_id: evenement.id }),
  });
  const logistique = logData[0] || null;

  const { data: articles = [] } = useQuery({
    queryKey: ['logistique-articles'],
    queryFn: () => base44.entities.LogistiqueArticle.list(),
  });
  const { data: regles = [] } = useQuery({
    queryKey: ['regles-materiel'],
    queryFn: () => base44.entities.RegleMateriel.list(),
  });
  const { data: vehicules = [] } = useQuery({
    queryKey: ['logistique-vehicules'],
    queryFn: () => base44.entities.LogistiqueVehicule.list(),
  });
  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list(),
  });
  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list(),
  });
  const { data: collaborateurs = [] } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list(),
  });

  const chauffeurs = useMemo(() => {
    const result = [];
    extras.filter(e => e.actif !== false && (e.competences || []).includes('Chauffeur / Livreur'))
      .forEach(e => result.push({ id: e.id, label: `${e.nom} — Extra`, type: 'extra' }));
    collaborateurs.filter(c => c.actif !== false && (c.competences || []).includes('Chauffeur / Livreur'))
      .forEach(c => result.push({ id: c.id, label: `${c.nom} — Collaborateur`, type: 'collaborateur' }));
    return result;
  }, [extras, collaborateurs]);

  const nbInvites = evenement.nb_invites || 0;

  const [typePrestation, setTypePrestation] = useState('sur_place');
  const [vehiculeId, setVehiculeId] = useState('');
  const [creneauDate, setCreneauDate] = useState('');
  const [creneauHeure, setCreneauHeure] = useState('');
  const [adresseLieuId, setAdresseLieuId] = useState('');
  const [adresseLibre, setAdresseLibre] = useState('');
  const [showAdresseLibre, setShowAdresseLibre] = useState(false);
  const [statutLivraison, setStatutLivraison] = useState('en_preparation');
  const [checklist, setChecklist] = useState([]);
  const [chauffeurId, setChauffeurId] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ nom: '', quantite: 1, unite: '' });

  // Pré-remplit l'adresse avec le lieu de l'événement si disponible
  const prefillAdresseFromEvent = () => {
    if (evenement.lieu_id && lieux.length > 0) {
      const lieuEv = lieux.find(l => l.id === evenement.lieu_id);
      if (lieuEv) {
        setAdresseLieuId(lieuEv.id);
        setShowAdresseLibre(false);
      }
    }
  };

  useEffect(() => {
    if (logistique) {
      // Charger depuis la BD
      setTypePrestation(logistique.type_prestation || 'sur_place');
      setVehiculeId(logistique.vehicule_id || '');
      setCreneauDate(logistique.creneau_date || '');
      setCreneauHeure(logistique.creneau_heure || '');
      const freshChecklist = logistique.checklist_materiel || [];
      setChecklist(freshChecklist);
      setChauffeurId(logistique.chauffeur_id || '');
      
      // Synchroniser le statut depuis la BD en respectant la logique métier
      const bdStatut = logistique.statut_livraison || 'en_preparation';
      const recomputedStatut = computeStatut(freshChecklist, logistique.type_prestation || 'sur_place', bdStatut);
      setStatutLivraison(recomputedStatut);
      
      // Adresse
      const adresse = logistique.adresse_livraison || '';
      const lieuTrouve = lieux.find(l => l.id === adresse || `${l.nom}${l.adresse ? ', ' + l.adresse : ''}` === adresse);
      if (lieuTrouve) {
        setAdresseLieuId(lieuTrouve.id);
        setShowAdresseLibre(false);
      } else if (adresse) {
        setAdresseLibre(adresse);
        setShowAdresseLibre(true);
      } else {
        setAdresseLieuId('');
        setAdresseLibre('');
        setShowAdresseLibre(false);
      }
    } else if (evenement.lieu_id && lieux.length > 0) {
      // Pré-remplir avec le lieu de l'événement par défaut
      prefillAdresseFromEvent();
    }
  }, [logistique, lieux, evenement.lieu_id]);

  // Recalculer le statut final quand typePrestation ou checklist changent
  useEffect(() => {
    const newStatut = computeStatut(checklist, typePrestation, statutLivraison);
    setStatutLivraison(newStatut);
  }, [typePrestation, checklist.length]);

  useEffect(() => {
    if (!logistique && regles.length > 0) {
      const formuleId = evenement.formule_id || null;
      const nbAdultes = evenement.nb_adultes || 0;
      const nbAdos = evenement.nb_adolescents || 0;
      const nbEnfants = evenement.nb_enfants || 0;

      const allowedPrestationTypes = (() => {
        if (typePrestation === 'livraison') return ['sur_place', 'livraison'];
        if (typePrestation === 'prestation_complete') return ['sur_place', 'livraison', 'prestation_complete'];
        return ['sur_place'];
      })();

      const reglesApplicables = regles.filter(r => {
        const pts = r.prestation_types?.length ? r.prestation_types : (r.prestation_type && r.prestation_type !== 'toutes' ? [r.prestation_type] : []);
        if (pts.length > 0 && !pts.some(pt => allowedPrestationTypes.includes(pt))) return false;
        const fids = r.formule_ids?.length ? r.formule_ids : (r.formule_id ? [r.formule_id] : []);
        if (fids.length === 0) return true;
        return formuleId && fids.includes(formuleId);
      });

      const articleMap = {};
      for (const r of reglesApplicables) {
        let qte = 0;
        if (r.mode_qte === 'fixe') {
          qte = r.qte_fixe || 0;
        } else {
          const raw = (r.qte_adulte || 0) * nbAdultes
            + (r.qte_adolescent || 0) * nbAdos
            + (r.qte_enfant || 0) * nbEnfants;
          qte = r.arrondi === 'inférieur' ? Math.floor(raw) : Math.ceil(raw);
        }
        if (articleMap[r.article_id]) {
          articleMap[r.article_id].quantite += qte;
        } else {
          articleMap[r.article_id] = {
            article_id: r.article_id,
            nom: r.article_nom,
            quantite: qte,
            unite: r.unite || '',
            charge: false,
            retour: false,
          };
        }
      }
      const newChecklist = Object.values(articleMap);
      setChecklist(newChecklist);
    } else if (!logistique && regles.length === 0 && articles.length > 0) {
      const newChecklist = articles
        .filter(a => a.actif !== false)
        .map(a => ({
          article_id: a.id,
          nom: a.nom,
          quantite: 1,
          unite: a.unite || '',
          charge: false,
          retour: false,
        }));
      setChecklist(newChecklist);
    } else if (!logistique && regles.length === 0 && articles.length === 0) {
      setChecklist([]);
    }
  }, [regles, articles, logistique, evenement.formule_id, evenement.nb_adultes, evenement.nb_adolescents, evenement.nb_enfants, typePrestation]);

  const updateChecklist = (idx, field, value) => {
    setChecklist(prev => {
      const updated = prev.map((item, i) => i === idx ? { ...item, [field]: value } : item);
      // Recalculer le statut à partir de la checklist mise à jour
      if (field === 'charge') {
        const newStatut = computeStatut(updated, typePrestation, statutLivraison);
        setStatutLivraison(newStatut);
      }
      return updated;
    });
  };

  const adresseFinale = useMemo(() => {
    if (typePrestation !== 'livraison' && typePrestation !== 'prestation_complete') return '';
    if (showAdresseLibre) return adresseLibre;
    const lieu = lieux.find(l => l.id === adresseLieuId);
    if (!lieu) return '';
    return lieu.nom + (lieu.adresse ? `, ${lieu.adresse}` : '');
  }, [typePrestation, showAdresseLibre, adresseLibre, adresseLieuId, lieux]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (logistique) {
        return base44.entities.LogistiqueEvenement.update(logistique.id, data);
      } else {
        return base44.entities.LogistiqueEvenement.create({ evenement_id: evenement.id, ...data });
      }
    },
    onSuccess: () => {
      toast.success('✓ Logistique enregistrée', {
        duration: 3000,
        position: 'top-center',
        style: { background: '#16a34a', color: '#fff' },
      });
      // Invalider + refetcher immédiatement et attendre la fin avant de fermer
      qc.invalidateQueries({ queryKey: ['logistique-ev', evenement.id] });
      qc.refetchQueries({ queryKey: ['logistique-ev', evenement.id] }).then(() => {
        onSaved?.();
      });
    },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });

  const handleSave = useCallback(() => {
    const veh = vehicules.find(v => v.id === vehiculeId);
    const chauf = chauffeurs.find(c => c.id === chauffeurId);
    
    // Recalculer le statut final AVANT mutation
    const finalStatut = computeStatut(checklist, typePrestation, statutLivraison);
    
    saveMutation.mutate({
      type_prestation: typePrestation,
      vehicule_id: vehiculeId || '',
      vehicule_nom: veh?.nom || '',
      chauffeur_id: chauffeurId || '',
      chauffeur_nom: chauf ? chauf.label.split(' — ')[0] : '',
      chauffeur_type: chauf?.type || '',
      creneau_date: creneauDate || '',
      creneau_heure: creneauHeure || '',
      adresse_livraison: adresseFinale || '',
      statut_livraison: finalStatut,
      checklist_materiel: checklist,
    });
  }, [typePrestation, vehiculeId, vehicules, chauffeurId, chauffeurs, creneauDate, creneauHeure, adresseFinale, checklist, saveMutation]);

  const checklistComplete = checklist.length > 0 && checklist.every(i => i.charge);

  const statutBadge = {
    en_preparation: { label: '🔵 En préparation', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pret:           { label: '🟢 Prêt',           className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    en_route:       { label: '🚚 En route',        className: 'bg-amber-100 text-amber-700 border-amber-200' },
    livre:          { label: '✅ Livré',           className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
    sur_place:      { label: '📍 Sur place',       className: 'bg-violet-100 text-violet-700 border-violet-200' },
    realise:        { label: '✅ Réalisé',         className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  }[statutLivraison] || { label: '🔵 En préparation', className: 'bg-blue-100 text-blue-700 border-blue-200' };

  const ChauffeurSelect = () => (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">🧑‍✈️ Chauffeur assigné</label>
      <select value={chauffeurId} onChange={e => setChauffeurId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <option value="">— Sélectionner un chauffeur… —</option>
        {chauffeurs.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
  );

  const adressePickerProps = { lieux, adresseLieuId, setAdresseLieuId, adresseLibre, setAdresseLibre, showAdresseLibre, setShowAdresseLibre, adresseFinale };

  // Calculer le statut final pour la preview
  const finalStatut = useMemo(() => computeStatut(checklist, typePrestation, statutLivraison), [checklist, typePrestation, statutLivraison]);
  const finalStatutBadge = {
    en_preparation: { label: '🔵 En préparation', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pret:           { label: '🟢 Prêt',           className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    en_route:       { label: '🚚 En route',        className: 'bg-amber-100 text-amber-700 border-amber-200' },
    livre:          { label: '✅ Livré',           className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
    sur_place:      { label: '📍 Sur place',       className: 'bg-violet-100 text-violet-700 border-violet-200' },
    realise:        { label: '✅ Réalisé',         className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  }[finalStatut] || { label: '🔵 En préparation', className: 'bg-blue-100 text-blue-700 border-blue-200' };

  return (
    <div className="space-y-6 pb-28">

      {/* Statut final (preview en temps réel) */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${finalStatutBadge.className}`}>
        {finalStatutBadge.label}
      </div>

      {/* 1. Type de prestation */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type de prestation</h4>
        <div className="grid grid-cols-1 gap-2">
          {TYPES_PRESTATION.map(t => (
            <button
              key={t.value}
              onClick={() => {
                const prev = typePrestation;
                setTypePrestation(t.value);
                setStatutLivraison(computeStatut(checklist, t.value, statutLivraison));
                // Pré-remplir adresse si on passe à livraison/prestation et qu'aucune adresse n'est définie
                if (
                  (t.value === 'livraison' || t.value === 'prestation_complete') &&
                  prev === 'sur_place' &&
                  !adresseLieuId && !adresseLibre
                ) {
                  prefillAdresseFromEvent();
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                typePrestation === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted/30'
              }`}
            >
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">— {t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Checklist matériel — accordéon */}
      <div className="space-y-2">
        {/* En-tête accordéon cliquable */}
        <button
          onClick={() => setChecklistOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Checklist matériel
              {nbInvites > 0 && <span className="normal-case font-normal ml-1">({nbInvites} invités)</span>}
            </h4>
            {checklist.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checklistComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {checklist.filter(i => i.charge).length}/{checklist.length} chargés
              </span>
            )}
          </div>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
        </button>

        {checklistOpen && (
          <div className="border border-border rounded-xl overflow-hidden">
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Aucun article. Configurez des règles dans Bibliothèque → Logistique ou ajoutez manuellement.
              </p>
            ) : (
              <>
                {/* En-têtes colonnes selon type */}
                <div className={`grid text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-2 gap-2 ${
                  typePrestation === 'sur_place'
                    ? 'grid-cols-[1fr_80px_60px]'
                    : typePrestation === 'prestation_complete'
                    ? 'grid-cols-[1fr_80px_60px_60px]'
                    : 'grid-cols-[1fr_80px_60px]'
                }`}>
                  <span>Article</span>
                  <span className="text-center">Qté</span>
                  <span className="text-center">{typePrestation === 'sur_place' ? '✓ Prêt' : 'Chargé'}</span>
                  {typePrestation === 'prestation_complete' && <span className="text-center">Retour</span>}
                </div>
                {checklist.map((item, idx) => (
                  <div key={idx} className={`grid items-center px-3 py-2.5 gap-2 border-t border-border hover:bg-muted/20 ${
                    typePrestation === 'sur_place'
                      ? 'grid-cols-[1fr_80px_60px]'
                      : typePrestation === 'prestation_complete'
                      ? 'grid-cols-[1fr_80px_60px_60px]'
                      : 'grid-cols-[1fr_80px_60px]'
                  }`}>
                    <span className={`text-sm font-medium ${item.charge ? 'line-through text-muted-foreground' : ''}`}>
                      {item.nom}{item.unite ? <span className="text-xs text-muted-foreground ml-1">({item.unite})</span> : null}
                    </span>
                    <input
                      type="number"
                      value={item.quantite}
                      onChange={e => updateChecklist(idx, 'quantite', Number(e.target.value))}
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      min={0}
                    />
                    <div className="flex justify-center">
                      <input type="checkbox" checked={item.charge || false} onChange={e => updateChecklist(idx, 'charge', e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer" />
                    </div>
                    {typePrestation === 'prestation_complete' && (
                      <div className="flex justify-center">
                        <input type="checkbox" checked={item.retour || false} onChange={e => updateChecklist(idx, 'retour', e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer" />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Ajout manuel */}
            {showAddItem ? (
              <div className="border-t border-border px-3 py-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ajouter un article manuellement</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nom de l'article"
                    value={newItem.nom}
                    onChange={e => setNewItem(p => ({ ...p, nom: e.target.value }))}
                    className="flex-1 h-8 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Qté"
                    value={newItem.quantite}
                    onChange={e => setNewItem(p => ({ ...p, quantite: Number(e.target.value) }))}
                    className="w-16 h-8 text-sm text-center"
                    min={1}
                  />
                  <Input
                    placeholder="Unité"
                    value={newItem.unite}
                    onChange={e => setNewItem(p => ({ ...p, unite: e.target.value }))}
                    className="w-20 h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newItem.nom.trim()) return;
                      setChecklist(prev => [...prev, { nom: newItem.nom.trim(), quantite: newItem.quantite, unite: newItem.unite, charge: false, retour: false }]);
                      setNewItem({ nom: '', quantite: 1, unite: '' });
                      setShowAddItem(false);
                    }}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Ajouter
                  </button>
                  <button onClick={() => setShowAddItem(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted text-muted-foreground">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border px-3 py-2">
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <Plus size={12} /> Ajouter un article manuellement
                </button>
              </div>
            )}
          </div>
        )}
        {typePrestation === 'sur_place' && !checklistComplete && checklist.length > 0 && checklistOpen && (
          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            💡 La checklist passe automatiquement en <strong>Prêt</strong> quand tous les articles sont cochés.
          </p>
        )}
      </div>

      {/* 3. Livraison simple */}
      {typePrestation === 'livraison' && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignation & Livraison</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">🚚 Véhicule</label>
              <select value={vehiculeId} onChange={e => setVehiculeId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Sélectionner —</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.nom}{v.type_vehicule ? ` (${v.type_vehicule})` : ''}</option>)}
              </select>
            </div>
            <div><ChauffeurSelect /></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">📅 Date de départ</label>
              <Input type="date" value={creneauDate} onChange={e => setCreneauDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">🕐 Heure de départ</label>
              <Input type="time" value={creneauHeure} onChange={e => setCreneauHeure(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin size={12} /> Adresse de livraison</label>
              <AdressePicker {...adressePickerProps} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progression livraison</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'en_preparation', label: '🔵 En préparation', disabled: false },
                { value: 'pret',           label: '🟢 Prêt',           disabled: !checklistComplete },
                { value: 'en_route',       label: '🚚 En route',        disabled: statutLivraison === 'en_preparation' },
                { value: 'livre',          label: '✅ Livré',           disabled: statutLivraison !== 'en_route' && statutLivraison !== 'livre' },
              ].map(s => (
                <button key={s.value} onClick={() => !s.disabled && setStatutLivraison(s.value)} disabled={s.disabled}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    statutLivraison === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/30 text-foreground'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {!checklistComplete && <p className="text-xs text-muted-foreground">⚠️ Cochez tous les articles pour passer à "Prêt".</p>}
          </div>
        </div>
      )}

      {/* 4. Prestation complète */}
      {typePrestation === 'prestation_complete' && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignation & Prestation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">🚚 Véhicule</label>
              <select value={vehiculeId} onChange={e => setVehiculeId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Sélectionner —</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.nom}{v.type_vehicule ? ` (${v.type_vehicule})` : ''}</option>)}
              </select>
            </div>
            <div><ChauffeurSelect /></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">📅 Date de départ</label>
              <Input type="date" value={creneauDate} onChange={e => setCreneauDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">🕐 Heure de départ</label>
              <Input type="time" value={creneauHeure} onChange={e => setCreneauHeure(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin size={12} /> Adresse de prestation</label>
              <AdressePicker {...adressePickerProps} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progression prestation</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'en_preparation', label: '🔵 En préparation', disabled: false },
                { value: 'pret',           label: '🟢 Prêt',            disabled: !checklistComplete },
                { value: 'en_route',       label: '🚚 En route',         disabled: statutLivraison === 'en_preparation' },
                { value: 'sur_place',      label: '📍 Sur place',        disabled: statutLivraison !== 'en_route' && statutLivraison !== 'sur_place' },
                { value: 'realise',        label: '✅ Réalisé',          disabled: statutLivraison !== 'sur_place' && statutLivraison !== 'realise' },
              ].map(s => (
                <button key={s.value} onClick={() => !s.disabled && setStatutLivraison(s.value)} disabled={s.disabled}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    statutLivraison === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/30 text-foreground'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {!checklistComplete && <p className="text-xs text-muted-foreground">⚠️ Cochez tous les articles pour passer à "Prêt".</p>}
          </div>
        </div>
      )}

      {/* Bouton sauvegarder */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2">
          <Save size={14} />
          {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer la logistique'}
        </Button>
      </div>
    </div>
  );
}