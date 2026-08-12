/**
 * BibliothequeArticlesPanel — catalogue neutre des articles de clausesLibrary.js.
 *
 * Affiche le bloc universel + le bloc métier pertinent (getClaudesPourMetier).
 * Le prestataire parcourt librement, déploie le texte de chaque article, et
 * ajoute ceux qu'il souhaite à son modèle via onAddArticle.
 *
 * RÈGLE : aucun vocabulaire évaluatif (pas de "suggestion", "lacune", "manquant",
 * "recommandé"). Aucune comparaison avec le contrat du prestataire. Aucun appel
 * LLM. Catalogue statique identique quel que soit le contenu du contrat.
 */
import { useState, useMemo } from 'react';
import { getClaudesPourMetier } from './clausesLibrary';
import { X, BookOpen, Plus, ChevronDown } from 'lucide-react';

export default function BibliothequeArticlesPanel({ company, onAddArticle, onClose }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const { blocA, blocB, categorieLabel } = useMemo(
    () => getClaudesPourMetier(company?.metier, {}),
    [company?.metier]
  );

  const toggleExpand = (key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = (article) => {
    onAddArticle(article);
  };

  const renderArticleCard = (article, index) => {
    const key = `${article.id}-${index}`;
    const isExpanded = expandedKeys.has(key);
    return (
      <div key={key} className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => toggleExpand(key)}
            className="flex-1 text-left flex items-center gap-2 min-w-0"
          >
            <ChevronDown
              size={14}
              className={`text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
            />
            <span className="text-sm font-medium truncate">{article.titre}</span>
          </button>
          <button
            onClick={() => handleAdd(article)}
            className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <Plus size={11} /> Ajouter
          </button>
        </div>
        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto leading-relaxed">
              {article.corps}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm">Bibliothèque d'articles</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Catalogue */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Articles universels ({blocA.length})
            </p>
            {blocA.map((article, i) => renderArticleCard(article, i))}
          </div>

          {blocB.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Articles spécifiques — {categorieLabel} ({blocB.length})
              </p>
              {blocB.map((article, i) => renderArticleCard(article, i + blocA.length))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              Aucun article spécifique à votre métier n'est disponible dans la bibliothèque.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border shrink-0">
          <p className="text-[11px] text-muted-foreground text-center">
            Cliquez sur « Ajouter » pour insérer un article à la fin de votre modèle.
            Le panneau reste ouvert pour ajouter plusieurs articles à la suite.
          </p>
        </div>
      </div>
    </div>
  );
}