import HelpTooltip from '@/components/HelpTooltip';

export default function DelaiInput({ label, value, onChange, positive = false, tooltip = null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {tooltip && <HelpTooltip text={tooltip} />}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <span className="text-xs text-muted-foreground shrink-0">j</span>
      </div>
      {!positive && (
        <p className="text-xs text-muted-foreground">
          {value < 0 ? `J${value}` : value > 0 ? `J+${value}` : 'Jour J'}
        </p>
      )}
    </div>
  );
}