/**
 * RappelCheckboxes — Deux cases indépendantes pour configurer les rappels d'un RDV
 * Props: rappel1j (bool), rappel1h (bool), onChange({rappel_1j, rappel_1h})
 */
export default function RappelCheckboxes({ rappel1j = false, rappel1h = false, onChange }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">🔔 Rappels (optionnel)</p>
      <div className="flex gap-2">
        <label
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
          style={{
            borderColor: rappel1j ? '#fde68a' : '#e2e8f0',
            background: rappel1j ? '#fffbeb' : 'white',
          }}>
          <input
            type="checkbox"
            checked={rappel1j}
            onChange={e => onChange({ rappel_1j: e.target.checked, rappel_1h: rappel1h })}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="text-xs font-medium" style={{ color: '#1e1b4b' }}>1 jour avant</span>
        </label>
        <label
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
          style={{
            borderColor: rappel1h ? '#fed7aa' : '#e2e8f0',
            background: rappel1h ? '#fff7ed' : 'white',
          }}>
          <input
            type="checkbox"
            checked={rappel1h}
            onChange={e => onChange({ rappel_1j: rappel1j, rappel_1h: e.target.checked })}
            className="w-4 h-4 accent-orange-500"
          />
          <span className="text-xs font-medium" style={{ color: '#1e1b4b' }}>1 heure avant</span>
        </label>
      </div>
    </div>
  );
}