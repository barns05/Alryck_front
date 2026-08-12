import { useState } from 'react';
import { X, FileSpreadsheet, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImportClientsExcelModal from './ImportClientsExcelModal';
import ImportClientDocumentModal from './ImportClientDocumentModal';

export default function WelcomeImportModal({ onClose }) {
  const [showExcel, setShowExcel] = useState(false);
  const [showDocument, setShowDocument] = useState(false);

  if (showExcel) return <ImportClientsExcelModal onClose={() => { setShowExcel(false); onClose(); }} />;
  if (showDocument) return <ImportClientDocumentModal onClose={() => { setShowDocument(false); onClose(); }} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-2xl">🎉</div>
              <h2 className="text-xl font-bold">Bienvenue sur Planyse !</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous avez déjà des clients et des documents ?<br />
              Importez-les en quelques clics pour démarrer immédiatement.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={() => setShowExcel(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-emerald-400 hover:bg-emerald-50 transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
              <FileSpreadsheet size={22} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Importer depuis Excel / CSV</p>
              <p className="text-xs text-muted-foreground mt-0.5">Correspondance automatique des colonnes · Création en masse</p>
            </div>
            <ArrowRight size={16} className="text-muted-foreground shrink-0 group-hover:text-emerald-600 transition-colors" />
          </button>

          <button
            onClick={() => setShowDocument(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Sparkles size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Importer depuis un document</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF, photo, Word — Amanda extrait toutes les informations</p>
            </div>
            <ArrowRight size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>
        </div>

        <div className="pt-1">
          <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onClose}>
            Commencer sans importer →
          </Button>
        </div>
      </div>
    </div>
  );
}