import { useDealsStore } from '@/store/dealsStore';

export const useDeals = () => useDealsStore((state) => state);
