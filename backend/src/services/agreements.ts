// Agreement text for a deal, and the fingerprint that proves exactly what each party signed.
// The text is generated once from the agreed deal terms and then never edited, so the SHA-256 recorded with every
// signature always matches the stored text. If anyone changed the text later, the hashes would stop matching.
import crypto from 'crypto';

export type AgreementParty = { name: string; gst?: string | null; address?: string | null };

export type AgreementInput = {
  dealId: string;
  title: string;
  description?: string | null;
  buyer: AgreementParty;
  seller: AgreementParty;
  amount: number;
  currency?: string;
  timeline?: string | null;
  deliverables?: string[];
  approach?: string | null;
  date: Date;
};

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

const party = (p: AgreementParty) => [p.name, p.gst ? `GSTIN ${p.gst}` : null, p.address].filter(Boolean).join(', ');

export function buildAgreementText(a: AgreementInput): string {
  const money = `${a.currency ?? 'INR'} ${a.amount.toLocaleString('en-IN')}`;
  const deliverables = (a.deliverables ?? []).filter(Boolean);
  const lines = [
    'SERVICE AGREEMENT',
    '',
    `Agreement date: ${a.date.toISOString().slice(0, 10)}`,
    `Deal reference: ${a.dealId}`,
    '',
    '1. PARTIES',
    `Client (the "Buyer"): ${party(a.buyer)}`,
    `Service provider (the "Seller"): ${party(a.seller)}`,
    '',
    '2. SCOPE OF WORK',
    `Project: ${a.title}`,
    ...(a.description ? [a.description] : []),
    ...(a.approach ? ['', `Approach: ${a.approach}`] : []),
    ...(deliverables.length ? ['', 'Deliverables:', ...deliverables.map((d, i) => `  ${i + 1}. ${d}`)] : []),
    '',
    '3. TIMELINE',
    a.timeline ? `The Seller will complete the work within: ${a.timeline}.` : 'The timeline will be agreed in writing between the parties.',
    '',
    '4. FEES AND PAYMENT',
    `The total fee for the work is ${money}, as accepted by both parties on the platform. Payment terms are as agreed between the parties.`,
    '',
    '5. CONFIDENTIALITY',
    'Each party will keep the other party\'s non-public business information confidential and use it only for this project.',
    '',
    '6. CHANGES',
    'Any change to scope, fee or timeline must be agreed in writing by both parties.',
    '',
    '7. GOVERNING LAW',
    'This agreement is governed by the laws of India.',
    '',
    '8. ELECTRONIC SIGNATURE',
    'Each party signs by typing its authorised representative\'s name and confirming agreement on the platform. The time, IP address and a fingerprint of this exact text are recorded with each signature.',
    '',
    'This agreement was generated from the terms accepted on the platform. It is a template, not legal advice: the parties are responsible for having it reviewed if needed.',
  ];
  return lines.join('\n');
}
