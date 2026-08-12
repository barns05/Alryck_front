/**
 * FaqEditor — Sélection administrateur des questions/réponses FAQ.
 *
 * Affiche les questions suggérées par groupe métier (FAQ_PAR_GROUPE), chacune avec
 * une case à cocher + un champ texte pour la réponse (visible si cochée). Bouton
 * « + Ajouter une question personnalisée » pour saisir une question hors bibliothèque.
 * Limite de 6 questions suggérées actives. Stocké dans CompanySettings.faq.
 */
import { Plus, Trash2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getFaqSuggestions } from '@/config/metierConfig';

const MAX_SUGGESTED = 6;

export default function FaqEditor({ groupe, faq, onChange }) {
  const suggestions = getFaqSuggestions(groupe);
  const faqArr = Array.isArray(faq) ? faq : [];
  const biblioActive = faqArr.filter(f => f.source !== 'custom');
  const customItems = faqArr.map((f, i) => ({ ...f, _idx: i })).filter(f => f.source === 'custom');

  const isBiblioActive = (q) => biblioActive.some(f => f.question === q);

  const toggleBiblio = (q) => {
    if (isBiblioActive(q)) {
      onChange(faqArr.filter(f => !(f.source !== 'custom' && f.question === q)));
    } else {
      if (biblioActive.length >= MAX_SUGGESTED) return;
      onChange([...faqArr, { question: q, reponse: '', source: 'biblio' }]);
    }
  };
  const setReponse = (q, reponse) => {
    onChange(faqArr.map(f => (f.question === q && f.source !== 'custom' ? { ...f, reponse } : f)));
  };
  const addCustom = () => {
    onChange([...faqArr, { question: '', reponse: '', source: 'custom' }]);
  };
  const updateCustom = (idx, field, value) => {
    onChange(faqArr.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  };
  const removeCustom = (idx) => {
    onChange(faqArr.filter((_, i) => i !== idx));
  };

  const capReached = biblioActive.length >= MAX_SUGGESTED;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="text-xs font-medium text-muted-foreground">💬 FAQ</label>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cochez 3 à 6 questions et rédigez une réponse courte. Affichées sur votre fiche publique en accordéon.</p>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mt-0.5">{biblioActive.length}/{MAX_SUGGESTED}</span>
      </div>

      <div className="space-y-2">
        {suggestions.map((q) => {
          const active = isBiblioActive(q);
          return (
            <div key={q} className="rounded-xl border border-border bg-background overflow-hidden">
              <button
                type="button"
                onClick={() => toggleBiblio(q)}
                disabled={!active && capReached}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${active ? 'bg-[#FFFBF0]' : 'hover:bg-muted/40'} ${!active && capReached ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${active ? 'border-[#C5A059] bg-[#C5A059]' : 'border-border bg-background'}`}>
                  {active && <Check size={12} className="text-white" />}
                </span>
                <span className="text-sm text-slate-800 leading-snug">{q}</span>
              </button>
              {active && (
                <div className="px-3 pb-3 pt-2 border-t border-[#C5A059]/20">
                  <Textarea
                    value={faqArr.find(f => f.source !== 'custom' && f.question === q)?.reponse || ''}
                    onChange={(e) => setReponse(q, e.target.value)}
                    placeholder="Votre réponse…"
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addCustom} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
        <Plus size={14} /> Ajouter une question personnalisée
      </button>

      {customItems.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vos questions personnalisées</p>
          {customItems.map((f) => (
            <div key={f._idx} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={f.question}
                  onChange={(e) => updateCustom(f._idx, 'question', e.target.value)}
                  placeholder="Votre question…"
                  className="text-sm flex-1"
                />
                <button type="button" onClick={() => removeCustom(f._idx)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <Textarea
                value={f.reponse}
                onChange={(e) => updateCustom(f._idx, 'reponse', e.target.value)}
                placeholder="Votre réponse…"
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}