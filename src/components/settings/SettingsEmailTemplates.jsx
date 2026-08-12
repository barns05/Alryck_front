import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/emailUtils';

const DOCUMENT_TYPES = ['Devis', 'Facture d\'acompte', 'Facture intermédiaire', 'Facture', 'Avoir', 'Solde'];

export default function SettingsEmailTemplates({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('Devis');
  const [signature, setSignature] = useState(value?.email_signature || '');
  const [templates, setTemplates] = useState(value?.email_templates || {});

  const currentTemplate = templates[activeTab] || DEFAULT_EMAIL_TEMPLATES[activeTab] || {};

  const handleSubjectChange = (newSubject) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], subject: newSubject }
    }));
    onChange({
      email_signature: signature,
      email_templates: { ...templates, [activeTab]: { ...templates[activeTab], subject: newSubject } }
    });
  };

  const handleBodyChange = (newBody) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], body: newBody }
    }));
    onChange({
      email_signature: signature,
      email_templates: { ...templates, [activeTab]: { ...templates[activeTab], body: newBody } }
    });
  };

  const handleSignatureChange = (newSignature) => {
    setSignature(newSignature);
    onChange({
      email_signature: newSignature,
      email_templates: templates
    });
  };

  const resetTemplate = () => {
    const defaults = DEFAULT_EMAIL_TEMPLATES[activeTab];
    setTemplates(prev => ({
      ...prev,
      [activeTab]: defaults
    }));
    onChange({
      email_signature: signature,
      email_templates: { ...templates, [activeTab]: defaults }
    });
  };

  return (
    <div className="space-y-6">
      {/* Signature globale */}
      <div>
        <label className="text-sm font-semibold mb-2 block">✉️ Signature email (utilisée pour tous les documents)</label>
        <p className="text-xs text-muted-foreground mb-2">
          Variables disponibles: {'{company_name}'}, {'{email_contact}'}, {'{telephone}'}, {'{site_web}'}
        </p>
        <textarea
          value={signature}
          onChange={e => handleSignatureChange(e.target.value)}
          rows={4}
          placeholder="Ex: Cordialement,&#10;{company_name}&#10;{telephone}"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Séparateur */}
      <div className="border-t border-border pt-6">
        <label className="text-sm font-semibold mb-3 block">📄 Modèles de messages par type de document</label>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-3">
          {DOCUMENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet */}
        <div className="space-y-4 bg-muted/30 rounded-xl border border-border p-4">
          {/* Objet */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Objet du message
            </label>
            <Input
              value={currentTemplate.subject || ''}
              onChange={e => handleSubjectChange(e.target.value)}
              placeholder={`Ex: ${DEFAULT_EMAIL_TEMPLATES[activeTab]?.subject}`}
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variables: {'{numero}'}, {'{client_nom}'}
            </p>
          </div>

          {/* Corps du message */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Corps du message
            </label>
            <textarea
              value={currentTemplate.body || ''}
              onChange={e => handleBodyChange(e.target.value)}
              rows={8}
              placeholder="Contenu du message..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Variables: {'{client_nom}'}, {'{numero}'}, {'{type_document}'}, {'{lien_portail}'} (optionnel)
              <br />
              ℹ️ Si pas de portail client, le bloc contenant {'{lien_portail}'} sera supprimé automatiquement.
            </p>
          </div>

          {/* Bouton réinitialiser */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={resetTemplate}
          >
            <RotateCcw size={12} /> Réinitialiser à la valeur par défaut
          </Button>
        </div>
      </div>
    </div>
  );
}