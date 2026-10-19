export type AgencyRole = 'owner' | 'agent';
export type Stage = 'new_lead' | 'visit' | 'negotiation' | 'closed';
export type PropertyType = 'House' | 'Apartment' | 'Plot' | 'Commercial' | 'Office';
export type LeadSource =
  | 'whatsapp'
  | 'referral'
  | 'olx'
  | 'zameen'
  | 'facebook'
  | 'instagram'
  | 'walk_in'
  | 'cold_call'
  | 'other';
export type ActivityType =
  | 'note'
  | 'stage_changed'
  | 'deal_created'
  | 'followup_set'
  | 'called'
  | 'whatsapped';
export type PropertyStatus = 'available' | 'under_offer' | 'sold' | 'rented';
export type PropertyDisposition = 'sold' | 'rented';
export type PaymentKind = 'token_money' | 'bayana';
export type CommissionBasis = 'percentage' | 'flat_fee';
export type CommissionStatus = 'pending' | 'earned';
export type CommissionEarnedTrigger = 'on_close' | 'on_payment';

export interface Agency {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyMembership {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: string;
  updated_at: string;
}

export interface AgencySettings {
  agency_id: string;
  commission_enabled: boolean;
  commission_basis: CommissionBasis | null;
  commission_percentage_value: number | null;
  commission_flat_fee_value: number | null;
  agent_share_percentage: number | null;
  agency_share_percentage: number | null;
  commission_earned_trigger: CommissionEarnedTrigger;
  // Added in migration 008 — controls whether agents can see commission
  // details on their own deals. Defaults to false (owner-only visibility).
  show_commission_to_agents: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  agency_id: string | null;
  user_id: string;
  property_id: string | null;
  client_name: string;
  phone: string;
  budget: number;
  area: string;
  property_type: PropertyType;
  stage: Stage;
  notes: string | null;
  followup_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  source: LeadSource | null;
  closing_amount: number | null;
  closing_disposition: PropertyDisposition | null;
}

export interface Property {
  id: string;
  agency_id: string | null;
  user_id: string;
  title: string;
  address: string;
  area: string;
  size: string;
  price: number;
  status: PropertyStatus;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  type: ActivityType;
  content: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// Matches the live deal_payments table (migration 006).
// Note: property_id is not present in the live schema.
export interface DealPayment {
  id: string;
  deal_id: string;
  agency_id: string | null;
  recorded_by_user_id: string;
  payment_kind: PaymentKind;
  amount: number;
  received_on: string; // ISO date string YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Matches the live deal_commissions table (migration 005/006).
export interface DealCommission {
  id: string;
  deal_id: string;
  agency_id: string;
  calculated_by_user_id: string;
  calculation_base_amount: number;
  basis: CommissionBasis;
  percentage_value: number | null;
  flat_fee_value: number | null;
  agent_share_percentage: number;
  agency_share_percentage: number;
  gross_commission_amount: number;
  agent_commission_amount: number;
  agency_commission_amount: number;
  earned_trigger: CommissionEarnedTrigger;
  status: CommissionStatus;
  earned_at: string | null;
  trigger_payment_id: string | null;
  settings_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DealInsert = Omit<Deal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'closed_at'>;
export type DealUpdate = Partial<Omit<Deal, 'id' | 'user_id' | 'created_at'>>;
export type AgencySettingsUpdate = Partial<Omit<AgencySettings, 'agency_id' | 'created_at' | 'updated_at'>>;
export type DealPaymentInsert = Omit<DealPayment, 'id' | 'created_at' | 'updated_at'>;

export interface StageConfig {
  id: Stage;
  label: string;
  color: string;
  headerColor: string;
  borderColor: string;
  badgeColor: string;
}

export const STAGE_CONFIG: Record<Stage, StageConfig> = {
  new_lead: {
    id: 'new_lead',
    label: 'New Lead',
    color: 'bg-blue-50',
    headerColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  visit: {
    id: 'visit',
    label: 'Visit Scheduled',
    color: 'bg-amber-50',
    headerColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  negotiation: {
    id: 'negotiation',
    label: 'Negotiation',
    color: 'bg-orange-50',
    headerColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  closed: {
    id: 'closed',
    label: 'Closed',
    color: 'bg-green-50',
    headerColor: 'text-green-800',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800',
  },
};

export const STAGES: Stage[] = ['new_lead', 'visit', 'negotiation', 'closed'];
export const ACTIVE_PIPELINE_STAGES: Stage[] = ['new_lead', 'visit', 'negotiation'];

export const KARACHI_AREAS = [
  'DHA Phase 1',
  'DHA Phase 2',
  'DHA Phase 4',
  'DHA Phase 5',
  'DHA Phase 6',
  'DHA Phase 7',
  'DHA Phase 8',
  'Bahria Town',
  'Bahria Town Karachi 2',
  'Clifton',
  'Bath Island',
  'Boat Basin',
  'PECHS',
  'Gulshan-e-Iqbal',
  'Gulistan-e-Johar',
  'Nazimabad',
  'North Nazimabad',
  'Scheme 33',
  'Scheme 45',
  'KDA Scheme 1',
  'Korangi',
  'Landhi',
  'Malir',
  'Surjani Town',
  'Buffer Zone',
  'New Karachi',
  'Federal B Area',
  'Liaquatabad',
  'Saddar',
  'Garden',
  'Lyari',
  'Orangi Town',
  'Other',
] as const;

export const PROPERTY_TYPES: PropertyType[] = [
  'House',
  'Apartment',
  'Plot',
  'Commercial',
  'Office',
];

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'olx', label: 'OLX' },
  { value: 'zameen', label: 'Zameen.com' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'walk_in', label: 'Walk In' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'other', label: 'Other' },
];

export interface AuthUser {
  id: string;
  email: string;
}

export interface FollowUpItem {
  deal: Deal;
  status: 'overdue' | 'today' | 'upcoming';
  daysUntil: number;
}

export interface DealStats {
  totalActive: number;
  newLeads: number;
  visits: number;
  negotiations: number;
  closedThisMonth: number;
}