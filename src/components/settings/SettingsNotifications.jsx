import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// Liste complète des notifications dans l'application
const NOTIFICATIONS_CATALOGUE = [
  // Événements
  {
    id: 'new_event',
    category: 'Événements',
    name: 'Nouvel événement créé',
    description: 'Un nouvel événement a été créé dans l\'application',
  },
  {
    id: 'event_confirmed',
    category: 'Événements',
    name: 'Événement confirmé',
    description: 'Un client a confirmé une réservation',
  },
  {
    id: 'event_status_changed',
    category: 'Événements',
    name: 'Statut d\'événement modifié',
    description: 'Le statut d\'un événement a changé',
  },
  // Clients & Prospects
  {
    id: 'new_prospect',
    category: 'Prospects & Clients',
    name: 'Nouveau prospect',
    description: 'Un nouveau prospect s\'est inscrit',
  },
  {
    id: 'prospect_converted',
    category: 'Prospects & Clients',
    name: 'Prospect converti en client',
    description: 'Un prospect a confirmé sa réservation',
  },
  {
    id: 'prospect_message',
    category: 'Prospects & Clients',
    name: 'Message d\'un prospect',
    description: 'Un prospect a envoyé un message',
  },
  {
    id: 'client_message',
    category: 'Prospects & Clients',
    name: 'Message d\'un client',
    description: 'Un client a envoyé un message',
  },
  // Formulaires & Documents
  {
    id: 'formulaire_sent',
    category: 'Formulaires & Documents',
    name: 'Formulaire envoyé',
    description: 'Un formulaire de préparation a été envoyé au client',
  },
  {
    id: 'formulaire_completed',
    category: 'Formulaires & Documents',
    name: 'Formulaire complété',
    description: 'Un client a complété son formulaire de préparation',
  },
  {
    id: 'document_uploaded',
    category: 'Formulaires & Documents',
    name: 'Document uploadé',
    description: 'Un client a uploadé un document',
  },
  // Fiches de service
  {
    id: 'fiche_service_sent',
    category: 'Fiches de service',
    name: 'Fiche de service envoyée',
    description: 'Une fiche de service a été envoyée à l\'équipe',
  },
  {
    id: 'fiche_service_viewed',
    category: 'Fiches de service',
    name: 'Fiche de service consultée',
    description: 'Une fiche de service a été lue',
  },
  // Équipe & Extras
  {
    id: 'extra_invited',
    category: 'Équipe & Extras',
    name: 'Extra invité',
    description: 'Un extra a été invité pour un service',
  },
  {
    id: 'extra_confirmed',
    category: 'Équipe & Extras',
    name: 'Extra confirmé',
    description: 'Un extra a confirmé sa disponibilité',
  },
  {
    id: 'extra_unavailable',
    category: 'Équipe & Extras',
    name: 'Extra indisponible',
    description: 'Un extra a signalé son indisponibilité',
  },
  // Prestataires
  {
    id: 'prestataire_invited',
    category: 'Prestataires',
    name: 'Prestataire invité',
    description: 'Un prestataire a été associé à un événement',
  },
  {
    id: 'prestataire_confirmed',
    category: 'Prestataires',
    name: 'Prestataire confirmé',
    description: 'Un prestataire a confirmé sa disponibilité',
  },
  // Avis clients
  {
    id: 'avis_received',
    category: 'Avis clients',
    name: 'Avis client reçu',
    description: 'Un client a laissé un avis',
  },
  // Promotions
  {
    id: 'promotion_sent',
    category: 'Promotions',
    name: 'Promotion envoyée',
    description: 'Une promotion a été envoyée',
  },
  {
    id: 'promotion_used',
    category: 'Promotions',
    name: 'Promotion utilisée',
    description: 'Un client a utilisé une promotion',
  },
];

export default function SettingsNotifications({ onSaved }) {
  const qc = useQueryClient();
  const [notifications, setNotifications] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les paramètres existants
  const { settings } = useOwnerCompanySettings();

  useEffect(() => {
    if (settings?.notification_preferences) {
      setNotifications(settings.notification_preferences);
    } else {
      // Initialiser avec les paramètres par défaut "Les deux"
      const defaults = {};
      NOTIFICATIONS_CATALOGUE.forEach(n => {
        defaults[n.id] = 'both';
      });
      setNotifications(defaults);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanySettings.update(settings.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      onSaved?.();
    },
  });

  const handleNotificationChange = (notificationId, value) => {
    setNotifications(prev => ({ ...prev, [notificationId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateMutation.mutateAsync({
      notification_preferences: notifications,
    });
    setSaving(false);
  };

  // Grouper les notifications par catégorie
  const groupedNotifications = {};
  NOTIFICATIONS_CATALOGUE.forEach(n => {
    if (!groupedNotifications[n.category]) {
      groupedNotifications[n.category] = [];
    }
    groupedNotifications[n.category].push(n);
  });

  const categories = Object.keys(groupedNotifications).sort();

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{category}</h3>
          <div className="space-y-2">
            {groupedNotifications[category].map(notif => (
              <div key={notif.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notif.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {['email', 'app', 'both', 'none'].map(option => (
                      <label
                        key={option}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                          notifications[notif.id] === option
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30 bg-muted/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name={notif.id}
                          value={option}
                          checked={notifications[notif.id] === option}
                          onChange={() => handleNotificationChange(notif.id, option)}
                          className="sr-only"
                        />
                        <span className="text-xs font-medium whitespace-nowrap">
                          {option === 'email' && '📧 Email'}
                          {option === 'app' && '🔔 App'}
                          {option === 'both' && '📧 Les deux'}
                          {option === 'none' && '🚫 Aucune'}
                        </span>
                        {notifications[notif.id] === option && (
                          <Check size={13} className="text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-20 z-10 bg-background border-t border-border pt-4 flex justify-end gap-3">
        <Button variant="outline" onClick={onSaved}>
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Enregistrer les préférences
        </Button>
      </div>
    </div>
  );
}