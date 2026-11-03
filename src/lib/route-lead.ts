// Classify an inquiry and decide who owns it.
// Used by the lead routing demo on the Home and Lab pages.

export type LeadType = 'service' | 'sales' | 'general';
export type Lead = { type: LeadType; email: string };
export type Route = {
  queue: 'review' | 'service' | 'sales' | 'front-desk';
  priority?: 'high' | 'standard' | 'low';
  followUpHours?: number;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL.test(email.trim());

export function routeLead(lead: Lead): Route {
  if (!isValidEmail(lead.email)) return { queue: 'review' };

  switch (lead.type) {
    case 'sales':
      return { queue: 'sales', priority: 'high', followUpHours: 4 };
    case 'service':
      return { queue: 'service', priority: 'standard', followUpHours: 24 };
    default:
      return { queue: 'front-desk', priority: 'low' };
  }
}

// Human-readable steps for the demo, derived from the route.
export function describeRoute(lead: Lead): { stage: string; text: string }[] {
  const route = routeLead(lead);
  const capture: Record<LeadType, string> = {
    service: 'Service inquiry from the website',
    sales: 'Quote request with budget and timeline',
    general: 'General question from the contact page',
  };
  if (route.queue === 'review') {
    return [
      { stage: 'Capture', text: capture[lead.type] },
      { stage: 'Validate', text: 'Email address looks invalid' },
      { stage: 'Route', text: 'Held for manual review — nothing sent' },
    ];
  }
  const queueName = { service: 'Service team pipeline', sales: 'Shared sales inbox + new deal', 'front-desk': 'Front-desk queue' }[route.queue];
  const follow = route.followUpHours
    ? `Confirmation now, owner reminded if untouched after ${route.followUpHours} hours`
    : 'Auto-reply with FAQ links';
  return [
    { stage: 'Capture', text: capture[lead.type] },
    { stage: 'Validate', text: 'Required fields and email format pass' },
    { stage: 'Classify', text: `Type = ${lead.type} · Priority = ${route.priority}` },
    { stage: 'Route', text: queueName },
    { stage: 'Follow up', text: follow },
  ];
}
