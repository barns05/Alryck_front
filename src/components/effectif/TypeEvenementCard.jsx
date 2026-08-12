import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';

const EMOJIS_TYPES = {
  'Mariage': '💍',
  'Pacs': '💑',
  'Anniversaire de mariage': '🎂',
  'Baptême': '👶',
  'Anniversaire': '🎉',
  "Soirée d'entreprise": '🏢',
  'Séminaire': '📚',
  'Cocktail': '🍸',
  'Gala': '🎭',
  'Location': '🏠',
  'Autre': '📋'
};

export default function TypeEvenementCard({ type, postesCount, isCustom, onConfigure, onDelete }) {
  const emoji = EMOJIS_TYPES[type] || '📋';
  
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{type}</h3>
            {isCustom && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block mt-1">
                Personnalisé
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {postesCount} poste{postesCount > 1 ? 's' : ''} configuré{postesCount > 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onConfigure}
          className="flex-1 gap-2"
          size="sm"
        >
          <Settings size={14} /> Configurer
        </Button>
        {isCustom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}