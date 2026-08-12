import { useState } from 'react';

/**
 * Hook réutilisable pour filtrer et trier une liste
 * Gère la recherche par mots-clés et les filtres
 */
export function useListFilter(items = [], getSearchText = (item) => item.nom) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [sortOrder, setSortOrder] = useState('asc');

  const filtered = items.filter(item => {
    if (!search) return true;
    const searchText = getSearchText(item).toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;

    if (sortBy === 'nom') {
      valA = (a.nom || '').toLowerCase();
      valB = (b.nom || '').toLowerCase();
    } else if (sortBy === 'recent') {
      valA = a.created_date ? new Date(a.created_date).getTime() : 0;
      valB = b.created_date ? new Date(b.created_date).getTime() : 0;
    } else {
      // Cas custom : laisser unsorted
      return 0;
    }

    if (sortOrder === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });

  return {
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filtered: sorted,
    count: sorted.length,
  };
}