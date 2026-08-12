/**
 * PrixFormulaireModal — 4 modes de tarification.
 *
 * CAS 1 — Prix fixe          : un seul prix, toutes formules
 * CAS 2 — Déduction uniforme : déduction €/% sur formules sélectionnées
 * CAS 3 — Déduction client   : déduction €/% calculée selon la formule du client
 * CAS 4 — Prix par formule   : prix distinct saisi pour chaque formule
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const MODES = [
  { id: 'fixe',       label: 'Prix fixe' },
  { id: 'uniforme',   label: 'Déduction uniforme' },
  { id: 'client',     label: 'Déduction sur formule client' },
  { id: 'par_formule', label: 'Prix par formule' },
];

function calcApercu(prixBase, unite, valeur) {
  if (!prixBase || valeur === '') return null;
  const v = parseFloat(valeur);
  if (isNaN(v)) return null;
  if (unite === '%') return Math.max(0, prixBase - prixBase * v / 100);
  return Math.max(0, prixBase - v);
}

function ToggleUnite({ unite, setUnite }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
      {['€', '%'].map(u => (
        <button
          key={u}
          type="button"
          onClick={() => setUnite(u)}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
            unite === u ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function DeductionInput({ valeur, setValeur, unite, setUnite }) {
  return (
    <div className="flex gap-2">
      <ToggleUnite unite={unite} setUnite={setUnite} />
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">-</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={valeur}
          onChange={e => setValeur(e.target.value)}
          placeholder="0"
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

function initMode(formule) {
  if (formule.type_calcul === 'deduction_montant' || formule.type_calcul === 'deduction_pourcentage') {
    return formule.formule_parente === null && formule.toutes_formules === true ? 'client' : 'uniforme';
  }
  return 'fixe';
}

export default function PrixFormulaireModal({ formule, formulesDisponibles = [], onClose, onSaved }) {
  const nomSeul = formule.nom.split('—')[0].trim();

  // ─── State ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState(() => initMode(formule));

  // CAS 1
  const [prix, setPrix] = useState(formule.prix ?? '');

  // CAS 2 & 3
  const [unite, setUnite] = useState(formule.type_calcul === 'deduction_pourcentage' ? '%' : '€');
  const [valeur, setValeur] = useState(formule.valeur_calcul ?? '');

  // CAS 2 — formules sélectionnées (cases à cocher)
  const initFormulesSel = () => {
    if (formule.formules_associees?.length) return formule.formules_associees;
    return [];
  };
  const [formulesSel, setFormulesSel] = useState(initFormulesSel);

  // CAS 4 — prix par formule { [nomFormule]: valeur }
  const initPrixParFormule = () => {
    const map = {};
    formulesDisponibles.forEach(f => { map[f.nom.split('—')[0].trim()] = ''; });
    return map;
  };
  const [prixParFormule, setPrixParFormule] = useState(initPrixParFormule);

  const [saving, setSaving] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const toggleFormule = (nom) => {
    setFormulesSel(prev =>
      prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom]
    );
  };

  const typeCalcul = unite === '%' ? 'deduction_pourcentage' : 'deduction_montant';

  const canSave = () => {
    if (mode === 'fixe')      return prix !== '';
    if (mode === 'uniforme')  return valeur !== '' && formulesSel.length > 0;
    if (mode === 'client')    return valeur !== '';
    if (mode === 'par_formule') return Object.values(prixParFormule).some(v => v !== '');
    return false;
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // CAS 1 — Prix fixe
      if (mode === 'fixe') {
        await base44.entities.CatalogueItem.update(formule.id, {
          prix: Number(prix),
          type_calcul: 'fixe',
          valeur_calcul: null,
          formule_parente: null,
          formules_associees: [],
          toutes_formules: true,
        });
      }

      // CAS 2 — Déduction uniforme sur formules sélectionnées
      if (mode === 'uniforme') {
        await base44.entities.CatalogueItem.update(formule.id, {
          prix: null,
          type_calcul: typeCalcul,
          valeur_calcul: Number(valeur),
          formule_parente: null,
          formules_associees: formulesSel,
          toutes_formules: false,
        });
      }

      // CAS 3 — Déduction sur formule client (calculée à l'événement)
      if (mode === 'client') {
        await base44.entities.CatalogueItem.update(formule.id, {
          prix: null,
          type_calcul: typeCalcul,
          valeur_calcul: Number(valeur),
          formule_parente: null,
          formules_associees: [],
          toutes_formules: true,
        });
      }

      // CAS 4 — Prix par formule : create ou update selon existence
      if (mode === 'par_formule') {
        // Récupère tous les items existants pour détecter les doublons
        const allItems = await base44.entities.CatalogueItem.list();
        const nomTarif = nomSeul;

        for (const [nomFormule, prixVal] of Object.entries(prixParFormule)) {
          if (prixVal === '' || prixVal === null) continue;
          const prixNum = Number(prixVal);

          // Cherche un item existant avec même nom + associé à cette seule formule
          const existant = allItems.find(i =>
            i.nom === nomTarif &&
            i.section === 'tarifs' &&
            i.formules_associees?.length === 1 &&
            i.formules_associees[0] === nomFormule
          );

          if (existant) {
            await base44.entities.CatalogueItem.update(existant.id, {
              prix: prixNum,
              type_calcul: 'fixe',
              valeur_calcul: null,
              formule_parente: null,
            });
          } else {
            await base44.entities.CatalogueItem.create({
              nom: nomTarif,
              section: 'tarifs',
              type_tarif: formule.type_tarif || 'autre',
              prix: prixNum,
              type_calcul: 'fixe',
              valeur_calcul: null,
              formule_parente: null,
              formules_associees: [nomFormule],
              toutes_formules: false,
              actif: true,
            });
          }
        }
      }

      toast.success('✓ Prix mis à jour', {
        position: 'top-center', duration: 2000, style: { background: '#16a34a', color: '#fff' },
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Erreur handleSave:', err);
      toast.error('Erreur lors de la sauvegarde : ' + (err?.message || 'inconnue'), {
        position: 'top-center', duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Titre */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base">💰 Prix — {nomSeul}</h2>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Modes radio */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode de tarification</p>
            <div className="space-y-2">
              {MODES.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="mode_prix"
                    value={m.id}
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── CAS 1 : Prix fixe ─────────────────────────────────────────── */}
          {mode === 'fixe' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prix}
                  onChange={e => setPrix(e.target.value)}
                  placeholder="ex: 45.00"
                  autoFocus
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-16 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€/pers.</span>
              </div>
              <p className="text-xs text-muted-foreground">S'applique à toutes les formules.</p>
            </div>
          )}

          {/* ── CAS 2 : Déduction uniforme ────────────────────────────────── */}
          {mode === 'uniforme' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Déduction</label>
                <DeductionInput valeur={valeur} setValeur={setValeur} unite={unite} setUnite={setUnite} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">S'applique aux formules</label>
                <div className="space-y-1">
                  {formulesDisponibles.map(f => {
                    const nom = f.nom.split('—')[0].trim();
                    const apercu = f.prix ? calcApercu(f.prix, unite, valeur) : null;
                    const checked = formulesSel.includes(nom);
                    return (
                      <label key={f.id} className="flex items-center gap-3 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFormule(nom)}
                          className="accent-primary"
                        />
                        <span className="text-sm flex-1">{nom}</span>
                        {f.prix > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {f.prix}€
                            {checked && apercu !== null && (
                              <span className="ml-1 font-semibold text-primary">→ {apercu.toFixed(0)}€</span>
                            )}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {formulesSel.length === 0 && (
                  <p className="text-xs text-amber-600">⚠️ Sélectionnez au moins une formule</p>
                )}
              </div>
            </div>
          )}

          {/* ── CAS 3 : Déduction sur formule client ──────────────────────── */}
          {mode === 'client' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Déduction</label>
                <DeductionInput valeur={valeur} setValeur={setValeur} unite={unite} setUnite={setUnite} />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                <p className="text-xs text-blue-700 leading-relaxed">
                  ℹ️ Le prix sera calculé automatiquement selon la formule choisie par le client.
                </p>
              </div>
            </div>
          )}

          {/* ── CAS 4 : Prix par formule ──────────────────────────────────── */}
          {mode === 'par_formule' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix par formule</label>
              <p className="text-xs text-muted-foreground">Laisser vide = non appliqué à cette formule.</p>
              <div className="space-y-2">
                {formulesDisponibles.map(f => {
                  const nom = f.nom.split('—')[0].trim();
                  return (
                    <div key={f.id} className="flex items-center gap-3">
                      <span className="text-sm flex-1 min-w-0 truncate">{nom}</span>
                      {f.prix > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">base {f.prix}€</span>
                      )}
                      <div className="relative w-28 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prixParFormule[nom] ?? ''}
                          onChange={e => setPrixParFormule(prev => ({ ...prev, [nom]: e.target.value }))}
                          placeholder="—"
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-2 justify-end px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '…' : '✓ Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}