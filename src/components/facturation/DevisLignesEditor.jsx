import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const TVA_OPTIONS = [0, 5.5, 10, 20];
const UNITE_OPTIONS = ['pers', 'h', 'j', 'forfait', 'lot'];

function calcLigneTotalHT(ligne) {
  const brut = (ligne.quantite || 0) * (ligne.prix_unitaire_ht || 0);
  if (ligne.remise_type === 'pct') {
    return brut * (1 - (ligne.remise || 0) / 100);
  } else if (ligne.remise_type === 'fixe') {
    return Math.max(0, brut - (ligne.remise || 0));
  }
  return brut;
}

function LigneRow({ ligne, onChange, onDelete, options, modeSaisie = 'ht', assujetti = true }) {
  const [showPicker, setShowPicker] = useState(false);
  const [showRemise, setShowRemise] = useState((ligne.remise || 0) > 0);

  const set = (k, v) => {
    const updated = { ...ligne, [k]: v };
    updated.total_ht = calcLigneTotalHT(updated);
    onChange(updated);
  };

  const setTTC = (ttcVal) => {
    const taux = ligne.tva_taux ?? 20;
    const ht = ttcVal / (1 + taux / 100);
    const updated = { ...ligne, prix_unitaire_ht: Math.round(ht * 100) / 100 };
    updated.total_ht = calcLigneTotalHT(updated);
    onChange(updated);
  };

  const prixAffiche = modeSaisie === 'ttc'
    ? Math.round((ligne.prix_unitaire_ht || 0) * (1 + (ligne.tva_taux ?? 20) / 100) * 100) / 100
    : (ligne.prix_unitaire_ht || 0);

  const brut = (ligne.quantite || 0) * (ligne.prix_unitaire_ht || 0);
  const totalHT = calcLigneTotalHT(ligne);
  const totalAffiche = modeSaisie === 'ttc'
    ? Math.round(totalHT * (1 + (ligne.tva_taux ?? 20) / 100) * 100) / 100
    : totalHT;
  const hasRemise = showRemise;

  return (
    <>
      {/* Desktop: Table row */}
      <div className="hidden md:block border-b border-border/50 last:border-0 py-2 space-y-1">
        <div className="grid grid-cols-12 gap-2 items-start">
          <div className={`${assujetti ? 'col-span-4' : 'col-span-5'} relative`}>
            <Input
              value={ligne.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Description de la prestation…"
              className="text-sm h-8"
              onFocus={() => setShowPicker(true)}
              onBlur={() => setTimeout(() => setShowPicker(false), 200)}
            />
            {showPicker && options.length > 0 && (
              <div className="absolute top-9 left-0 right-0 z-10 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {options.filter(o => !ligne.description || o.nom.toLowerCase().includes(ligne.description.toLowerCase())).map(o => (
                  <button
                    key={o.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => {
                      const updated = { ...ligne, description: o.nom, prix_unitaire_ht: o.prix || 0 };
                      updated.total_ht = calcLigneTotalHT(updated);
                      onChange(updated);
                    }}
                  >
                    <span className="font-medium">{o.nom}</span>
                    {o.prix && <span className="text-muted-foreground ml-2 text-xs">{o.prix} €</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Unité */}
          <div className="col-span-1">
            <select value={ligne.unite || 'pers'} onChange={e => set('unite', e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-transparent px-1 text-xs">
              {UNITE_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <Input type="number" value={ligne.quantite || ''} onChange={e => set('quantite', parseFloat(e.target.value) || 0)} placeholder="1" className="text-sm h-8 text-center" min="0" />
          </div>
          <div className={assujetti ? 'col-span-2' : 'col-span-3'}>
            <Input
              type="number"
              value={prixAffiche || ''}
              onChange={e => modeSaisie === 'ttc' ? setTTC(parseFloat(e.target.value) || 0) : set('prix_unitaire_ht', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-sm h-8"
              min="0"
            />
          </div>
          {assujetti && (
            <div className="col-span-2">
              <select value={ligne.tva_taux ?? 20} onChange={e => set('tva_taux', parseFloat(e.target.value))} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </div>
          )}
          <div className="col-span-1 h-8 flex items-center justify-end text-sm font-medium">
            <span className={hasRemise ? 'text-primary' : 'text-muted-foreground'}>{totalAffiche.toFixed(2)} €</span>
          </div>
          <div className="col-span-1 flex justify-end gap-0.5">
            <button
              onClick={() => { setShowRemise(v => !v); if (showRemise) set('remise', 0); }}
              title="Remise sur cette ligne"
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${showRemise ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              %
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {hasRemise && (
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5 col-start-1 flex items-center gap-2 pl-1">
              <span className="text-xs text-muted-foreground">Remise :</span>
              <select value={ligne.remise_type || 'pct'} onChange={e => set('remise_type', e.target.value)} className="h-6 text-xs rounded border border-input bg-transparent px-1">
                <option value="pct">%</option>
                <option value="fixe">€ fixe</option>
              </select>
              <Input type="number" value={ligne.remise || ''} onChange={e => set('remise', parseFloat(e.target.value) || 0)} placeholder="0" className="h-6 text-xs w-20" min="0" />
              <span className="text-xs text-muted-foreground line-through">{brut.toFixed(2)} €</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Card */}
      <div className="md:hidden bg-card rounded-xl border border-border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 relative">
            <Input
              value={ligne.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Description…"
              className="text-sm h-8"
              onFocus={() => setShowPicker(true)}
              onBlur={() => setTimeout(() => setShowPicker(false), 200)}
            />
            {showPicker && options.length > 0 && (
              <div className="absolute top-9 left-0 right-0 z-10 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {options.filter(o => !ligne.description || o.nom.toLowerCase().includes(ligne.description.toLowerCase())).map(o => (
                  <button
                    key={o.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => {
                      const updated = { ...ligne, description: o.nom, prix_unitaire_ht: o.prix || 0 };
                      updated.total_ht = calcLigneTotalHT(updated);
                      onChange(updated);
                    }}
                  >
                    <span className="font-medium text-xs">{o.nom}</span>
                    {o.prix && <span className="text-muted-foreground ml-2 text-xs">{o.prix} €</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
            <Trash2 size={16} />
          </button>
        </div>

        <div className={`grid gap-2 ${assujetti ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <label className="text-xs text-muted-foreground">Unité</label>
            <select value={ligne.unite || 'pers'} onChange={e => set('unite', e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-transparent px-1 text-xs">
              {UNITE_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Quantité</label>
            <Input type="number" value={ligne.quantite || ''} onChange={e => set('quantite', parseFloat(e.target.value) || 0)} placeholder="1" className="text-xs h-8 text-center" min="0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{assujetti ? (modeSaisie === 'ttc' ? 'PU TTC' : 'PU HT') : 'Prix'}</label>
            <Input
              type="number"
              value={prixAffiche || ''}
              onChange={e => modeSaisie === 'ttc' ? setTTC(parseFloat(e.target.value) || 0) : set('prix_unitaire_ht', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-xs h-8"
              min="0"
            />
          </div>
          {assujetti && (
            <div>
              <label className="text-xs text-muted-foreground">TVA</label>
              <select value={ligne.tva_taux ?? 20} onChange={e => set('tva_taux', parseFloat(e.target.value))} className="flex h-8 w-full rounded-md border border-input bg-transparent px-1 text-xs">
                {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{!assujetti ? 'Total' : modeSaisie === 'ttc' ? 'Total TTC' : 'Total HT'}</span>
            <button
              onClick={() => { setShowRemise(v => !v); if (showRemise) set('remise', 0); }}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${showRemise ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              % remise
            </button>
          </div>
          <span className={`text-sm font-bold ${showRemise ? 'text-primary' : 'text-foreground'}`}>{totalAffiche.toFixed(2)} €</span>
        </div>

        {hasRemise && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Remise :</span>
            <select value={ligne.remise_type || 'pct'} onChange={e => set('remise_type', e.target.value)} className="h-6 text-xs rounded border border-input bg-transparent px-1">
              <option value="pct">%</option>
              <option value="fixe">€</option>
            </select>
            <Input type="number" value={ligne.remise || ''} onChange={e => set('remise', parseFloat(e.target.value) || 0)} placeholder="0" className="h-6 text-xs w-16" min="0" />
            <span className="text-muted-foreground line-through text-xs">{brut.toFixed(2)} €</span>
          </div>
        )}
      </div>
    </>
  );
}

export default function DevisLignesEditor({ lignes, onChange, options = [], modeSaisie = 'ht' }) {
  const { settings } = useOwnerCompanySettings();
  const tvaTauxDefaut = settings?.tva_taux_defaut ?? 20;
  const assujetti = settings?.assujetti_tva !== false;

  const addLigne = () => {
    onChange([...lignes, { id: crypto.randomUUID(), description: '', unite: 'pers', quantite: 1, prix_unitaire_ht: 0, tva_taux: tvaTauxDefaut, total_ht: 0, remise: 0, remise_type: 'pct' }]);
  };

  const updateLigne = (idx, updated) => {
    const next = [...lignes];
    next[idx] = updated;
    onChange(next);
  };

  const deleteLigne = (idx) => {
    onChange(lignes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Desktop Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
        <div className={assujetti ? 'col-span-4' : 'col-span-5'}>Description</div>
        <div className="col-span-1">Unité</div>
        <div className="col-span-1 text-center">Qté</div>
        <div className={assujetti ? 'col-span-2' : 'col-span-3'}>Prix (€)</div>
        {assujetti && <div className="col-span-2">TVA</div>}
        <div className="col-span-1 text-right">{assujetti ? (modeSaisie === 'ttc' ? 'Total TTC' : 'Total HT') : 'Total'}</div>
        <div className="col-span-1" />
      </div>

      {lignes.map((ligne, idx) => (
        <LigneRow
          key={ligne.id || idx}
          ligne={ligne}
          onChange={updated => updateLigne(idx, updated)}
          onDelete={() => deleteLigne(idx)}
          options={options}
          modeSaisie={assujetti ? modeSaisie : 'ht'}
          assujetti={assujetti}
        />
      ))}

      <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={addLigne}>
        <Plus size={13} /> Ajouter une ligne
      </Button>
    </div>
  );
}