export type BrandType = "ires";

export type StageType = "15%" | "50%" | "75%" | "100%";

export type LeadSource = "meta" | "google_forms" | "discovery_questionnaire" | "quote_calculator" | "manual" | "website";

export interface Contact {
  id: string;
  brand: "ires";
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: LeadSource;
  stage: StageType;
  notes: string;
  comments: string[];
  nextSteps: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  contactId: string;
  brand: "ires";
  projectType: string;
  floorAreaSqM: number;
  estimatedCost: number;
  currency: string;
  floorPlanUrl?: string;
  specificationDetails?: string;
  status: "draft" | "sent" | "approved" | "declined";
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryQuestionnaire {
  id: string;
  brand: "ires";
  clientName: string;
  email: string;
  phone: string;
  projectVision: string;
  location: string;
  budgetRange: string;
  targetTimeline: string;
  submittedAt: string;
  contactId?: string;
}
