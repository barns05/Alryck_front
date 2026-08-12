import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function GenerateFichesButton({ evenement_id, onSuccess }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateFichesService', {
        evenement_id,
      });

      toast({
        title: '✅ Fiches générées',
        description: response.data.message,
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      className="gap-2"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <FileText size={16} />
          Générer les fiches
        </>
      )}
    </Button>
  );
}