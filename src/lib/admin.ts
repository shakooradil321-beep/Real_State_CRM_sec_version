export const AGENCY_CREATION_ADMIN_EMAIL = 'shakooradil321@gmail.com';

export const canCreateAgency = (email?: string | null): boolean =>
  email?.trim().toLowerCase() === AGENCY_CREATION_ADMIN_EMAIL;
