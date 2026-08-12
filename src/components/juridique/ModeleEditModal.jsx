/**
 * ModeleEditModal — édition d'un modèle dynamique existant (contenu_dynamique).
 *
 * Affiche le texte du modèle dans un textarea éditable, avec le même bandeau
 * d'avertissement que l'extraction IA. Permet de modifier librement le texte
 * (y compris ajouter/retirer des balises {{CHAMP}}).
 *
 * Au clic sur "Enregistrer les modifications" :
 * - Régénère le PDF d'aperçu via generateContratPDF en mode bodyText
 * - Met à jour contenu_dynamique et modele_url sur l'enregistrement existant
 *
 * Règles inchangées : pas de signature électronique, type='modele' conservé,
 * bandeau d'avertissement présent.
 */
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, AlertTriangle, Loader2, Check, BookOpen, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateContratPDF } from './generateContratPDF';
import BibliothequeArticlesPanel from './BibliothequeArticlesPanel';
import { appendArticleToText } from '@/lib/bibliothequeArticles';

export default function ModeleEditModal({ modele, onClose }) {
  const qc = useQueryClient();
  const [texte, setTexte] = useState(modele?.contenu_dynamique || '');
  const [saving, setSaving] = useState(false);
  const [showBibliotheque, setShowBibliotheque] = useState(false);
  const textareaRef = useRef(null);
  const [varName, setVarName] = useState('');

  const { data: company } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const handleSave = async () => {
    if (!texte.trim()) { toast.error('Le contenu du modèle est vide'); return; }
    setSaving(true);
    try {
      // Régénérer le PDF d'aperçu (balises {{CHAMP}} visibles)
      const safeName = (modele.titre || 'modele-dynamique').replace(/[^a-zA-Z0-9-_]/g, '_');
      const doc = generateContratPDF({
        bodyText: texte,
        company,
        titreModele: modele.titre,
        fields: {},
      });
      const pdfBlob = doc.output('blob');
      const pdfFileName = `${safeName}.pdf`;
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      const { file_url: modeleUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Metre à jour l'enregistrement existant
      await base44.entities.Contrat.update(modele.id, {
        contenu_dynamique: texte,
        modele_url: modeleUrl,
        modele_nom: pdfFileName,
      });

      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['modeles']);

      toast.success('Modèle mis à jour.');
      onClose();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement : " + (e?.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Normalisation du nom de variable personnalisée ───
  const normalizeVarName = (raw) => {
    return raw
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleInsertVariable = () => {
    const normalized = normalizeVarName(varName);
    if (!normalized) { toast.error('Nom de variable invalide'); return; }
    const tag = `{{${normalized}}}`;
    const ta = textareaRef.current;
    if (ta && document.activeElement === ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = texte.slice(0, start) + tag + texte.slice(end);
      setTexte(newText);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + tag.length, start + tag.length);
      });
    } else {
      setTexte(prev => prev + tag);
    }
    setVarName('');
    toast.success('Balise insérée');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-sm">Édition du modèle</h3>
            <p className="text-xs text-muted-foreground truncate">{modele?.titre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Bandeau d'avertissement */}
        <div className="px-6 pt-4 shrink-0">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex gap-2.5">
            <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Ce document ne constitue pas une consultation juridique.</strong> Vérifiez attentivement
              le texte et les clauses sensibles (responsabilité, annulation, paiement) avant utilisation.
            </p>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Texte du modèle (avec placeholders) — éditable
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={varName}
                onChange={e => setVarName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInsertVariable(); } }}
                placeholder="Nom de la variable (ex: CONDITIONS_SPECIALES)"
                className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="off"
              />
              <Button size="sm" variant="outline" onClick={handleInsertVariable} disabled={!varName.trim()} className="gap-1 shrink-0 h-8">
                <Plus size={12} /> Insérer
              </Button>
            </div>
            <textarea
              ref={textareaRef}
              value={texte}
              onChange={e => setTexte(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-border bg-white p-3 text-xs text-foreground font-mono whitespace-pre-wrap resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Texte du modèle avec {{CHAMP}}…"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Les balises <code className="text-primary">{'{{CHAMP}}'}</code> seront substituées automatiquement
              lors de la création d'un contrat client depuis ce modèle. Un nouveau PDF d'aperçu sera régénéré
              à l'enregistrement.
            </p>
            <button
              onClick={() => setShowBibliotheque(true)}
              className="text-xs text-primary hover:underline mt-2 flex items-center gap-1"
            >
              <BookOpen size={12} /> Parcourir la bibliothèque d'articles
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !texte.trim()} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </div>
      {showBibliotheque && (
        <BibliothequeArticlesPanel
          company={company}
          onAddArticle={(article) => setTexte(prev => appendArticleToText(prev, article))}
          onClose={() => setShowBibliotheque(false)}
        />
      )}
    </div>
  );
}