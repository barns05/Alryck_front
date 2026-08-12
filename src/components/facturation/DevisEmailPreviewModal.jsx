import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';

export default function DevisEmailPreviewModal({
  emailPreview,  // { subject: string, body: string }
  signature,      // string (HTML/texte) — non éditable
  clientEmail,    // string
  onSend,        // (subject, body) => void
  onCancel,      // () => void
  sending = false,
  zIndex = 'z-50',
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState(emailPreview?.body || '');
  const [editedSubject, setEditedSubject] = useState(emailPreview?.subject || '');

  const handleSendClick = () => {
    onSend(editMode ? editedSubject : emailPreview.subject, editMode ? editedBody : emailPreview.body);
  };

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-sm p-4`}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base">✉️ Aperçu du message</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Vérifiez avant d'envoyer</p>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {/* Destinataire */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Destinataire
            </label>
            <Input
              value={clientEmail || ''}
              disabled
              className="text-sm bg-muted/50"
            />
          </div>

          {/* Objet */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Objet
            </label>
            {editMode ? (
              <Input
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                className="text-sm h-8"
              />
            ) : (
              <div className="bg-muted/40 rounded-lg border border-border px-3 py-2 text-sm">
                {emailPreview.subject}
              </div>
            )}
          </div>

          {/* Séparateur */}
          <div className="border-t border-border pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Contenu du message
            </div>

            {editMode ? (
              <textarea
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                rows={10}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              />
            ) : (
              <div
                className="bg-muted/30 rounded-lg border border-border p-4 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: emailPreview.body }}
              />
            )}
          </div>

          {/* Signature */}
          {signature && (
            <div className="border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                Signature
              </div>
              <div
                className="bg-muted/30 rounded-lg border border-border p-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: signature.replace(/\n/g, '<br />') }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 border-t border-border flex gap-3 justify-between items-center shrink-0">
          <button
            onClick={() => {
              if (editMode) {
                // Annuler l'édition : revenir à l'aperçu
                setEditMode(false);
                setEditedBody(emailPreview.body);
                setEditedSubject(emailPreview.subject);
              } else {
                // Fermer la modal
                onCancel();
              }
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {editMode ? '← Annuler édition' : 'Fermer'}
          </button>

          <div className="flex gap-2">
            {!editMode && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setEditMode(true)}
              >
                ✏️ Modifier le message
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleSendClick}
              disabled={sending}
            >
              <Send size={13} /> {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}