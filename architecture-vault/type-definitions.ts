// Status note as of April 19, 2026:
// This file is the broader target/reference type set for the architecture vault.
// Some entities here are ahead of the currently shipped UI and migrations.

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export type AgencyRole = 'owner' | 'agent';
export type DealStage = 'new_lead' | 'visit' | 'negotiation' | 'closed';
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
export type CommissionBasis = 'percentage' | 'flat_fee';
export type CommissionEarnedTrigger = 'on_close' | 'on_payment';
export type CommissionStatus = 'pending' | 'earned';
export type PaymentKind = 'token_money' | 'bayana';
export type DocumentType = 'receipt' | 'agreement';

export interface Agency {
  id: UUID;
  name: string;
  owner_user_id: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface AgencyMembership {
  id: UUID;
  agency_id: UUID;
  user_id: UUID;
  role: AgencyRole;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface AgencySettings {
  agency_id: UUID;
  commission_enabled: boolean;
  commission_basis: CommissionBasis | null;
  commission_percentage_value: number | null;
  commission_flat_fee_value: number | null;
  agent_share_percentage: number | null;
  agency_share_percentage: number | null;
  commission_earned_trigger: CommissionEarnedTrigger;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Deal {
  id: UUID;
  agency_id: UUID | null;
  user_id: UUID;
  property_id: UUID | null;
  client_name: string;
  phone: string;
  budget: number;
  area: string;
  property_type: PropertyType;
  stage: DealStage;
  notes: string | null;
  followup_date: ISODate | null;
  sort_order: number;
  source: LeadSource | null;
  closing_amount: number | null;
  closing_disposition: PropertyDisposition | null;
  closed_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Property {
  id: UUID;
  agency_id: UUID | null;
  user_id: UUID;
  title: string;
  address: string;
  area: string;
  size: string;
  price: number;
  status: PropertyStatus;
  deal_id: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DealActivity {
  id: UUID;
  deal_id: UUID;
  user_id: UUID;
  type: ActivityType;
  content: string | null;
  meta: JsonValue | null;
  created_at: ISODateTime;
}

export interface DealPayment {
  id: UUID;
  deal_id: UUID;
  agency_id: UUID | null;
  property_id: UUID | null;
  recorded_by_user_id: UUID;
  payment_kind: PaymentKind;
  amount: number;
  received_on: ISODate;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DealCommission {
  id: UUID;
  deal_id: UUID;
  agency_id: UUID;
  calculated_by_user_id: UUID;
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
  earned_at: ISODateTime | null;
  trigger_payment_id: UUID | null;
  settings_snapshot: JsonValue;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DealDocument {
  id: UUID;
  deal_id: UUID;
  agency_id: UUID | null;
  property_id: UUID | null;
  payment_id: UUID | null;
  generated_by_user_id: UUID;
  document_type: DocumentType;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  metadata: JsonValue;
  created_at: ISODateTime;
}

export type AgencyInsert = Omit<Agency, 'id' | 'created_at' | 'updated_at'>;
export type AgencyMembershipInsert = Omit<AgencyMembership, 'id' | 'created_at' | 'updated_at'>;
export type AgencySettingsUpdate = Partial<Omit<AgencySettings, 'agency_id' | 'created_at' | 'updated_at'>>;
export type DealInsert = Omit<Deal, 'id' | 'closed_at' | 'created_at' | 'updated_at'>;
export type DealUpdate = Partial<Omit<Deal, 'id' | 'created_at' | 'updated_at'>>;
export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'>;
export type PropertyUpdate = Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>;
export type DealActivityInsert = Omit<DealActivity, 'id' | 'created_at'>;
export type DealPaymentInsert = Omit<DealPayment, 'id' | 'created_at' | 'updated_at'>;
export type DealCommissionInsert = Omit<DealCommission, 'id' | 'created_at' | 'updated_at'>;
export type DealDocumentInsert = Omit<DealDocument, 'id' | 'created_at'>;

export interface DatabaseEntities {
  agencies: Agency;
  agency_memberships: AgencyMembership;
  agency_settings: AgencySettings;
  deals: Deal;
  properties: Property;
  deal_activities: DealActivity;
  deal_payments: DealPayment;
  deal_commissions: DealCommission;
  deal_documents: DealDocument;
}
