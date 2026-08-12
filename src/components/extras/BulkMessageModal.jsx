import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function BulkMessageModal({ onClose }) {
  const qc = useQueryClient();
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.filter({ actif: true }),
  });

  const toggleExtra = (extraId) => {
    setSelectedExtras(prev => 
      prev.includes(extraId) 
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  const selectAll = () => {
    setSelectedExtras(extras.map(e => e.id));
  };

  const deselectAll = () => {
    setSelectedExtras([]);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const extrasData = extras.filter(e => selectedExtras.includes(e.id));
      
      // Créer les notifications pour chaque extra
      for (const extra of extrasData) {
        await base44.entities.Notification.create({
          user_email: extra.email,
          titre: 'Nouveau message de Planyse',
          message: message,
          type: 'prestataire',
        });
      }

      // Envoyer les emails si demandé
      if (sendEmail && extrasData.length > 0) {
        for (const extra of extrasData) {
          if (extra.email) {
            await base44.functions.invoke('sendBulkMessageEmail', {
              to: extra.email,
              subject: 'Message de Planyse',
              body: message,
            });
          }
        }
      }

      return { count: extrasData.length };
    },
    onSuccess: () => {
      qc.invalidateQueries(['notifications']);
      onClose();
    },
  });

  const validateEmails = () => {
    const extrasData = extras.filter(e => selectedExtras.includes(e.id));
    const invalidEmails = extrasData.filter(e => !e.email);
    if (invalidEmails.length > 0) {
      alert(`⚠️ ${invalidEmails.length} extra(s) n'ont pas d'email : ${invalidEmails.map(e => e.nom).join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSend = () => {
    if (selectedExtras.length === 0 || !message.trim()) return;
    if (!validateEmails()) return;
    if (window.confirm(`Envoyer le message à ${selectedExtras.length} extra(s) ? Cette action ne peut pas être annulée.`)) {
      sendMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            Message groupé aux extras
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Sélectionner les extras ({selectedExtras.length}/{extras.length})</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-primary hover:underline">Tout sélectionner</button>
              <span className="text-muted-foreground">|</span>
              <button onClick={deselectAll} className="text-xs text-primary hover:underline">Tout désélectionner</button>
            </div>
          </div>

          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {extras.map(extra => (
              <label
                key={extra.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedExtras.includes(extra.id)}
                  onCheckedChange={() => toggleExtra(extra.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{extra.nom}</p>
                  <p className="text-xs text-muted-foreground">{extra.poste} {extra.email && `· ${extra.email}`}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Votre message..."
            className="min-h-[120px]"
          />
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <span className="flex items-center gap-1">
              <Mail size={14} />
              Envoyer aussi par email aux extras sélectionnés
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
           <Button variant="outline" onClick={onClose} disabled={sendMutation.isPending}>Annuler</Button>
           <Button 
             onClick={handleSend} 
             disabled={selectedExtras.length === 0 || !message.trim() || sendMutation.isPending}
             className="gap-2"
           >
             <Send size={15} />
             {sendMutation.isPending ? 'Envoi...' : `Envoyer à ${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''}`}
           </Button>
         </div>
      </div>
    </div>
  );
}