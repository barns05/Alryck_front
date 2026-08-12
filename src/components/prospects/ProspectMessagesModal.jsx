import { X, MessageCircle } from 'lucide-react';
import AdminProspectMessages from '@/components/prospects/AdminProspectMessages';

export default function ProspectMessagesModal({ prospect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            Messages — {prospect.prenom} {prospect.nom}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 flex-1 overflow-y-auto">
          <AdminProspectMessages prospectId={prospect.id} />
        </div>
      </div>
    </div>
  );
}