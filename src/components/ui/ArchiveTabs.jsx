/**
 * Composant réutilisable pour l'onglet Actifs / Archivés.
 * Props :
 *   - value: 'actifs' | 'archives'
 *   - onChange: (value: string) => void
 *   - countActifs: number
 *   - countArchives: number
 *   - archiveMessage: string (optionnel) — message affiché sous les onglets quand archives actif
 */
export default function ArchiveTabs({ value, onChange, countActifs, countArchives, archiveMessage }) {
  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange('actifs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === 'actifs' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Actifs ({countActifs})
        </button>
        <button
          onClick={() => onChange('archives')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === 'archives' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          🗃️ Archivés ({countArchives})
        </button>
      </div>
      {value === 'archives' && archiveMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
          {archiveMessage}
        </div>
      )}
    </>
  );
}