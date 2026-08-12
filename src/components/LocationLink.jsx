import { MapPin } from 'lucide-react';

export default function LocationLink({ latitude, longitude, adresse, nom }) {
  if (!latitude || !longitude) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <MapPin size={16} />
        <span>{adresse || 'Adresse non disponible'}</span>
      </div>
    );
  }

  const handleNavigate = (e) => {
    e.preventDefault();
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(mapsLink, '_blank');
  };

  return (
    <button
      onClick={handleNavigate}
      className="flex items-center gap-2 text-primary hover:text-primary/80 hover:underline transition-colors text-sm"
    >
      <MapPin size={16} />
      <span>{adresse || nom}</span>
    </button>
  );
}