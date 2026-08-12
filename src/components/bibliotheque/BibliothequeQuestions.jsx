import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Archive, RotateCcw, Check, X, GripVertical, Pencil, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QuestionModal from './QuestionModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';

const CATEGORIES = [
  'Identification client',
  'Générales',
  'Logistique',
  'Décoration',
  'Menu',
  'Matériel & Équipement',
  'Lieu — mobile',
  'Médias & Souvenir',
  'Spécifiques Mariage',
  'Sécurité',
  'OPTIONS',
];

const QUESTIONS_PAR_DEFAUT = [
  // Identification client (ordre 0–3)
  { label: 'Nom et prénom du client', categorie: 'Identification client', type: 'texte', etat: 'incluse', obligatoire: true, ordre: 0 },
  { label: 'Email', categorie: 'Identification client', type: 'texte', etat: 'incluse', obligatoire: true, ordre: 1 },
  { label: 'Téléphone', categorie: 'Identification client', type: 'texte', etat: 'incluse', obligatoire: true, ordre: 2 },
  { label: 'Adresse', categorie: 'Identification client', type: 'texte', etat: 'incluse', ordre: 3 },

  // Générales (ordre 0–9)
  { label: 'Date de la réception', categorie: 'Générales', type: 'date', etat: 'incluse', obligatoire: true, ordre: 0 },
  { label: 'Type d\'événement', categorie: 'Générales', type: 'liste', etat: 'incluse', obligatoire: false, description: 'Pré-rempli — invisible client', options: ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', 'Soirée d\'entreprise', 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'], ordre: 1 },
  { label: 'Nombre d\'adultes', categorie: 'Générales', type: 'nombre', etat: 'incluse', obligatoire: true, ordre: 2 },
  { label: 'Nombre d\'ados', categorie: 'Générales', type: 'nombre', etat: 'incluse', ordre: 3 },
  { label: 'Nombre de menus enfants', categorie: 'Générales', type: 'nombre', etat: 'incluse', ordre: 4 },
  { label: 'Nombre de prestataires', categorie: 'Générales', type: 'nombre', etat: 'incluse', ordre: 5 },
  { label: 'Fonction des prestataires', categorie: 'Générales', type: 'texte', etat: 'incluse', ordre: 6 },
  { label: 'Allergies et régimes spéciaux', categorie: 'Générales', type: 'oui_non', etat: 'incluse', ordre: 7 },
  { label: 'Allergies — préciser', categorie: 'Générales', type: 'texte', etat: 'incluse', ordre: 8, conditions: [{ champ_declencheur_id: 'Allergies et régimes spéciaux', champ_declencheur_label: 'Allergies et régimes spéciaux', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
  { label: 'Mode de règlement', categorie: 'Générales', type: 'liste', options: ['Espèces', 'Chèque certifié', 'Virement bancaire'], etat: 'incluse', ordre: 9 },
  { label: 'Informations supplémentaires', categorie: 'Générales', type: 'texte', etat: 'incluse', ordre: 10 },

  // Logistique (ordre 0–6)
  { label: 'Heure d\'arrivée le jour J', categorie: 'Logistique', type: 'heure', etat: 'incluse', ordre: 0 },
  { label: 'Heure d\'arrivée des invités', categorie: 'Logistique', type: 'heure', etat: 'incluse', ordre: 1 },
  { label: 'Heure de fin souhaitée', categorie: 'Logistique', type: 'heure', etat: 'incluse', ordre: 2 },
  { label: 'Souhaitez-vous venir décorer la salle ?', categorie: 'Logistique', type: 'oui_non', etat: 'incluse', ordre: 3 },
  { label: 'Heure d\'arrivée pour la décoration', categorie: 'Logistique', type: 'heure', etat: 'incluse', ordre: 4, conditions: [{ champ_declencheur_id: 'Souhaitez-vous venir décorer la salle ?', champ_declencheur_label: 'Souhaitez-vous venir décorer la salle ?', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
  { label: 'Présence de PMR ?', categorie: 'Logistique', type: 'oui_non', etat: 'incluse', ordre: 5 },
  { label: 'Baby-sitting nécessaire ?', categorie: 'Logistique', type: 'oui_non', etat: 'incluse', ordre: 6 },

  // Décoration (ordre 0–3)
  { label: 'Thème ou couleurs souhaitées', categorie: 'Décoration', type: 'texte', etat: 'disponible', ordre: 0 },
  { label: 'Fleuriste externe prévu ?', categorie: 'Décoration', type: 'oui_non', etat: 'disponible', ordre: 1 },
  { label: 'Wedding planner prévu ?', categorie: 'Décoration', type: 'oui_non', etat: 'disponible', ordre: 2 },
  { label: 'Dress code souhaité', categorie: 'Décoration', type: 'texte', etat: 'disponible', ordre: 3 },

  // Menu (ordre 0–4)
  { label: 'Vin d\'honneur — nombre de personnes', categorie: 'Menu', type: 'nombre', etat: 'disponible', ordre: 0 },
  { label: 'Amènerez-vous du vin effervescent ?', categorie: 'Menu', type: 'oui_non', etat: 'disponible', ordre: 1 },
  { label: 'Pliage des serviettes', categorie: 'Menu', type: 'liste', options: ['Fleurs de lys', 'Roulée pour rond de serviette'], etat: 'disponible', ordre: 2 },
  { label: 'Message sur le gâteau', categorie: 'Menu', type: 'texte', etat: 'disponible', ordre: 3 },
  { label: 'Figurine sur la pièce montée ?', categorie: 'Menu', type: 'oui_non', etat: 'disponible', ordre: 4 },

  // Matériel & Équipement (ordre 0–14)
  { label: 'Nombre de tables nécessaires', categorie: 'Matériel & Équipement', type: 'nombre', etat: 'disponible', ordre: 0 },
  { label: 'Nombre de chaises nécessaires', categorie: 'Matériel & Équipement', type: 'nombre', etat: 'disponible', ordre: 1 },
  { label: 'Nombre de nappes', categorie: 'Matériel & Équipement', type: 'nombre', etat: 'disponible', ordre: 2 },
  { label: 'Nombre de serviettes', categorie: 'Matériel & Équipement', type: 'nombre', etat: 'disponible', ordre: 3 },
  { label: 'Frigo ou chambre froide nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 4 },
  { label: 'Frigo chambre froide — capacité souhaitée', categorie: 'Matériel & Équipement', type: 'texte', etat: 'disponible', ordre: 5, conditions: [{ champ_declencheur_id: 'Frigo ou chambre froide nécessaire ?', champ_declencheur_label: 'Frigo ou chambre froide nécessaire ?', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
  { label: 'Groupe électrogène nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 6 },
  { label: 'Tente ou chapiteau nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 7 },
  { label: 'Sono et micro nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 8 },
  { label: 'Éclairage extérieur nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 9 },
  { label: 'Scène ou estrade nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 10 },
  { label: 'Mobilier cocktail nécessaire ?', categorie: 'Matériel & Équipement', type: 'oui_non', etat: 'disponible', ordre: 11 },
  { label: 'Vaisselle fournie ou à prévoir ?', categorie: 'Matériel & Équipement', type: 'liste', options: ['Fournie', 'À prévoir'], etat: 'disponible', ordre: 12 },
  { label: 'Couverts fournis ou à prévoir ?', categorie: 'Matériel & Équipement', type: 'liste', options: ['Fournis', 'À prévoir'], etat: 'disponible', ordre: 13 },
  { label: 'Verres fournis ou à prévoir ?', categorie: 'Matériel & Équipement', type: 'liste', options: ['Fournis', 'À prévoir'], etat: 'disponible', ordre: 14 },

  // Lieu mobile (ordre 0–5)
  { label: 'Adresse du lieu de réception', categorie: 'Lieu — mobile', type: 'texte', etat: 'disponible', ordre: 0 },
  { label: 'Accès cuisine sur place ?', categorie: 'Lieu — mobile', type: 'oui_non', etat: 'disponible', ordre: 1 },
  { label: 'Point d\'eau disponible ?', categorie: 'Lieu — mobile', type: 'oui_non', etat: 'disponible', ordre: 2 },
  { label: 'Électricité disponible ?', categorie: 'Lieu — mobile', type: 'oui_non', etat: 'disponible', ordre: 3 },
  { label: 'Accès livraison camion ?', categorie: 'Lieu — mobile', type: 'oui_non', etat: 'disponible', ordre: 4 },
  { label: 'Superficie approximative du lieu', categorie: 'Lieu — mobile', type: 'nombre', etat: 'disponible', ordre: 5 },

  // Médias & Souvenir (ordre 0–3)
  { label: 'Photographe prévu ?', categorie: 'Médias & Souvenir', type: 'oui_non', etat: 'disponible', ordre: 0 },
  { label: 'Vidéaste prévu ?', categorie: 'Médias & Souvenir', type: 'oui_non', etat: 'disponible', ordre: 1 },
  { label: 'Livre d\'or souhaité ?', categorie: 'Médias & Souvenir', type: 'oui_non', etat: 'disponible', ordre: 2 },
  { label: 'Surprise prévue ?', categorie: 'Médias & Souvenir', type: 'oui_non', etat: 'disponible', ordre: 3 },

  // Spécifiques Mariage (ordre 0)
  { label: 'Nom et prénom des mariés', categorie: 'Spécifiques Mariage', type: 'texte', etat: 'disponible', ordre: 0 },

  // Sécurité (ordre 0–6)
  { label: 'Agent de sécurité nécessaire ?', categorie: 'Sécurité', type: 'oui_non', etat: 'disponible', ordre: 0 },
  { label: 'Présence d\'animaux ?', categorie: 'Sécurité', type: 'oui_non', etat: 'disponible', ordre: 1 },
  { label: 'Plan d\'évacuation connu ?', categorie: 'Sécurité', type: 'oui_non', etat: 'disponible', ordre: 2 },
  { label: 'Avez-vous un contact d\'urgence ?', categorie: 'Sécurité', type: 'oui_non', etat: 'disponible', ordre: 3 },
  { label: 'Nom et prénom du contact d\'urgence', categorie: 'Sécurité', type: 'texte', etat: 'disponible', ordre: 4, conditions: [{ id: 'cond_urgence_nom', champ_declencheur_id: 'Avez-vous un contact d\'urgence ?', champ_declencheur_label: 'Avez-vous un contact d\'urgence ?', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
  { label: 'Lien avec le client (conjoint, parent, ami…)', categorie: 'Sécurité', type: 'texte', etat: 'disponible', ordre: 5, conditions: [{ id: 'cond_urgence_lien', champ_declencheur_id: 'Avez-vous un contact d\'urgence ?', champ_declencheur_label: 'Avez-vous un contact d\'urgence ?', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
  { label: 'Téléphone du contact d\'urgence', categorie: 'Sécurité', type: 'texte', etat: 'disponible', description: 'Format : 06 XX XX XX XX', ordre: 6, conditions: [{ id: 'cond_urgence_tel', champ_declencheur_id: 'Avez-vous un contact d\'urgence ?', champ_declencheur_label: 'Avez-vous un contact d\'urgence ?', operateur: 'egal', valeur: 'OUI', action: 'afficher' }] },
];

const TYPE_LABEL = {
  texte: '📝 Texte', nombre: '🔢 Nombre', heure: '⏰ Heure',
  date: '📅 Date', oui_non: '✅ Oui/Non', choix_unique: '🔘 Choix',
  cases_a_cocher: '☑️ Cases', liste: '📋 Liste', upload: '📎 Upload',
};

export default function BibliothequeQuestions() {
  const qc = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [questionModal, setQuestionModal] = useState(null);
  const [catOrder, setCatOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('bibliotheque-cat-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Fusionner : ajouter les nouvelles catégories absentes en fin de liste
        const merged = [...parsed, ...CATEGORIES.filter(c => !parsed.includes(c))];
        return merged;
      }
    } catch {}
    return CATEGORIES;
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['bibliotheque-questions'],
    queryFn: async () => {
      const existing = await base44.entities.BibliothequeQuestion.list('ordre', 500);
      if (existing.length === 0) {
        await base44.entities.BibliothequeQuestion.bulkCreate(QUESTIONS_PAR_DEFAUT);
        return base44.entities.BibliothequeQuestion.list('ordre', 500);
      }
      const labelsExistants = new Set(existing.map(q => q.label));
      const manquantes = QUESTIONS_PAR_DEFAUT.filter(q => !labelsExistants.has(q.label));
      if (manquantes.length > 0) {
        await base44.entities.BibliothequeQuestion.bulkCreate(manquantes);
        return base44.entities.BibliothequeQuestion.list('ordre', 500);
      }
      return existing;
    },
  });

  const updateQuestion = useMutation({
    mutationFn: (data) => base44.entities.BibliothequeQuestion.update(data.id, data),
    onSuccess: () => qc.invalidateQueries(['bibliotheque-questions']),
  });

  // Batch update : envoie toutes les modifications en parallèle, invalide une seule fois
  const batchUpdateQuestions = async (updates) => {
    await Promise.all(updates.map(q => base44.entities.BibliothequeQuestion.update(q.id, q)));
    qc.invalidateQueries(['bibliotheque-questions']);
  };

  const createQuestion = useMutation({
    mutationFn: (data) => base44.entities.BibliothequeQuestion.create(data),
    onSuccess: () => qc.invalidateQueries(['bibliotheque-questions']),
  });

  const deleteQuestion = useMutation({
    mutationFn: (id) => base44.entities.BibliothequeQuestion.delete(id),
    onSuccess: () => { qc.invalidateQueries(['bibliotheque-questions']); setDeleteModal(null); },
  });

  const bulkDelete = useMutation({
    mutationFn: () => Promise.all(selectedIds.map(id => base44.entities.BibliothequeQuestion.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['bibliotheque-questions']); setSelectedIds([]); setBulkDeleteModal(false); },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleToggleEtat = (question) => {
    const nouvelEtat = question.etat === 'incluse' ? 'disponible' : 'incluse';
    updateQuestion.mutate({ ...question, etat: nouvelEtat });
  };

  const handleArchiver = (question) => {
    updateQuestion.mutate({ ...question, etat: 'archivee' });
  };

  const handleRestaurer = (question) => {
    updateQuestion.mutate({ ...question, etat: 'incluse' });
  };

  const handleDupliquer = (question) => {
    const { id, created_date, updated_date, created_by, ...rest } = question;
    createQuestion.mutate({ ...rest, label: `${question.label} (copie)`, etat: 'disponible', est_personnalisee: true });
  };

  // Drag & drop handler (questions dans catégorie + entre catégories + catégories)
  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'CATEGORY') {
      const newOrder = [...catOrder];
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      setCatOrder(newOrder);
      try { localStorage.setItem('bibliotheque-cat-order', JSON.stringify(newOrder)); } catch {}
      return;
    }

    // Réordonner ou déplacer des questions
    const srcCat = source.droppableId;
    const dstCat = destination.droppableId;

    const srcItems = questions
      .filter(q => q.categorie === srcCat && q.etat !== 'archivee')
      .filter(q => q.label.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

    if (srcCat === dstCat) {
      // Même catégorie — réordonner en batch
      const reordered = [...srcItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      batchUpdateQuestions(reordered.map((q, i) => ({ ...q, ordre: i })));
    } else {
      // Catégorie différente — calculer tous les changements localement puis envoyer en batch
      const movedQ = srcItems[source.index];
      if (!movedQ) return;

      const dstItems = questions
        .filter(q => q.categorie === dstCat && q.etat !== 'archivee')
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

      // Nouvelle liste destination avec la question insérée
      const newDst = [...dstItems];
      newDst.splice(destination.index, 0, movedQ);

      // Nouvelle liste source sans la question déplacée
      const newSrc = srcItems.filter(q => q.id !== movedQ.id);

      // Calculer tous les updates en une seule passe
      const updates = [
        // Question déplacée : nouvelle catégorie + son ordre dans la destination
        { ...movedQ, categorie: dstCat, ordre: destination.index },
        // Réordonner la destination (sauf la question déplacée déjà incluse ci-dessus)
        ...newDst.filter(q => q.id !== movedQ.id).map((q, i) => ({
          ...q,
          ordre: i < destination.index ? i : i + 1,
        })),
        // Réordonner la source
        ...newSrc.map((q, i) => ({ ...q, ordre: i })),
      ];

      batchUpdateQuestions(updates);
    }
  };

  const filtered = useMemo(() => {
    return questions.filter(q => q.label.toLowerCase().includes(searchText.toLowerCase()));
  }, [questions, searchText]);

  const grouped = catOrder.reduce((acc, cat) => {
    const items = filtered
      .filter(q => q.categorie === cat && q.etat !== 'archivee')
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const archivees = filtered.filter(q => q.etat === 'archivee');

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-base">📚 Bibliothèque de questions</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setQuestionModal('new')}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une question…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
        ) : (
          <>
            <DragDropContext onDragEnd={searchText ? undefined : handleDragEnd}>
              {/* Catégories draggables */}
              <Droppable droppableId="categories" type="CATEGORY">
                {(provided) => (
                  <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
                    {catOrder.filter(cat => grouped[cat]).map((cat, catIdx) => (
                      <Draggable key={cat} draggableId={`cat-${cat}`} index={catIdx}>
                        {(catProvided) => (
                          <div ref={catProvided.innerRef} {...catProvided.draggableProps}>
                            <div className="flex items-center gap-2 mb-2">
                              <div {...catProvided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                                <GripVertical size={14} />
                              </div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
                            </div>

                            {/* Questions dans la catégorie */}
                            <Droppable droppableId={cat} type="QUESTION">
                              {(qProvided) => (
                                <div className="space-y-1.5" ref={qProvided.innerRef} {...qProvided.droppableProps}>
                                  {(grouped[cat] || []).map((q, qIdx) => (
                                    <Draggable key={q.id} draggableId={q.id} index={qIdx}>
                                      {(qDrag) => (
                                        <div
                                          ref={qDrag.innerRef}
                                          {...qDrag.draggableProps}
                                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-background ${selectedIds.includes(q.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedIds.includes(q.id)}
                                            onChange={() => toggleSelect(q.id)}
                                            className="shrink-0 accent-primary"
                                            onClick={e => e.stopPropagation()}
                                          />
                                          <div {...qDrag.dragHandleProps} className="cursor-grab text-muted-foreground">
                                            <GripVertical size={14} />
                                          </div>

                                          {/* Toggle incluse/disponible */}
                                          <button
                                            onClick={() => handleToggleEtat(q)}
                                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                              q.etat === 'incluse'
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-muted-foreground bg-transparent'
                                            }`}
                                          >
                                            {q.etat === 'incluse' && <Check size={12} className="text-white" />}
                                          </button>

                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{q.label}</p>
                                            <p className="text-xs text-muted-foreground">{TYPE_LABEL[q.type] || q.type}</p>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {q.est_personnalisee && (
                                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Custom</span>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Modifier"
                                              onClick={() => setQuestionModal(q)}>
                                              <Pencil size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Dupliquer"
                                              disabled={createQuestion.isPending}
                                              onClick={() => handleDupliquer(q)}>
                                              <Copy size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Archiver"
                                              onClick={() => handleArchiver(q)}>
                                              <Archive size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Supprimer"
                                              onClick={() => setDeleteModal(q)}>
                                              <X size={13} />
                                            </Button>
                                          </div>
                                        </div>
                                        )}
                                        </Draggable>
                                  ))}
                                  {qProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Questions archivées */}
            {archivees.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Archivées ({archivees.length})</p>
                <div className="space-y-1.5 opacity-50">
                  {archivees.map(q => (
                    <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40">
                      <GripVertical size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through">{q.label}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRestaurer(q)}>
                        <RotateCcw size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {questionModal && (
        <QuestionModal
          question={questionModal === 'new' ? null : questionModal}
          onClose={() => setQuestionModal(null)}
        />
      )}
      <DeleteConfirmModal
        open={!!deleteModal}
        title={`Supprimer « ${deleteModal?.label} » ?`}
        onConfirm={() => deleteQuestion.mutate(deleteModal.id)}
        onCancel={() => setDeleteModal(null)}
        loading={deleteQuestion.isPending}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} question(s) ?`}
        onConfirm={() => bulkDelete.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDelete.isPending}
      />
      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
      />
    </div>
  );
}