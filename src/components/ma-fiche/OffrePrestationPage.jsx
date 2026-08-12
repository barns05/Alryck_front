/**
 * OffrePrestationPage — Sous-page « Offre & Prestation » de Ma Vitrine.
 * Tarifs, à propos, points forts, équipements, FAQ, localisation, spécificités métier.
 * Champs fantômes retirés de l'UI : delai_reponse, zone_intervention.
 */
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import TagInput from '@/components/settings/TagInput';
import { getChampsSpecifiques, metierAAccueilEtEquipements, metierAEquipementsEtPointsForts, getEquipementsDisponibles, getMetierConfig } from '@/config/metierConfig';
import PointsFortsSelector from '@/components/ma-fiche/PointsFortsSelector';
import PillAccordionSelector from '@/components/ma-fiche/PillAccordionSelector';
import LanguesSelector from '@/components/ma-fiche/LanguesSelector';
import FaqEditor from '@/components/ma-fiche/FaqEditor';
import { useVitrineCompletion } from '@/hooks/useVitrineCompletion';
import CompletionBanner from '@/components/ma-fiche/CompletionBanner';

function ToggleField({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className="relative flex-shrink-0"
        style={{ width: 44, height: 24, borderRadius: 999, background: checked ? 'hsl(var(--primary))' : 'hsl(var(--muted))', cursor: 'pointer', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block' }} />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function OffrePrestationPage({ cs, qc }) {
  const lastCsId = useRef(null);
  const [specOpen, setSpecOpen] = useState(false);

  const [form, setForm] = useState({
    a_propos: '',
    tarif_a_partir_de: '',
    capacite_min: '',
    capacite_max: '',
    langues_parlees: [],
    style_tags: [],
    points_forts_personnalises: [],
    type_lieu: '',
    hebergement: false,
    nb_photos_livrees: '',
    delai_livraison: '',
    video_incluse: false,
    type_musique: '',
    materiel_inclus: [],
    style_floral: '',
    prestations_florales: [],
    equipements: [],
    faq: [],
    accueil_sur_place: false,
    accueil_deplacement: false,
    adresse_ville: '',
    adresse_code_postal: '',
    zone_deplacement_type: 'rayon',
    zone_deplacement_rayon_km: '',
    zone_deplacement_departements: [],
    zone_deplacement_region: '',
  });
  const [saving, setSaving] = useState(false);
  const { sections } = useVitrineCompletion();

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      setForm({
        a_propos: cs.a_propos ?? '',
        tarif_a_partir_de: cs.tarif_a_partir_de ?? '',
        capacite_min: cs.capacite_min ?? '',
        capacite_max: cs.capacite_max ?? '',
        langues_parlees: cs.langues_parlees ?? [],
        style_tags: cs.style_tags ?? [],
        points_forts_personnalises: cs.points_forts_personnalises ?? [],
        type_lieu: cs.type_lieu ?? '',
        hebergement: cs.hebergement ?? false,
        nb_photos_livrees: cs.nb_photos_livrees ?? '',
        delai_livraison: cs.delai_livraison ?? '',
        video_incluse: cs.video_incluse ?? false,
        type_musique: cs.type_musique ?? '',
        materiel_inclus: cs.materiel_inclus ?? [],
        style_floral: cs.style_floral ?? '',
        prestations_florales: cs.prestations_florales ?? [],
        equipements: cs.equipements ?? [],
        faq: cs.faq ?? [],
        accueil_sur_place: cs.accueil_sur_place ?? false,
        accueil_deplacement: cs.accueil_deplacement ?? false,
        adresse_ville: cs.adresse_ville ?? '',
        adresse_code_postal: cs.adresse_code_postal ?? '',
        zone_deplacement_type: cs.zone_deplacement_type ?? 'rayon',
        zone_deplacement_rayon_km: cs.zone_deplacement_rayon_km ?? '',
        zone_deplacement_departements: cs.zone_deplacement_departements ?? [],
        zone_deplacement_region: cs.zone_deplacement_region ?? '',
      });
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      a_propos: form.a_propos || null,
      tarif_a_partir_de: form.tarif_a_partir_de !== '' ? Number(form.tarif_a_partir_de) : null,
      capacite_min: form.capacite_min !== '' ? Number(form.capacite_min) : null,
      capacite_max: form.capacite_max !== '' ? Number(form.capacite_max) : null,
      langues_parlees: form.langues_parlees,
      style_tags: form.style_tags,
      points_forts_personnalises: form.points_forts_personnalises,
      type_lieu: form.type_lieu || null,
      hebergement: form.hebergement,
      nb_photos_livrees: form.nb_photos_livrees !== '' ? Number(form.nb_photos_livrees) : null,
      delai_livraison: form.delai_livraison || null,
      video_incluse: form.video_incluse,
      type_musique: form.type_musique || null,
      materiel_inclus: form.materiel_inclus,
      style_floral: form.style_floral || null,
      prestations_florales: form.prestations_florales,
      equipements: form.equipements,
      faq: form.faq,
      accueil_sur_place: form.accueil_sur_place,
      accueil_deplacement: form.accueil_deplacement,
      adresse_ville: form.adresse_ville || null,
      adresse_code_postal: form.adresse_code_postal || null,
      zone_deplacement_type: form.zone_deplacement_type || null,
      zone_deplacement_rayon_km: form.zone_deplacement_rayon_km !== '' ? Number(form.zone_deplacement_rayon_km) : null,
      zone_deplacement_departements: form.zone_deplacement_departements,
      zone_deplacement_region: form.zone_deplacement_region || null,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    setSaving(false);
    toast.success('Offre & prestation enregistrées');
  };

  const metier = cs?.metier || '';
  const hasMetier = !!metier;
  const champsSpecifiques = getChampsSpecifiques(metier);
  const showLieu = champsSpecifiques.includes('type_lieu') || champsSpecifiques.includes('hebergement');
  const showPhoto = champsSpecifiques.includes('nb_photos_livrees') || champsSpecifiques.includes('delai_livraison') || champsSpecifiques.includes('video_incluse');
  const showMusique = champsSpecifiques.includes('type_musique') || champsSpecifiques.includes('materiel_inclus');
  const showFloral = champsSpecifiques.includes('style_floral') || champsSpecifiques.includes('prestations_florales');
  const showAccueilEquipements = hasMetier && metierAAccueilEtEquipements(metier);
  const showPointsFortsEquipements = hasMetier && metierAEquipementsEtPointsForts(metier);
  const equipementsList = getEquipementsDisponibles(metier);
  const hasSpecs = showLieu || showPhoto || showMusique || showFloral || showAccueilEquipements;

  const toggleEquipement = (item) => {
    setForm(f => ({
      ...f,
      equipements: f.equipements.includes(item) ? f.equipements.filter(e => e !== item) : [...f.equipements, item],
    }));
  };

  return (
    <div className="space-y-5">
      {sections?.offre && sections.offre.percentage < 100 && (
        <CompletionBanner section={sections.offre} />
      )}
      {/* Lien vers Bibliothèque */}
      <Link to="/bibliotheque" className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
        <span className="text-sm font-medium">🍽️ Gérer mes formules & brochures</span>
        <ExternalLink size={14} className="shrink-0" />
      </Link>

      {/* Tarifs & Capacité */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-base">💰 Tarifs & Capacité</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tarif à partir de (€)</label>
            <Input type="number" min="0" value={form.tarif_a_partir_de} onChange={e => handleChange('tarif_a_partir_de', e.target.value)} placeholder="Ex : 4500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Capacité min (invités)</label>
            <Input type="number" min="0" value={form.capacite_min} onChange={e => handleChange('capacite_min', e.target.value)} placeholder="Ex : 50" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Capacité max (invités)</label>
          <Input type="number" min="0" value={form.capacite_max} onChange={e => handleChange('capacite_max', e.target.value)} placeholder="Ex : 300" />
        </div>
      </div>

      {/* À propos */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-base">✍️ À propos de nous</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Présentez votre entreprise en 3 à 5 phrases. Affiché sur votre fiche publique (2 lignes, puis « Lire la suite »).</p>
        </div>
        <Textarea value={form.a_propos} onChange={e => handleChange('a_propos', e.target.value)} placeholder="Ex : Spécialiste des véhicules de prestige, notre équipe accompagne les mariés pour une arrivée inoubliable..." rows={5} />
      </div>

      {/* Points forts & Équipements */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-base">✨ Points forts & Équipements</h3>
        <LanguesSelector value={form.langues_parlees} onChange={v => handleChange('langues_parlees', v)} />
        {showPointsFortsEquipements ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground">✨ Points forts</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sélectionnez les atouts de votre établissement.</p>
            </div>
            <PointsFortsSelector
              groupe={getMetierConfig(metier).groupe}
              predefined={form.style_tags}
              custom={form.points_forts_personnalises}
              onTogglePredefined={(item) => {
                setForm(f => ({ ...f, style_tags: f.style_tags.includes(item) ? f.style_tags.filter(t => t !== item) : [...f.style_tags, item] }));
              }}
              onAddCustom={(v) => setForm(f => ({ ...f, points_forts_personnalises: [...f.points_forts_personnalises, v] }))}
              onRemoveCustom={(idx) => setForm(f => ({ ...f, points_forts_personnalises: f.points_forts_personnalises.filter((_, i) => i !== idx) }))}
            />
            <div className="pt-2 border-t border-border">
              <PillAccordionSelector titre="Équipements" items={equipementsList} selected={form.equipements} onToggle={toggleEquipement} defaultOpen />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Style / ambiances</label>
            <TagInput value={form.style_tags} onChange={v => handleChange('style_tags', v)} placeholder="Ex : Champêtre, Élégant, Moderne…" />
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-base">💬 FAQ</h3>
        <FaqEditor groupe={hasMetier ? getMetierConfig(metier).groupe : null} faq={form.faq} onChange={v => handleChange('faq', v)} />
      </div>

      {/* Localisation */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-base">📍 Localisation publique</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ville</label>
            <Input type="text" value={form.adresse_ville} onChange={e => handleChange('adresse_ville', e.target.value)} placeholder="Ex : Vitrolles" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Code postal</label>
            <Input type="text" value={form.adresse_code_postal} onChange={e => handleChange('adresse_code_postal', e.target.value)} placeholder="Ex : 13127" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">Visible dans votre fiche Annuaire et lors des recommandations. L'adresse complète du siège reste dans « Informations légales » (sous-page Identité).</p>
      </div>

      {/* Spécificités métier (accordéon replié par défaut) */}
      {hasSpecs && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setSpecOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="text-left">
              <h3 className="font-semibold text-base">📋 Spécificités métier</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Champs spécifiques à votre activité</p>
            </div>
            {specOpen ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
          </button>
          {specOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {showLieu && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type de lieu</label>
                  <Input type="text" value={form.type_lieu} onChange={e => handleChange('type_lieu', e.target.value)} placeholder="Ex : Domaine, Salle, Plein air…" />
                </div>
              )}
              {showAccueilEquipements && (
                <>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-medium text-muted-foreground">Type d'accueil</label>
                    <div className="flex flex-col gap-2.5">
                      <ToggleField checked={form.accueil_sur_place} onChange={v => handleChange('accueil_sur_place', v)} label="📍 Le client vient sur place" />
                      <ToggleField checked={form.accueil_deplacement} onChange={v => handleChange('accueil_deplacement', v)} label="🚗 Je me déplace chez le client" />
                    </div>
                  </div>
                  {form.accueil_deplacement && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <label className="text-xs font-medium text-muted-foreground">Zone de déplacement</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'rayon', label: 'Rayon en km' },
                          { value: 'departements', label: 'Départements' },
                          { value: 'region', label: 'Région' },
                        ].map(opt => (
                          <button key={opt.value} type="button" onClick={() => handleChange('zone_deplacement_type', opt.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.zone_deplacement_type === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {form.zone_deplacement_type === 'rayon' && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Rayon</label>
                          <Input type="number" min="0" value={form.zone_deplacement_rayon_km} onChange={e => handleChange('zone_deplacement_rayon_km', e.target.value)} placeholder="Ex : 50" />
                        </div>
                      )}
                      {form.zone_deplacement_type === 'departements' && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Départements</label>
                          <TagInput value={form.zone_deplacement_departements} onChange={v => handleChange('zone_deplacement_departements', v)} placeholder="Ex : 13, 83, 84…" />
                        </div>
                      )}
                      {form.zone_deplacement_type === 'region' && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Région</label>
                          <select value={form.zone_deplacement_region} onChange={e => handleChange('zone_deplacement_region', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            <option value="">— Sélectionner —</option>
                            {['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Bretagne','Centre-Val de Loire','Corse','Grand Est','Hauts-de-France','Île-de-France','Normandie','Nouvelle-Aquitaine','Occitanie','Pays de la Loire',"Provence-Alpes-Côte d'Azur",'Guadeloupe','Guyane','Martinique','La Réunion','Mayotte'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {showPhoto && (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre de photos livrées</label>
                      <Input type="number" min="0" value={form.nb_photos_livrees} onChange={e => handleChange('nb_photos_livrees', e.target.value)} placeholder="Ex : 400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Délai de livraison</label>
                      <Input type="text" value={form.delai_livraison} onChange={e => handleChange('delai_livraison', e.target.value)} placeholder="Ex : 4 semaines" />
                    </div>
                  </div>
                  <ToggleField checked={form.video_incluse} onChange={v => handleChange('video_incluse', v)} label="Vidéo incluse dans la prestation" />
                </>
              )}
              {showMusique && (
                <>
                  <div className="space-y-1 pt-2 border-t border-border">
                    <label className="text-xs font-medium text-muted-foreground">Type de musique</label>
                    <Input type="text" value={form.type_musique} onChange={e => handleChange('type_musique', e.target.value)} placeholder="Ex : Pop, Rock, Jazz, DJ…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Matériel inclus</label>
                    <TagInput value={form.materiel_inclus} onChange={v => handleChange('materiel_inclus', v)} placeholder="Ex : Sono, Lumières, Photobooth…" />
                  </div>
                </>
              )}
              {showFloral && (
                <>
                  <div className="space-y-1 pt-2 border-t border-border">
                    <label className="text-xs font-medium text-muted-foreground">Style floral</label>
                    <Input type="text" value={form.style_floral} onChange={e => handleChange('style_floral', e.target.value)} placeholder="Ex : Champêtre, Bohème, Classique…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Prestations florales</label>
                    <TagInput value={form.prestations_florales} onChange={v => handleChange('prestations_florales', v)} placeholder="Ex : Bouquet mariée, Déco salle, Cérémonie…" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !cs?.id} className="w-full gap-2">
        <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </div>
  );
}