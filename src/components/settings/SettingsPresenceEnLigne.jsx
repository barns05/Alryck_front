import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const ICON_OPTIONS = [
  { value: 'instagram', label: 'Instagram', slug: 'instagram', color: '#E1306C' },
  { value: 'facebook',  label: 'Facebook',  slug: 'facebook',  color: '#1877F2' },
  { value: 'tiktok',    label: 'TikTok',    slug: 'tiktok',    color: '#000000' },
  { value: 'youtube',   label: 'YouTube',   slug: 'youtube',   color: '#FF0000' },
  { value: 'linkedin',  label: 'LinkedIn',  slug: 'linkedin',  color: '#0A66C2' },
  { value: 'twitter',   label: 'X / Twitter', slug: 'x',       color: '#000000' },
  { value: 'pinterest', label: 'Pinterest', slug: 'pinterest', color: '#E60023' },
  { value: 'snapchat',  label: 'Snapchat',  slug: 'snapchat',  color: '#FFFC00' },
];

function SocialIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = ICON_OPTIONS.find(o => o.value === value) || ICON_OPTIONS[0];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 border border-input rounded-lg px-2 py-1.5 bg-background hover:bg-muted/50 transition-colors">
        <span className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: selected.color }}>
          <img src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${selected.slug}.svg`} alt={selected.label} className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
        </span>
        <span className="text-sm">{selected.label}</span>
        <span className="text-muted-foreground text-xs ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-lg p-2 grid grid-cols-2 gap-1 w-44">
          {ICON_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-muted/60 ${value === opt.value ? 'bg-muted font-medium' : ''}`}>
              <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: opt.color }}>
                <img src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${opt.slug}.svg`} alt={opt.label} className="w-3 h-3" style={{ filter: 'brightness(0) invert(1)' }} />
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPresenceEnLigne({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [socialNetworks, setSocialNetworks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setSocialNetworks(settings.social_networks || []);
  }, [settings]);

  const addNetwork = () => setSocialNetworks(prev => [...prev, { name: '', url: '', icon: 'instagram' }]);
  const removeNetwork = (i) => setSocialNetworks(prev => prev.filter((_, idx) => idx !== i));
  const updateNetwork = (i, field, value) => setSocialNetworks(prev => prev.map((n, idx) => idx === i ? { ...n, [field]: value } : n));

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(settings.id, { social_networks: socialNetworks });
    qc.invalidateQueries(['company-settings']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      {socialNetworks.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun réseau social ajouté</p>
      )}
      <div className="space-y-2">
        {socialNetworks.map((network, i) => (
          <div key={i} className="flex items-center gap-2">
            <SocialIconPicker value={network.icon} onChange={v => updateNetwork(i, 'icon', v)} />
            <Input value={network.name} onChange={e => updateNetwork(i, 'name', e.target.value)} placeholder="Nom" className="w-28 text-sm shrink-0" />
            <Input value={network.url} onChange={e => updateNetwork(i, 'url', e.target.value)} placeholder="https://..." className="flex-1 text-sm" />
            {network.url && (
              <a href={network.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={() => removeNetwork(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addNetwork} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
        <Plus size={13} /> Ajouter un réseau
      </button>
      <Button onClick={handleSave} disabled={saving || !settings?.id} className="w-full gap-2">
        <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}