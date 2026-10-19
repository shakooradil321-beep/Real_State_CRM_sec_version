import { useAuthStore } from '@/store/authStore';

export const useAuth = () => useAuthStore((state) => state);
