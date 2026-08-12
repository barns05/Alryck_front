/**
 * TarifWizardModal — wizard 2 étapes pour créer un tarif spécial.
 *
 * Étape 1 : Identité (nom)
 * Étape 2 : Prix (3 modes)
 *
 * Modes :
 *   MODE 1 — Prix fixe
 *   MODE 2 — Déduction / Supplément sur formule principale (toutes formules, calculé auto)
 *   MODE 3 — Prix par formule (une ligne par formule)
 */
import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Check, X, Minus, Plus } from 'lucide-react';

const STEP_LABELS = ['Identité', 'Prix'];

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {STEP_LABELS.map((label, i) => {
        const active = i === step;
        const done   = i < step;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done   ? 'bg-emerald-500 text-white' :
                  active ? 'bg-primary text-white' :
                           'bg-muted text-muted-foreground'}`}>
                {done ? <Check size={13} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px mx-1.5 mt-[-10px] ${done ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TarifWizardModal({ formulesItems = [], defaultFormule, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [nom, setNom]   = useState('');
  const [typeTarif, setTypeTarif] = useState('autre');

  // Mode 1
  const [prixFixe, setPrixFixe] = useState('');

  // Mode 2
  const [signe, setSigne]         = useState('-');   // '-' | '+'
  const [dedValeur, setDedValeur] = useState('');
  const [dedUnite, setDedUnite]   = useState('€');   // '€' | '%'
  const [autoFormulesSel, setAutoFormulesSel] = useState(() =>
    formulesItems.map(f => f.nom.split('—')[0].trim())
  );

  // Mode 3
  const initPrixParFormule = () => {
    const map = {};
    formulesItems.forEach(f => { map[f.nom.split('—')[0].trim()] = ''; });
    return map;
  };
  const [prixParFormule, setPrixParFormule] = useState(initPrixParFormule);

  const [prixMode, setPrixMode] = useState('fixe'); // 'fixe' | 'auto' | 'par_formule'
  const [saving, setSaving] = useState(false);

  const toggleAutoFormule = (nf) =>
    setAutoFormulesSel(prev => prev.includes(nf) ? prev.filter(x => x !== nf) : [...prev, nf]);

  const calcApercu = (prixBase) => {
    const v = parseFloat(dedValeur);
    if (isNaN(v) || !prixBase) return null;
    const result = dedUnite === '%'
      ? (signe === '-' ? prixBase - prixBase * v / 100 : prixBase + prixBase * v / 100)
      : (signe === '-' ? prixBase - v : prixBase + v);
    return Math.max(0, result);
  };

  const canNext1 = nom.trim().length > 0;
  const canCreate = () => {
    if (prixMode === 'fixe') return prixFixe !== '';
    if (prixMode === 'auto') return dedValeur !== '' && autoFormulesSel.length > 0;
    if (prixMode === 'par_formule') return Object.values(prixParFormule).some(v => v !== '');
    return false;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (prixMode === 'fixe') {
        await base44.entities.CatalogueItem.create({
          section: 'tarifs',
          nom: nom.trim(),
          type_tarif: typeTarif,
          prix: Number(prixFixe),
          type_calcul: 'fixe',
          valeur_calcul: null,
          formule_parente: defaultFormule || null,
          formules_associees: [],
          toutes_formules: true,
          actif: true,
        });
      } else if (prixMode === 'auto') {
        const typeCalcul = signe === '+'
          ? (dedUnite === '%' ? 'supplement_pourcentage' : 'supplement_montant')
          : (dedUnite === '%' ? 'deduction_pourcentage'  : 'deduction_montant');
        await base44.entities.CatalogueItem.create({
          section: 'tarifs',
          nom: nom.trim(),
          type_tarif: typeTarif,
          prix: null,
          type_calcul: typeCalcul,
          valeur_calcul: Number(dedValeur),
          formule_parente: defaultFormule || null,
          formules_associees: autoFormulesSel,
          toutes_formules: false,
          actif: true,
        });
      } else {
        // par_formule — un item par formule renseignée
        const entries = Object.entries(prixParFormule).filter(([, v]) => v !== '');
        for (const [nomF, prixVal] of entries) {
          await base44.entities.CatalogueItem.create({
            section: 'tarifs',
            nom: nom.trim(),
            type_tarif: typeTarif,
            prix: Number(prixVal),
            type_calcul: 'fixe',
            valeur_calcul: null,
            formule_parente: defaultFormule || null,
            formules_associees: [nomF],
            toutes_formules: false,
            actif: true,
          });
        }
      }
      toast.success('✓ Tarif créé', {
        position: 'top-center', duration: 2000,
        style: { background: '#16a34a', color: '#fff' },
      });
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1 shrink-0">
          <h2 className="font-bold text-base">💰 Nouveau tarif</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 pt-3 shrink-0">
          <Stepper step={step} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">

          {/* ── ÉTAPE 1 : Identité ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom *</label>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="ex: Menu enfant, Tarif prestataire…"
                  autoFocus
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type de tarif</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'formule',     label: '💰 Formule/Menu' },
                    { value: 'enfant',      label: '🧒 Enfant' },
                    { value: 'ado',         label: '🧑 Ado' },
                    { value: 'prestataire', label: '👷 Prestataire' },
                    { value: 'supplement',  label: '➕ Supplément' },
                    { value: 'heure_supp',  label: '⏱ Heure sup' },
                    { value: 'autre',       label: 'Autre' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTypeTarif(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        typeTarif === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 2 : Prix ── */}
          {step === 1 && (
            <div className="space-y-4">

              {/* MODE 1 — Prix fixe */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="prixMode" value="fixe"
                  checked={prixMode === 'fixe'} onChange={() => setPrixMode('fixe')}
                  className="mt-1 accent-primary" />
                <div className="flex-1 space-y-1.5">
                  <span className="text-sm font-medium">Prix fixe</span>
                  {prixMode === 'fixe' && (
                    <div className="relative">
                      <input type="number" min="0" step="0.01"
                        value={prixFixe} onChange={e => setPrixFixe(e.target.value)}
                        placeholder="ex: 18" autoFocus
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-14 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/pers.</span>
                    </div>
                  )}
                </div>
              </label>

              {/* MODE 2 — Déduction / Supplément auto */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="prixMode" value="auto"
                  checked={prixMode === 'auto'} onChange={() => setPrixMode('auto')}
                  className="mt-1 accent-primary" />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-medium">Déduction / Supplément sur formule</span>
                  {prixMode === 'auto' && (
                    <>
                      {/* Toggle ➖ / ➕ */}
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                          <button type="button" onClick={() => setSigne('-')}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${signe === '-' ? 'bg-red-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                            <Minus size={12} /> Déduction
                          </button>
                          <button type="button" onClick={() => setSigne('+')}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${signe === '+' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                            <Plus size={12} /> Supplément
                          </button>
                        </div>
                      </div>
                      {/* Valeur + unité */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                            {signe}
                          </span>
                          <input type="number" min="0" step="0.01"
                            value={dedValeur} onChange={e => setDedValeur(e.target.value)}
                            placeholder="0" autoFocus
                            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-6 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                          {['€', '%'].map(u => (
                            <button key={u} type="button" onClick={() => setDedUnite(u)}
                              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${dedUnite === u ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Sélection des formules concernées */}
                      <div className="space-y-1 pt-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formules concernées</p>
                        {formulesItems.map(f => {
                          const nf = f.nom.split('—')[0].trim();
                          const checked = autoFormulesSel.includes(nf);
                          const apercu = checked && dedValeur !== '' ? calcApercu(f.prix) : null;
                          return (
                            <label key={f.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-muted/50">
                              <input type="checkbox" checked={checked}
                                onChange={() => toggleAutoFormule(nf)}
                                className="accent-primary shrink-0" />
                              <span className="text-sm flex-1 truncate">{nf}</span>
                              {f.prix > 0 && (
                                <span className="text-xs text-muted-foreground shrink-0">({f.prix}€)</span>
                              )}
                              {apercu !== null && (
                                <span className="text-xs font-semibold text-primary shrink-0">→ {apercu.toFixed(0)}€</span>
                              )}
                            </label>
                          );
                        })}
                        {autoFormulesSel.length === 0 && (
                          <p className="text-xs text-amber-600 px-2">⚠️ Sélectionnez au moins une formule</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </label>

              {/* MODE 3 — Prix par formule */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="prixMode" value="par_formule"
                  checked={prixMode === 'par_formule'} onChange={() => setPrixMode('par_formule')}
                  className="mt-1 accent-primary" />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-medium">Prix par formule</span>
                  {prixMode === 'par_formule' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground">Laisser vide = non appliqué.</p>
                      {formulesItems.map(f => {
                        const nf = f.nom.split('—')[0].trim();
                        return (
                          <div key={f.id} className="flex items-center gap-2">
                            <span className="text-sm flex-1 truncate">{nf}</span>
                            {f.prix > 0 && (
                              <span className="text-xs text-muted-foreground shrink-0">({f.prix}€)</span>
                            )}
                            <div className="relative w-24 shrink-0">
                              <input type="number" min="0" step="0.01"
                                value={prixParFormule[nf] ?? ''}
                                onChange={e => setPrixParFormule(prev => ({ ...prev, [nf]: e.target.value }))}
                                placeholder="—"
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 pr-7 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-border">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <ChevronLeft size={14} /> Retour
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50">
            Annuler
          </button>

          {step === 0 ? (
            <button onClick={() => setStep(1)} disabled={!canNext1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Suivant <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving || !canCreate()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Check size={14} /> {saving ? '…' : 'Créer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}