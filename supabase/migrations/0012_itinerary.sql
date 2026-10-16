-- Itinerary builder (Platinum): allow the new document kind.
-- Safe to run more than once.

alter table public.agent_documents drop constraint if exists agent_documents_kind_check;
alter table public.agent_documents
  add constraint agent_documents_kind_check
  check (kind in ('hotel_voucher', 'air_ticket', 'pickup_voucher', 'welcome_placard', 'invoice', 'proforma', 'receipt', 'itinerary'));
