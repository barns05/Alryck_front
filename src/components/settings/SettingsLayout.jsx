import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Layout wrapper pour les pages Settings
 * Fournit :
 * - Message "Modifications non sauvegardées" en haut (sticky)
 * - Bouton Sauvegarder en bas (sticky sur mobile, visible en tout temps)
 * - Padding suffisant pour que le contenu ne soit jamais caché
 */
export default function SettingsLayout({
  children,
  isDirty = false,
  isSaving = false,
  onSave = () => {},
  title = 'Paramètres',
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Message d'alerte sticky en haut */}
      {isDirty && (
        <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-700 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">Modifications non sauvegardées</p>
        </div>
      )}

      {/* Contenu avec padding suffisant en bas */}
      <div className="flex-1 pb-24 md:pb-0">
        {children}
      </div>

      {/* Bouton Sauvegarder sticky en bas */}
      <div className="fixed bottom-0 left-0 right-0 md:relative bg-background border-t border-border px-4 py-4 md:px-0 md:py-0 md:bg-transparent md:border-0">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="w-full gap-2"
          >
            💾 {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}