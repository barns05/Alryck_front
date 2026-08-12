/**
 * ContactAvisPage — Sous-page « Contact & Avis » de Ma Vitrine.
 * Coordonnées, réseaux sociaux, galerie (inline), avis clients.
 * Tiroir : Informations pratiques jour J.
 */
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Plus, Trash2, ExternalLink, Phone, Mail, Globe, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import SocialIconPicker from '@/components/ma-fiche/SocialIconPicker';
import SettingsGalerie from '@/components/settings/SettingsGalerie';
import InfosPratiquesDrawer from '@/components/ma-fiche/InfosPratiquesDrawer';
import { useVitrineCompletion } from '@/hooks/useVitrineCompletion';
import CompletionBanner from '@/components/ma-fiche/CompletionBanner';

export default function ContactAvisPage({ cs, qc }) {
  const lastCsId = useRef(null);
  const [telephone, setTelephone] = useState('');
  const [emailContact, setEmailContact] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [socialNetworks, setSocialNetworks] = useState([]);
  const [lienAvisExterne, setLienAvisExterne] = useState('');
  const [reviewPlatforms, setReviewPlatforms] = useState([]);
  const [autoReviewEnabled, setAutoReviewEnabled] = useState(false);
  const [autoReviewMessage, setAutoReviewMessage] = useState('');
  const [autoReviewOpen, setAutoReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPratiques, setShowPratiques] = useState(false);
  const { sections } = useVitrineCompletion();

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      setTelephone(cs.telephone || '');
      setEmailContact(cs.email_contact || '');
      setSiteWeb(cs.site_web || '');
      setSocialNetworks(cs.social_networks || []);
      setLienAvisExterne(cs.lien_avis_externe || '');
      setReviewPlatforms(cs.review_platforms || []);
      setAutoReviewEnabled(cs.auto_review_enabled || false);
      setAutoReviewMessage(cs.auto_review_message || '');
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const addNetwork = () => { setSocialNetworks(prev => [...prev, { name: '', url: '', icon: 'instagram' }]); };
  const removeNetwork = (i) => { setSocialNetworks(prev => prev.filter((_, idx) => idx !== i)); };
  const updateNetwork = (i, field, value) => { setSocialNetworks(prev => prev.map((n, idx) => idx === i ? { ...n, [field]: value } : n)); };

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      telephone,
      email_contact: emailContact,
      site_web: siteWeb,
      social_networks: socialNetworks,
      lien_avis_externe: lienAvisExterne || null,
      review_platforms: reviewPlatforms,
      auto_review_enabled: autoReviewEnabled,
      auto_review_message: autoReviewMessage,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    setSaving(false);
    toast.success('Contact & avis enregistrés');
  };

  return (
    <div className="space-y-5">
      {sections?.contact && sections.contact.percentage < 100 && (
        <CompletionBanner section={sections.contact} />
      )}
      {/* Coordonnées */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-base">📞 Coordonnées</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" /> Téléphone</label>
            <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 00 00 00 00" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Mail size={13} className="text-muted-foreground" /> Email</label>
            <Input type="email" value={emailContact} onChange={e => setEmailContact(e.target.value)} placeholder="contact@..." />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5"><Globe size={13} className="text-muted-foreground" /> Site web</label>
          <Input value={siteWeb} onChange={e => setSiteWeb(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Réseaux sociaux */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-base">🌐 Réseaux sociaux</h3>
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
      </div>

      {/* Galerie (inline) */}
      <div>
        <h3 className="font-semibold text-base mb-3">🖼️ Galerie & Avis mis en avant</h3>
        <SettingsGalerie />
      </div>

      {/* Avis clients */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <h3 className="font-semibold text-base">⭐ Avis clients</h3>

        {/* Lien principal */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Lien principal "Voir nos avis" <span className="font-normal">(affiché sur votre vitrine)</span></label>
          <Input value={lienAvisExterne} onChange={e => setLienAvisExterne(e.target.value)} placeholder="https://g.page/votre-fiche/review" />
        </div>

        {/* Plateformes d'avis */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground">Plateformes d'avis</label>
          {reviewPlatforms.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Aucune plateforme. Cliquez sur + pour en ajouter.</p>
          )}
          {reviewPlatforms.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={p.name} onChange={e => { const n = [...reviewPlatforms]; n[i] = { ...n[i], name: e.target.value }; setReviewPlatforms(n); }} placeholder="Plateforme" className="w-32 shrink-0 text-sm" />
              <Input value={p.url} onChange={e => { const n = [...reviewPlatforms]; n[i] = { ...n[i], url: e.target.value }; setReviewPlatforms(n); }} placeholder="https://..." className="flex-1 text-sm" />
              <button onClick={() => setReviewPlatforms(prev => prev.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {[{ name: 'Google' }, { name: 'Mariages.net' }, { name: 'Facebook' }, { name: 'TripAdvisor' }].map(s => (
              <button key={s.name} type="button" onClick={() => setReviewPlatforms(prev => [...prev, { name: s.name, url: '' }])}
                className="text-xs bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-lg border border-border transition-colors">
                + {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Demande d'avis auto (replié par défaut) */}
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setAutoReviewOpen(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">⚙️ Demande d'avis automatique</span>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${autoReviewOpen ? 'rotate-180' : ''}`} />
          </button>
          {autoReviewOpen && (
            <div className="space-y-3 mt-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setAutoReviewEnabled(v => !v)}
                  className="relative flex-shrink-0"
                  style={{ width: 44, height: 24, borderRadius: 999, background: autoReviewEnabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 3, left: autoReviewEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block' }} />
                </div>
                <span className="text-sm">Envoyer automatiquement une demande d'avis J+1 après l'événement</span>
              </label>
              {autoReviewEnabled && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Message personnalisé</label>
                  <textarea
                    value={autoReviewMessage}
                    onChange={e => setAutoReviewMessage(e.target.value)}
                    placeholder="Bonjour, nous espérons que votre événement s'est bien passé…"
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bouton tiroir Informations pratiques */}
      <button
        onClick={() => setShowPratiques(true)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
      >
        <Settings size={16} className="text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Informations pratiques jour J</p>
          <p className="text-[11px] text-muted-foreground">Adresse d'intervention, GPS, horaires, contact, notes</p>
        </div>
      </button>

      <Button onClick={handleSave} disabled={saving || !cs?.id} className="w-full gap-2">
        <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>

      <InfosPratiquesDrawer open={showPratiques} onOpenChange={setShowPratiques} cs={cs} qc={qc} />
    </div>
  );
}