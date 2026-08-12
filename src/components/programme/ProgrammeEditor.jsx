/**
 * Éditeur de programme intelligent pour la fiche événement.
 * - Choisir un modèle ou partir de zéro
 * - Saisir l'heure de début → calcul automatique en cascade
 * - Modifier durée → recalcul immédiat
 * - Drag & drop, ajout depuis bibliothèque, ajout libre
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronDown, Search, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { calculerHoraires, formatDuree, formatTotalMinutes, totalMinutes } from '@/lib/programmeUtils';
import EtapeRow from '@/components/programme/EtapeRow';

function genId() { return Math.random().toString(36).slice(2, 9); }

// Génère les étapes du programme à partir des catégories du catalogue
function genererEtapesDepuisCatalogue(catalogueItems, formuleNom) {
  const items = catalogueItems.filter(i =>
    i.section === 'alimentaire' && i.actif !== false &&
    (i.toutes_formules !== false || (i.formules_associees || []).includes(formuleNom || ''))
  );

  const categories = new Set(items.map(i => i.categorie));
  const nomsItems = items.map(i => i.nom.toLowerCase());

  const aCategorie = (cat) => categories.has(cat);
  const aNom = (...mots) => mots.some(m => nomsItems.some(n => n.includes(m)));

  const etapes = [];

  // Étape 1 — Accueil (toujours)
  etapes.push({ id: genId(), nom: 'Accueil des convives', duree_heures: 0, duree_minutes: 30, heure: '', categorie: 'Accueil' });

  // Étape 2 — Apéritif
  if (aCategorie('Apéritif')) {
    etapes.push({ id: genId(), nom: 'Apéritif', duree_heures: 1, duree_minutes: 0, heure: '', categorie: 'Service' });
  }

  // Étape 3 — Entrée
  if (aCategorie('Entrée')) {
    etapes.push({ id: genId(), nom: 'Entrée', duree_heures: 0, duree_minutes: 30, heure: '', categorie: 'Service' });
  }

  // Étape 4 — Plat (toujours)
  etapes.push({ id: genId(), nom: 'Plat', duree_heures: 0, duree_minutes: 45, heure: '', categorie: 'Service' });

  // Étape 5 — Fromages
  if (aNom('fromage')) {
    etapes.push({ id: genId(), nom: 'Fromages', duree_heures: 0, duree_minutes: 20, heure: '', categorie: 'Service' });
  }

  // Étape 6 — Trou normand
  if (aNom('trou normand', 'sorbet')) {
    etapes.push({ id: genId(), nom: 'Trou normand', duree_heures: 0, duree_minutes: 15, heure: '', categorie: 'Service' });
  }

  // Étape 7 — Dessert (toujours)
  if (aCategorie('Dessert') || !aCategorie('Apéritif')) {
    etapes.push({ id: genId(), nom: 'Dessert', duree_heures: 0, duree_minutes: 30, heure: '', categorie: 'Service' });
  }

  // Étape 8 — Café
  if (aNom('café', 'cafe', 'mignardise', 'gourmandise')) {
    etapes.push({ id: genId(), nom: 'Café & mignardises', duree_heures: 0, duree_minutes: 20, heure: '', categorie: 'Service' });
  }

  // Dernière étape — Départ (toujours)
  etapes.push({ id: genId(), nom: 'Départ des convives', duree_heures: 0, duree_minutes: 30, heure: '', categorie: 'Fin' });

  return etapes;
}

export default function ProgrammeEditor({ programme, onChange, formuleNom }) {
  const [heureDebut, setHeureDebut] = useState(() => {
    return programme.length > 0 && programme[0].heure ? programme[0].heure : '';
  });
  const [showBiblio, setShowBiblio] = useState(false);
  const [showModeles, setShowModeles] = useState(false);
  const [searchBiblio, setSearchBiblio] = useState('');

  const { data: bibliotheque = [] } = useQuery({
    queryKey: ['etapes-bibliotheque'],
    queryFn: () => base44.entities.EtapeBibliotheque.list('-created_date', 200),
    enabled: showBiblio,
  });

  const { data: catalogueItems = [] } = useQuery({
    queryKey: ['catalogue-items-programme'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
  });

  const genererDepuisCatalogue = () => {
    const etapes = genererEtapesDepuisCatalogue(catalogueItems, formuleNom);
    recalculer(etapes, heureDebut);
  };

  const { data: modelesProgramme = [] } = useQuery({
    queryKey: ['modeles-programme'],
    queryFn: () => base44.entities.ModeleProgramme.list(),
    enabled: showModeles,
  });

  // Recalcule et émet les étapes avec horaires à jour
  const recalculer = useCallback((etapes, debut) => {
    const heure = debut !== undefined ? debut : heureDebut;
    if (heure && etapes.length > 0) {
      onChange(calculerHoraires(heure, etapes));
    } else {
      onChange(etapes);
    }
  }, [heureDebut, onChange]);

  const handleHeureDebut = (val) => {
    setHeureDebut(val);
    recalculer(programme, val);
  };

  const updateEtape = (idx, field, value) => {
    const updated = programme.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    recalculer(updated, heureDebut);
  };

  const removeEtape = (idx) => {
    const updated = programme.filter((_, i) => i !== idx);
    recalculer(updated, heureDebut);
  };

  const addSousEtape = (etapeIdx, sousEtape) => {
    const updated = programme.map((e, i) => {
      if (i === etapeIdx) {
        return {
          ...e,
          sous_etapes: [...(e.sous_etapes || []), sousEtape]
        };
      }
      return e;
    });
    onChange(updated);
  };

  const updateSousEtape = (etapeIdx, sousEtapeIdx, field, value) => {
    const updated = programme.map((e, i) => {
      if (i === etapeIdx) {
        return {
          ...e,
          sous_etapes: (e.sous_etapes || []).map((se, seIdx) =>
            seIdx === sousEtapeIdx ? { ...se, [field]: value } : se
          )
        };
      }
      return e;
    });
    onChange(updated);
  };

  const deleteSousEtape = (etapeIdx, sousEtapeIdx) => {
    const updated = programme.map((e, i) => {
      if (i === etapeIdx) {
        return {
          ...e,
          sous_etapes: (e.sous_etapes || []).filter((_, seIdx) => seIdx !== sousEtapeIdx)
        };
      }
      return e;
    });
    onChange(updated);
  };

  const addEtapeLibre = () => {
    const updated = [...programme, { id: genId(), nom: '', duree_heures: 0, duree_minutes: 30, heure: '' }];
    recalculer(updated, heureDebut);
  };

  const addFromBiblio = (etape) => {
    const updated = [...programme, {
      id: genId(),
      nom: etape.nom,
      duree_heures: etape.duree_heures || 0,
      duree_minutes: etape.duree_minutes || 0,
      categorie: etape.categorie,
      heure: '',
    }];
    recalculer(updated, heureDebut);
    setShowBiblio(false);
  };

  const appliquerModele = (modele) => {
    const etapes = (modele.etapes || []).map(e => ({ ...e, id: genId(), heure: '' }));
    recalculer(etapes, heureDebut);
    setShowModeles(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(programme);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    recalculer(items, heureDebut);
  };

  const total = totalMinutes(programme);
  const filteredBiblio = bibliotheque.filter(e => !searchBiblio || e.nom.toLowerCase().includes(searchBiblio.toLowerCase()));

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
          <Clock size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground shrink-0">Début :</span>
          <input
            type="time"
            value={heureDebut}
            onChange={e => handleHeureDebut(e.target.value)}
            className="text-sm font-mono bg-transparent border-none outline-none w-20"
          />
        </div>

        {total > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
            ⏱ {formatTotalMinutes(total)}
          </span>
        )}

        <div className="ml-auto flex gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={genererDepuisCatalogue}
            title="Génère automatiquement les étapes du programme selon les catégories du catalogue de la formule"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            <Sparkles size={11} /> Catalogue
          </button>
          <button
            type="button"
            onClick={() => { setShowModeles(v => !v); setShowBiblio(false); }}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showModeles ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            📋 Modèles <ChevronDown size={11} className={`transition-transform ${showModeles ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => { setShowBiblio(v => !v); setShowModeles(false); }}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showBiblio ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            📚 Bibliothèque <ChevronDown size={11} className={`transition-transform ${showBiblio ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={addEtapeLibre}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus size={11} /> Étape
          </button>
        </div>
      </div>

      {/* Panel Modèles */}
      {showModeles && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
          <p className="text-xs font-semibold text-muted-foreground">Choisir un modèle</p>
          {modelesProgramme.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun modèle. Créez-en un dans la Bibliothèque.</p>
          ) : (
            modelesProgramme.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => appliquerModele(m)}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.etapes?.length || 0} étapes · {formatTotalMinutes(totalMinutes(m.etapes || []))}</p>
                </div>
                <span className="text-xs text-primary">Appliquer →</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Panel Bibliothèque */}
      {showBiblio && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
          <p className="text-xs font-semibold text-muted-foreground">Ajouter depuis la bibliothèque</p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchBiblio} onChange={e => setSearchBiblio(e.target.value)} placeholder="Rechercher…" className="pl-8 h-7 text-xs" />
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredBiblio.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => addFromBiblio(e)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-colors"
              >
                <span className="text-sm">{e.nom}</span>
                <span className="text-xs text-muted-foreground">{formatDuree(e.duree_heures, e.duree_minutes)} <Plus size={11} className="inline" /></span>
              </button>
            ))}
            {filteredBiblio.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucun résultat</p>}
          </div>
        </div>
      )}

      {/* Liste des étapes */}
      {programme.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl py-6 text-center text-xs text-muted-foreground">
          Aucune étape. Ajoutez depuis la bibliothèque, un modèle, ou manuellement.
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
           <Droppable droppableId="programme-ev">
             {(provided) => (
               <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                 {programme.map((etape, idx) => (
                   <Draggable key={etape.id || idx} draggableId={String(etape.id || idx)} index={idx}>
                     {(provided) => (
                       <EtapeRow
                         etape={etape}
                         index={idx}
                         dragHandleProps={provided.dragHandleProps}
                         draggableProps={provided.draggableProps}
                         innerRef={provided.innerRef}
                         onUpdateEtape={updateEtape}
                         onDeleteEtape={removeEtape}
                         onAddSousEtape={addSousEtape}
                         onUpdateSousEtape={updateSousEtape}
                         onDeleteSousEtape={deleteSousEtape}
                       />
                     )}
                   </Draggable>
                 ))}
                 {provided.placeholder}
               </div>
             )}
           </Droppable>
         </DragDropContext>
      )}
    </div>
  );
}