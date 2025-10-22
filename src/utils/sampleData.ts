import { Lead, TeamMember } from '../state/contractorStore';

export const sampleLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '(555) 123-4567',
    company: 'TechCorp Solutions',
    status: 'appointment_held',
    value: 25000,
    notes: 'Interested in our enterprise package. Follow up next week.',
    source: 'other',
    followUpReminders: [],
  },
  {
    name: 'Michael Chen',
    email: 'mchen@startupxyz.io',
    phone: '(555) 987-6543',
    company: 'StartupXYZ',
    status: 'negotiation',
    value: 15000,
    notes: 'Sent proposal on Monday. Waiting for response.',
    source: 'referrals',
    followUpReminders: [],
  },
  {
    name: 'Emma Davis',
    email: 'emma@creativestudio.com',
    phone: '(555) 456-7890',
    company: 'Creative Studio LLC',
    status: 'new',
    value: 8000,
    notes: 'Initial contact made. Needs more information about services.',
    source: 'other',
    followUpReminders: [],
  },
  {
    name: 'Robert Wilson',
    email: 'rwilson@manufacturing.com',
    phone: '(555) 234-5678',
    company: 'Wilson Manufacturing',
    status: 'installed',
    value: 45000,
    notes: 'Deal closed! Contract signed.',
    source: 'Trade Show',
    followUpReminders: [],
  },
  {
    name: 'Lisa Rodriguez',
    email: 'lisa.r@consulting.biz',
    phone: '(555) 345-6789',
    company: 'Rodriguez Consulting',
    status: 'contacted',
    value: 12000,
    notes: 'Had initial call. Scheduling demo for next Tuesday.',
    source: 'Cold Call',
    followUpReminders: [],
  },
];



export const sampleTeamMembers: Omit<TeamMember, 'id' | 'joinedAt'>[] = [
  {
    name: 'Alex Thompson',
    email: 'alex.thompson@company.com',
    role: 'Sales Rep',
    isActive: true,
    performance: {
      leadsGenerated: 15,
      revenue: 125000,
      expenses: 2500,
    },
  },
  {
    name: 'Jessica Martinez',
    email: 'jessica.martinez@company.com',
    role: 'Manager',
    isActive: true,
    performance: {
      leadsGenerated: 8,
      revenue: 95000,
      expenses: 1800,
    },
  },
  {
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Contractor',
    isActive: true,
    performance: {
      leadsGenerated: 12,
      revenue: 78000,
      expenses: 3200,
    },
  },
  {
    name: 'Sophie Brown',
    email: 'sophie.brown@company.com',
    role: 'Lead',
    isActive: true,
    performance: {
      leadsGenerated: 20,
      revenue: 156000,
      expenses: 2100,
    },
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.johnson@company.com',
    role: 'Sales Rep',
    isActive: false,
    performance: {
      leadsGenerated: 5,
      revenue: 32000,
      expenses: 1200,
    },
  },
];