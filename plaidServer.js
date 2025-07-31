// Required for local development and Plaid integration
require('dotenv').config();

// Log environment variable status
console.log('[Plaid] ENV loaded:', {
  PLAID_CLIENT_ID: !!process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: !!process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV
});
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET || !process.env.PLAID_ENV) {
  console.warn('[Plaid] WARNING: Missing one or more required Plaid environment variables!');
}

// Check for OpenAI API key
console.log('[Jessica] OpenAI API Key:', !!process.env.OPENAI_API_KEY);
if (!process.env.OPENAI_API_KEY) {
  console.warn('[Jessica] WARNING: OpenAI API key not found. Jessica will use fallback responses.');
}

const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Supabase client
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

// Plaid: Create Link Token
app.post('/api/create-link-token', async (req, res) => {
  const { user_id } = req.body;
  console.log(`[Plaid] /api/create-link-token called for user_id: ${user_id}`);
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user_id },
      client_name: '1099 Suite',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
      // Removed account_filters to allow all account types
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('[Plaid] Plaid link token error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Add a /create_link_token endpoint as an alias for /api/create-link-token
app.post('/create_link_token', async (req, res) => {
  const { user_id } = req.body;
  console.log(`[Plaid] /create_link_token called for user_id: ${user_id}`);
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user_id },
      client_name: '1099 Suite',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
      // Removed account_filters to allow all account types
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid link token error (alias):', err);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Add a /health endpoint for quick connectivity tests
app.get('/health', (req, res) => {
  res.json({ status: 'ok', plaid_env: process.env.PLAID_ENV, plaid_client_id: !!process.env.PLAID_CLIENT_ID });
});

// Plaid: Exchange Public Token
app.post('/api/exchange-public-token', async (req, res) => {
  const { public_token, user_id } = req.body;
  try {
    const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = tokenResponse.data.access_token;
    
    if (supabase) {
      await supabase.from('plaid_tokens').upsert({ user_id, access_token: accessToken });
    } else {
      console.warn('[Plaid] Supabase not configured, skipping token storage');
    }
    
    res.status(200).json({ access_token: accessToken, message: 'Access token stored successfully.' });
  } catch (error) {
    console.error('Exchange error:', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// Plaid: Get Transactions
app.get('/api/transactions', async (req, res) => {
  const { user_id, start_date, end_date } = req.query;
  
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }
  
  const { data, error } = await supabase
    .from('plaid_tokens')
    .select('access_token')
    .eq('user_id', user_id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Access token not found.' });

  try {
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: data.access_token,
      start_date: start_date || '2023-01-01',
      end_date: end_date || new Date().toISOString().split('T')[0],
    });
    res.json(transactionsResponse.data.transactions);
  } catch (err) {
    console.error('Transaction fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// Jessica AI Chat Endpoints
app.post('/api/jessica-chat-message', async (req, res) => {
  const { message, userId, userData } = req.body;
  console.log(`[Jessica] Received message from user ${userId}: ${message}`);
  console.log(`[Jessica] User data available: ${!!userData}`);
  
  try {
    let response;
    const lowerMessage = message.toLowerCase();
    
    // Check for input commands first
    if (lowerMessage.includes('add') || lowerMessage.includes('log') || lowerMessage.includes('record')) {
      if (lowerMessage.includes('door') || lowerMessage.includes('knock')) {
        response = "I can help you log doors knocked! Just tell me how many doors you knocked today, like 'I knocked 25 doors today' or 'Add 25 doors'.";
      } else if (lowerMessage.includes('appointment')) {
        response = "I can help you log appointments! Just tell me how many appointments you set today, like 'I set 3 appointments today' or 'Add 3 appointments'.";
      } else if (lowerMessage.includes('deal') || lowerMessage.includes('close')) {
        response = "I can help you log closed deals! Just tell me how many deals you closed today, like 'I closed 2 deals today' or 'Add 2 deals'.";
      } else if (lowerMessage.includes('mileage') || lowerMessage.includes('trip')) {
        response = "I can help you log mileage trips! Just tell me the details like 'Add 15 miles for client meeting' or 'Log 20 miles business trip'.";
      } else if (lowerMessage.includes('expense') || lowerMessage.includes('cost')) {
        response = "I can help you log expenses! Just tell me the amount and description like 'Add $50 expense for gas' or 'Log $25 for lunch'.";
      } else if (lowerMessage.includes('lead') || lowerMessage.includes('client')) {
        response = "I can help you add leads! Just tell me the name and company like 'Add lead John Smith from ABC Corp' or 'Log new client Jane Doe'.";
      } else if (lowerMessage.includes('team') || lowerMessage.includes('member')) {
        response = "I can help you add team members! Just tell me the name and role like 'Add team member Mike as Sales Rep' or 'Log new member Sarah'.";
      } else {
        response = "I can help you log data! Try saying things like:\n• 'Add 25 doors knocked'\n• 'Log 3 appointments'\n• 'Add $50 expense for gas'\n• 'Add lead John Smith'\n• 'Log 15 miles for client meeting'";
      }
    } else if (lowerMessage.includes('i knocked') || lowerMessage.includes('i set') || lowerMessage.includes('i closed') || lowerMessage.includes('i worked')) {
      // Extract numbers from natural language
      const numbers = message.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const count = parseInt(numbers[0]);
        if (lowerMessage.includes('knocked') || lowerMessage.includes('door')) {
          response = `I'll log ${count} doors knocked for today. You can also tell me appointments, deals, or hours worked!`;
        } else if (lowerMessage.includes('appointment') || lowerMessage.includes('set')) {
          response = `I'll log ${count} appointments for today. Great work!`;
        } else if (lowerMessage.includes('deal') || lowerMessage.includes('closed')) {
          response = `I'll log ${count} deals closed for today. Excellent!`;
        } else if (lowerMessage.includes('hour') || lowerMessage.includes('worked')) {
          response = `I'll log ${count} hours worked for today. Keep it up!`;
        }
      } else {
        response = "I heard you mention some activity, but I couldn't catch the numbers. Try saying something like 'I knocked 25 doors today' or 'I set 3 appointments'.";
      }
    } else if (lowerMessage.includes('\n') || lowerMessage.includes('•') || lowerMessage.includes('-') || lowerMessage.includes('*')) {
      // Handle multi-line input with multiple activities
      const lines = message.split(/[\n•\-*]/).filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        const activities = [];
        let totalDoors = 0;
        let totalAppointments = 0;
        let totalDeals = 0;
        let totalAccounts = 0;
        
        for (const line of lines) {
          const trimmedLine = line.trim().toLowerCase();
          const numbers = trimmedLine.match(/\d+/g);
          if (numbers && numbers.length > 0) {
            const count = parseInt(numbers[0]);
            
            if (trimmedLine.includes('appointment') && trimmedLine.includes('set')) {
              totalAppointments += count;
              if (trimmedLine.includes('door')) activities.push(`${count} appointments from door knocks`);
              else if (trimmedLine.includes('tag')) activities.push(`${count} appointments from tags`);
              else if (trimmedLine.includes('call')) activities.push(`${count} appointments from calls`);
              else if (trimmedLine.includes('referral')) activities.push(`${count} appointments from referrals`);
              else if (trimmedLine.includes('inbound')) activities.push(`${count} appointments from inbound`);
            } else if (trimmedLine.includes('appointment') && trimmedLine.includes('held')) {
              if (trimmedLine.includes('door')) activities.push(`${count} appointments held from door knocks`);
              else if (trimmedLine.includes('tag')) activities.push(`${count} appointments held from tags`);
              else if (trimmedLine.includes('call')) activities.push(`${count} appointments held from calls`);
              else if (trimmedLine.includes('referral')) activities.push(`${count} appointments held from referrals`);
              else if (trimmedLine.includes('inbound')) activities.push(`${count} appointments held from inbound`);
            } else if (trimmedLine.includes('deal') || trimmedLine.includes('closed')) {
              totalDeals += count;
              if (trimmedLine.includes('door')) activities.push(`${count} deals from door knocks`);
              else if (trimmedLine.includes('tag')) activities.push(`${count} deals from tags`);
              else if (trimmedLine.includes('call')) activities.push(`${count} deals from calls`);
              else if (trimmedLine.includes('referral')) activities.push(`${count} deals from referrals`);
              else if (trimmedLine.includes('inbound')) activities.push(`${count} deals from inbound`);
            } else if (trimmedLine.includes('account') || trimmedLine.includes('serviced')) {
              totalAccounts += count;
              if (trimmedLine.includes('door')) activities.push(`${count} accounts from door knocks`);
              else if (trimmedLine.includes('tag')) activities.push(`${count} accounts from tags`);
              else if (trimmedLine.includes('call')) activities.push(`${count} accounts from calls`);
              else if (trimmedLine.includes('referral')) activities.push(`${count} accounts from referrals`);
              else if (trimmedLine.includes('inbound')) activities.push(`${count} accounts from inbound`);
            } else if (trimmedLine.includes('knocked') || trimmedLine.includes('door')) {
              totalDoors += count;
              activities.push(`${count} doors knocked`);
            }
          }
        }
        
        if (activities.length > 0) {
          const summary = [];
          if (totalDoors > 0) summary.push(`${totalDoors} doors knocked`);
          if (totalAppointments > 0) summary.push(`${totalAppointments} appointments set`);
          if (totalDeals > 0) summary.push(`${totalDeals} deals closed`);
          if (totalAccounts > 0) summary.push(`${totalAccounts} accounts serviced`);
          
          response = `I'll log all your activities for today:\n• ${activities.join('\n• ')}\n\nSummary: ${summary.join(', ')}. Excellent detailed tracking!`;
        } else {
          response = "I see you've listed multiple activities, but I couldn't parse the specific numbers. Try formatting like:\n• 8 appointments from door knocks\n• 5 deals from inbound calls\n• 3 appointments held from referrals";
        }
      } else {
        response = "I see you've provided multiple activities. I'll process each one and log them all for today!";
      }
    } else if (lowerMessage.includes('from') && (lowerMessage.includes('door') || lowerMessage.includes('tag') || lowerMessage.includes('call') || lowerMessage.includes('referral') || lowerMessage.includes('inbound'))) {
      // Handle detailed sub-inputs like "8 appointments from door knocks" or "5 deals from inbound calls"
      const numbers = message.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const count = parseInt(numbers[0]);
        let subInputType = '';
        let mainInputType = '';
        
        // Check for "appointments held" first to avoid confusion with "appointments"
        if (lowerMessage.includes('appointment') && lowerMessage.includes('held')) {
          mainInputType = 'appointmentHolds';
          if (lowerMessage.includes('door')) subInputType = 'appointmentsHeldDoorKnocks';
          else if (lowerMessage.includes('tag')) subInputType = 'appointmentsHeldTagsPut';
          else if (lowerMessage.includes('call')) subInputType = 'appointmentsHeldCallsMade';
          else if (lowerMessage.includes('referral')) subInputType = 'appointmentsHeldReferrals';
          else if (lowerMessage.includes('inbound')) subInputType = 'appointmentsHeldInbound';
        } else if (lowerMessage.includes('appointment') && lowerMessage.includes('set')) {
          mainInputType = 'appointments';
          if (lowerMessage.includes('door')) subInputType = 'appointmentsSetDoorKnocks';
          else if (lowerMessage.includes('tag')) subInputType = 'appointmentsSetTagsPut';
          else if (lowerMessage.includes('call')) subInputType = 'appointmentsSetCallsMade';
          else if (lowerMessage.includes('referral')) subInputType = 'appointmentsSetReferrals';
          else if (lowerMessage.includes('inbound')) subInputType = 'appointmentsSetInbound';
        } else if (lowerMessage.includes('appointment')) {
          // Default to appointments if not specified as set or held
          mainInputType = 'appointments';
          if (lowerMessage.includes('door')) subInputType = 'appointmentsSetDoorKnocks';
          else if (lowerMessage.includes('tag')) subInputType = 'appointmentsSetTagsPut';
          else if (lowerMessage.includes('call')) subInputType = 'appointmentsSetCallsMade';
          else if (lowerMessage.includes('referral')) subInputType = 'appointmentsSetReferrals';
          else if (lowerMessage.includes('inbound')) subInputType = 'appointmentsSetInbound';
        } else if (lowerMessage.includes('deal') || lowerMessage.includes('closed')) {
          mainInputType = 'closedDeals';
          if (lowerMessage.includes('door')) subInputType = 'dealsClosedDoorKnocks';
          else if (lowerMessage.includes('tag')) subInputType = 'dealsClosedTagsPut';
          else if (lowerMessage.includes('call')) subInputType = 'dealsClosedCallsMade';
          else if (lowerMessage.includes('referral')) subInputType = 'dealsClosedReferrals';
          else if (lowerMessage.includes('inbound')) subInputType = 'dealsClosedInbound';
        } else if (lowerMessage.includes('account') || lowerMessage.includes('serviced')) {
          mainInputType = 'accountsServiced';
          if (lowerMessage.includes('door')) subInputType = 'accountsServicedDoorKnocks';
          else if (lowerMessage.includes('tag')) subInputType = 'accountsServicedTagsPut';
          else if (lowerMessage.includes('call')) subInputType = 'accountsServicedCallsMade';
          else if (lowerMessage.includes('referral')) subInputType = 'accountsServicedReferrals';
          else if (lowerMessage.includes('inbound')) subInputType = 'accountsServicedInbound';
        }
        
        if (subInputType) {
          // Create a more readable response
          let sourceName = '';
          if (subInputType.includes('DoorKnocks')) sourceName = 'door knocks';
          else if (subInputType.includes('TagsPut')) sourceName = 'tags put';
          else if (subInputType.includes('CallsMade')) sourceName = 'calls made';
          else if (subInputType.includes('Referrals')) sourceName = 'referrals';
          else if (subInputType.includes('Inbound')) sourceName = 'inbound';
          
          response = `I'll log ${count} ${mainInputType} from ${sourceName} for today. Great detailed tracking!`;
        } else {
          response = `I'll log ${count} ${mainInputType || 'activities'} for today. Keep up the great work!`;
        }
      } else {
        response = "I heard you mention detailed activities, but I couldn't catch the numbers. Try saying something like '8 appointments from door knocks' or '5 deals from inbound calls'.";
      }
    } else if (lowerMessage.includes('add') && lowerMessage.includes('$')) {
      // Extract expense amount
      const amountMatch = message.match(/\$(\d+(?:\.\d{2})?)/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        const description = message.replace(/\$(\d+(?:\.\d{2})?)/, '').replace(/add/i, '').trim();
        response = `I'll log a $${amount.toFixed(2)} expense for ${description || 'business expense'}. This will help with your tax deductions!`;
      }
    } else if (lowerMessage.includes('add lead') || lowerMessage.includes('add client')) {
      // Extract lead/client name
      const nameMatch = message.match(/add (?:lead|client) (.+?)(?: from (.+))?$/i);
      if (nameMatch) {
        const name = nameMatch[1];
        const company = nameMatch[2];
        response = `I'll add ${name}${company ? ` from ${company}` : ''} as a new lead. I'll also need their contact info later!`;
      }
    } else if (lowerMessage.includes('add team member') || lowerMessage.includes('add member')) {
      // Extract team member name
      const nameMatch = message.match(/add (?:team member|member) (.+?)(?: as (.+))?$/i);
      if (nameMatch) {
        const name = nameMatch[1];
        const role = nameMatch[2];
        response = `I'll add ${name}${role ? ` as ${role}` : ' as a team member'}. Welcome to the team!`;
      }
    } else if (lowerMessage.includes('add') && lowerMessage.includes('mile')) {
      // Extract mileage
      const mileageMatch = message.match(/(\d+(?:\.\d+)?)\s*miles?/i);
      if (mileageMatch) {
        const miles = parseFloat(mileageMatch[1]);
        response = `I'll log ${miles} miles for your business trip. This will help with your tax deductions!`;
      }
    } else if (lowerMessage.includes('kpi') || lowerMessage.includes('performance') || lowerMessage.includes('metrics')) {
      // If user data is available, provide data-driven responses
      if (userData && userData.kpiData && userData.mileageData) {
        console.log('[Jessica] Using user data for intelligent response');
        const kpi = userData.kpiData;
        response = `Here are your current KPIs:
• Total Doors: ${kpi.totalDoors}
• Total Appointments: ${kpi.totalAppointments}
• Total Deals: ${kpi.totalDeals}
• Total Accounts Serviced: ${kpi.totalAccountsServiced}
• Total Hours Worked: ${kpi.totalHoursWorked}
• Doors per Appointment: ${kpi.doorsPerAppointment.toFixed(2)}
• Appointment Hold Rate: ${(kpi.appointmentHoldRate * 100).toFixed(1)}%
• Appointment to Closed Rate: ${(kpi.appointmentToClosedRate * 100).toFixed(1)}%
• Dollars per Hour: $${kpi.dollarsPerHour.toFixed(2)}`;
      } else {
        response = "I can help you track your KPIs! Try logging your daily activities and I'll show you your performance metrics.";
      }
    } else if (lowerMessage.includes('mileage') || lowerMessage.includes('drive') || lowerMessage.includes('car')) {
      if (userData && userData.kpiData && userData.mileageData) {
        const mileage = userData.mileageData;
        response = `Your mileage summary:
• Total Mileage: ${mileage.totalMileage.toFixed(1)} miles
• Total Deduction: $${mileage.totalDeduction.toFixed(2)}
• This Month: ${mileage.monthlyMileage.toFixed(1)} miles ($${mileage.monthlyDeduction.toFixed(2)})
• Business Trips: ${mileage.tripsByType.business}
• Personal Trips: ${mileage.tripsByType.personal}`;
      } else {
        response = "For mileage tracking, use the Mileage tab to log your business trips. Keep track of start/end locations and purposes. This is crucial for tax deductions!";
      }
    } else if (lowerMessage.includes('today') || lowerMessage.includes('progress')) {
      if (userData && userData.kpiData && userData.mileageData) {
        const today = userData.kpiData.todayInput;
        if (today) {
          response = `Today's progress:
• Doors Knocked: ${today.doorsKnocked}
• Appointments: ${today.appointments}
• Appointment Holds: ${today.appointmentHolds}
• Closed Deals: ${today.closedDeals}
• Accounts Serviced: ${today.accountsServiced}
• Hours Worked: ${today.hoursWorked}`;
        } else {
          response = "I don't see any data for today yet. Try saying 'I knocked 25 doors today' or 'Add 3 appointments' to log your activities!";
        }
      } else {
        response = "I don't see any data for today yet. Use the Input tab to log your daily activities!";
      }
    } else if (lowerMessage.includes('revenue') || lowerMessage.includes('income') || lowerMessage.includes('earnings')) {
      if (userData && userData.kpiData && userData.mileageData) {
        const kpi = userData.kpiData;
        response = `Your revenue metrics:
• Total Revenue: $${kpi.totalRevenue.toFixed(2)}
• Dollars per Hour: $${kpi.dollarsPerHour.toFixed(2)}
• Total Hours Worked: ${kpi.totalHoursWorked}`;
      } else {
        response = "Track your revenue by logging your hours worked and income. I can help you calculate your dollars per hour!";
      }
    } else if (lowerMessage.includes('deduction') || lowerMessage.includes('tax')) {
      if (userData && userData.kpiData && userData.mileageData) {
        const mileage = userData.mileageData;
        response = `Your tax deduction summary:
• Total Mileage Deduction: $${mileage.totalDeduction.toFixed(2)}
• This Month's Deduction: $${mileage.monthlyDeduction.toFixed(2)}
• Total Business Miles: ${mileage.totalMileage.toFixed(1)} miles`;
      } else {
        response = "Great question about taxes! Track all your business expenses, mileage, and income here. Come tax time, you'll have everything organized for your 1099 filing!";
      }
    } else if (lowerMessage.includes('lead') || lowerMessage.includes('client') || lowerMessage.includes('customer')) {
      if (userData && userData.supabaseData && userData.supabaseData.totalLeads > 0) {
        const supabase = userData.supabaseData;
        response = `Your lead management summary:
• Total Leads: ${supabase.totalLeads}
• Total Clients: ${supabase.totalClients}
• Recent Leads: ${supabase.leads.slice(0, 3).map(l => l.name || l.company).join(', ')}`;
      } else {
        response = "Manage your leads in the CRM section! Add new clients, track follow-ups, and organize your business relationships. This helps you stay on top of opportunities!";
      }
    } else if (lowerMessage.includes('expense') || lowerMessage.includes('receipt') || lowerMessage.includes('cost')) {
      if (userData && userData.supabaseData && userData.supabaseData.totalExpenses > 0) {
        const supabase = userData.supabaseData;
        response = `Your expense tracking summary:
• Total Expenses: ${supabase.totalExpenses}
• Total Amount: $${supabase.totalExpenseAmount.toFixed(2)}
• Expense Categories: ${supabase.expenseCategories.length}`;
      } else {
        response = "I can help you track expenses! Use the Expenses tab to log your business costs. Take photos of receipts for easy record-keeping. This will help with tax deductions!";
      }
    } else if (lowerMessage.includes('team') || lowerMessage.includes('member')) {
      if (userData && userData.supabaseData && userData.supabaseData.totalTeamMembers > 0) {
        const supabase = userData.supabaseData;
        response = `Your team summary:
• Total Team Members: ${supabase.totalTeamMembers}
• Team Members: ${supabase.teamMembers.map(m => m.name).join(', ')}`;
      } else {
        response = "Build your team! Add team members to track their performance and manage your business growth.";
      }
    } else if (lowerMessage.includes('bank') || lowerMessage.includes('account') || lowerMessage.includes('plaid')) {
      response = "Connect your bank account using the Plaid integration! This will automatically import your transactions, making expense tracking much easier.";
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
      response = "I'm here to help with your 1099 business! I can assist with:\n• Logging daily activities (doors, appointments, deals)\n• Tracking expenses and mileage\n• Adding leads and team members\n• Analyzing your KPIs and performance\n\nTry saying things like:\n• 'I knocked 25 doors today'\n• 'Add $50 expense for gas'\n• 'Add lead John Smith'\n• 'What are my KPIs?'";
    } else {
      // Default helpful responses
      const fallbackResponses = [
        "I'm here to help with your 1099 business management! How can I assist you today?",
        "Great question! I can help you with expenses, mileage, leads, and tax preparation. What would you like to focus on?",
        "I understand you're asking about that. Let me help you with your business organization!",
        "Thanks for reaching out! I can assist you with expense tracking, mileage logging, and lead management.",
        "I see what you're asking about. Let me give you some guidance on business management!"
      ];
      response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
    
    console.log(`[Jessica] Sending response: ${response.substring(0, 100)}...`);
    res.json({
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Jessica] Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.post('/api/jessica-chat-image', async (req, res) => {
  const { message, imageUrl, userId, userData } = req.body;
  console.log('[Jessica] Received image message');
  console.log(`[Jessica] OpenAI available: ${!!openai}, API Key: ${!!process.env.OPENAI_API_KEY}`);
  
  try {
    let response;
    const lowerMessage = message.toLowerCase();
    
    if (openai && process.env.OPENAI_API_KEY) {
      console.log('[Jessica] Using OpenAI for image analysis');
      try {
        // Enhanced system prompt for business-focused image analysis
        const systemPrompt = `You are Jessica, an AI assistant for a 1099 contractor management app. 
        
        Analyze the image and provide business-focused insights. Focus on:
        
        **Receipts & Expenses:**
        - Extract business expense details (amount, date, vendor, items)
        - Identify if it's a valid business expense
        - Suggest appropriate expense categories
        - Note if it's tax-deductible
        
        **Mileage & Travel:**
        - Identify if it's a mileage log, odometer reading, or travel-related
        - Extract distance, dates, locations if visible
        - Suggest business vs personal classification
        
        **Business Documents:**
        - Analyze contracts, invoices, business cards
        - Extract contact information, amounts, dates
        - Identify business opportunities or leads
        
        **Office/Work Environment:**
        - Identify business equipment, supplies, workspace
        - Suggest productivity improvements
        - Note potential business deductions
        
        **General Business:**
        - If not business-related, politely redirect to business topics
        - Provide helpful business advice when appropriate
        
        Be specific, actionable, and business-focused. If you can extract data, format it clearly.`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Please analyze this image and provide business insights. User message: "${message}"` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
        });
        
        response = completion.choices[0]?.message?.content || "I can see the image you've shared. Let me help you with business insights!";
        console.log('[Jessica] OpenAI image analysis completed');
      } catch (openaiError) {
        console.error('[Jessica] OpenAI image analysis error:', openaiError);
        response = "I can see the image you've shared. I'm still learning to process images, but I can help you with text-based questions about business management, expenses, and tax deductions!";
      }
    } else {
      console.log('[Jessica] Using enhanced fallback response for image (no OpenAI)');
      
      // Enhanced fallback responses based on message keywords
      if (lowerMessage.includes('receipt') || lowerMessage.includes('expense') || lowerMessage.includes('bill')) {
        response = "I can see you've shared what looks like a receipt or expense document. While I can't analyze the image details without advanced AI, I can help you log this expense! Just tell me the amount and description, like 'Add $25 expense for office supplies' or 'Log $50 for gas receipt'.";
      } else if (lowerMessage.includes('mileage') || lowerMessage.includes('odometer') || lowerMessage.includes('trip')) {
        response = "I can see you've shared what looks like a mileage or travel-related image. While I can't read the specific details, I can help you log this mileage! Just tell me the distance and purpose, like 'Add 15 miles for client meeting' or 'Log 25 miles business trip'.";
      } else if (lowerMessage.includes('business card') || lowerMessage.includes('contact') || lowerMessage.includes('lead')) {
        response = "I can see you've shared what looks like a business card or contact information. While I can't read the specific details, I can help you add this as a lead! Just tell me the name and company, like 'Add lead John Smith from ABC Corp' or 'Add client Jane Doe'.";
      } else if (lowerMessage.includes('office') || lowerMessage.includes('workspace') || lowerMessage.includes('equipment')) {
        response = "I can see you've shared what looks like an office or workspace image. This could be relevant for business deductions! Consider tracking expenses for office supplies, equipment, or workspace improvements. I can help you log these as business expenses.";
      } else {
        response = "I can see the image you've shared. While I can't analyze the specific details without advanced AI, I can help you with business-related tasks! Try saying things like:\n• 'Add $50 expense for gas'\n• 'Log 15 miles for client meeting'\n• 'Add lead John Smith'\n• 'What are my business expenses?'";
      }
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`[Jessica] Sending image response: ${response.substring(0, 100)}...`);
    res.json({
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Jessica] Image chat error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Example: Add more endpoints here for other backend needs

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Plaid server running on port ${PORT}`)); 