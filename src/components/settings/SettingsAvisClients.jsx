import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import ReviewPlatformsSection from '@/components/settings/ReviewPlatformsSection';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function SettingsAvisClients({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [reviewPlatforms, setReviewPlatforms] = useState([]);
  const [autoReviewEnabled, setAutoReviewEnabled] = useState(false);
  const [autoReviewMessage, setAutoReviewMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setReviewPlatforms(settings.review_platforms || []);
      setAutoReviewEnabled(settings.auto_review_enabled || false);
      setAutoReviewMessage(settings.auto_review_message || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(settings.id, {
      review_platforms: reviewPlatforms,
      auto_review_enabled: autoReviewEnabled,
      auto_review_message: autoReviewMessage,
    });
    qc.invalidateQueries(['company-settings']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <ReviewPlatformsSection
        platforms={reviewPlatforms}
        onChange={setReviewPlatforms}
        autoEnabled={autoReviewEnabled}
        onAutoEnabledChange={setAutoReviewEnabled}
        autoMessage={autoReviewMessage}
        onAutoMessageChange={setAutoReviewMessage}
      />
      <div className="sticky bottom-20 z-10 bg-card border-t border-border pt-4">
        <Button onClick={handleSave} disabled={saving || !settings?.id} className="w-full gap-2">
          <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}