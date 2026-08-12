import PrestatairesListSection from '@/components/evenements/PrestatairesListSection';
import LieuxSection from '@/components/evenements/LieuxSection';

export default function AllocationSection({ evenement, prestatairesEv, onGererPrestataires }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <PrestatairesListSection prestatairesEv={prestatairesEv} onGerer={onGererPrestataires} />
      <LieuxSection evenementId={evenement.id} />
    </div>
  );
}