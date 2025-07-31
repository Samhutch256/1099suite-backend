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
    
    // If user data is available, provide data-driven responses
    if (userData && userData.kpiData && userData.mileageData) {
      console.log('[Jessica] Using user data for intelligent response');
      
      if (lowerMessage.includes('kpi') || lowerMessage.includes('performance') || lowerMessage.includes('metrics')) {
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
      } else if (lowerMessage.includes('mileage') || lowerMessage.includes('drive') || lowerMessage.includes('car')) {
        const mileage = userData.mileageData;
        response = `Your mileage summary:
• Total Mileage: ${mileage.totalMileage.toFixed(1)} miles
• Total Deduction: $${mileage.totalDeduction.toFixed(2)}
• This Month: ${mileage.monthlyMileage.toFixed(1)} miles ($${mileage.monthlyDeduction.toFixed(2)})
• Business Trips: ${mileage.tripsByType.business}
• Personal Trips: ${mileage.tripsByType.personal}`;
      } else if (lowerMessage.includes('today') || lowerMessage.includes('progress')) {
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
          response = "I don't see any data for today yet. Use the Input tab to log your daily activities!";
        }
      } else if (lowerMessage.includes('revenue') || lowerMessage.includes('income') || lowerMessage.includes('earnings')) {
        const kpi = userData.kpiData;
        response = `Your revenue metrics:
• Total Revenue: $${kpi.totalRevenue.toFixed(2)}
• Dollars per Hour: $${kpi.dollarsPerHour.toFixed(2)}
• Total Hours Worked: ${kpi.totalHoursWorked}`;
      } else if (lowerMessage.includes('deduction') || lowerMessage.includes('tax')) {
        const mileage = userData.mileageData;
        response = `Your tax deduction summary:
• Total Mileage Deduction: $${mileage.totalDeduction.toFixed(2)}
• This Month's Deduction: $${mileage.monthlyDeduction.toFixed(2)}
• Total Business Miles: ${mileage.totalMileage.toFixed(1)} miles`;
      } else if (lowerMessage.includes('lead') || lowerMessage.includes('client') || lowerMessage.includes('customer')) {
        const supabase = userData.supabaseData;
        if (supabase && supabase.totalLeads > 0) {
          response = `Your lead management summary:
• Total Leads: ${supabase.totalLeads}
• Total Clients: ${supabase.totalClients}
• Recent Leads: ${supabase.leads.slice(0, 3).map(l => l.name || l.company).join(', ')}`;
        } else {
          response = "Manage your leads in the CRM section! Add new clients, track follow-ups, and organize your business relationships. This helps you stay on top of opportunities!";
        }
      } else if (lowerMessage.includes('expense') || lowerMessage.includes('receipt') || lowerMessage.includes('cost')) {
        const supabase = userData.supabaseData;
        if (supabase && supabase.totalExpenses > 0) {
          response = `Your expense tracking summary:
• Total Expenses: ${supabase.totalExpenses}
• Total Amount: $${supabase.totalExpenseAmount.toFixed(2)}
• Expense Categories: ${supabase.expenseCategories.length}`;
        } else {
          response = "I can help you track expenses! Use the Expenses tab to log your business costs. Take photos of receipts for easy record-keeping. This will help with tax deductions!";
        }
      } else if (lowerMessage.includes('team') || lowerMessage.includes('member')) {
        const supabase = userData.supabaseData;
        if (supabase && supabase.totalTeamMembers > 0) {
          response = `Your team summary:
• Total Team Members: ${supabase.totalTeamMembers}
• Team Members: ${supabase.teamMembers.map(m => m.name).join(', ')}`;
        } else {
          response = "Build your team! Add team members to track their performance and manage your business growth.";
        }
      } else if (lowerMessage.includes('bank') || lowerMessage.includes('account') || lowerMessage.includes('plaid')) {
        response = "Connect your bank account using the Plaid integration! This will automatically import your transactions, making expense tracking much easier.";
      } else {
        response = "I can see your data! Ask me about your KPIs, mileage, leads, expenses, team, today's progress, revenue, or tax deductions for specific insights.";
      }
    } else {
      // No user data available - use generic responses
      console.log('[Jessica] No user data available, using generic responses');
      
      if (lowerMessage.includes('expense') || lowerMessage.includes('receipt') || lowerMessage.includes('cost')) {
        response = "I can help you track expenses! Use the Expenses tab to log your business costs. Take photos of receipts for easy record-keeping. This will help with tax deductions!";
      } else if (lowerMessage.includes('mileage') || lowerMessage.includes('drive') || lowerMessage.includes('car')) {
        response = "For mileage tracking, use the Mileage tab to log your business trips. Keep track of start/end locations and purposes. This is crucial for tax deductions!";
      } else if (lowerMessage.includes('lead') || lowerMessage.includes('client') || lowerMessage.includes('customer')) {
        response = "Manage your leads in the CRM section! Add new clients, track follow-ups, and organize your business relationships. This helps you stay on top of opportunities!";
      } else if (lowerMessage.includes('tax') || lowerMessage.includes('deduction') || lowerMessage.includes('1099')) {
        response = "Great question about taxes! Track all your business expenses, mileage, and income here. Come tax time, you'll have everything organized for your 1099 filing!";
      } else if (lowerMessage.includes('bank') || lowerMessage.includes('account') || lowerMessage.includes('plaid')) {
        response = "Connect your bank account using the Plaid integration! This will automatically import your transactions, making expense tracking much easier.";
      } else if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
        response = "I'm here to help with your 1099 business! I can assist with expense tracking, mileage logging, lead management, and tax preparation. What would you like to know more about?";
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
  console.log('[Jessica] Received image message');
  console.log(`[Jessica] OpenAI available: ${!!openai}, API Key: ${!!process.env.OPENAI_API_KEY}`);
  
  try {
    let response;
    
    if (openai && process.env.OPENAI_API_KEY) {
      console.log('[Jessica] Using OpenAI for image analysis');
      try {
        // Use OpenAI for image analysis
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are Jessica, an AI assistant for a 1099 contractor management app. 
              Analyze the image the user has shared and provide helpful insights related to:
              - Business expenses and receipts
              - Mileage tracking
              - Tax deductions
              - Business organization
              - Productivity tips
              
              Be helpful and professional. If the image isn't business-related, politely redirect to business topics.`
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Please analyze this image and provide business-related insights:" },
                { type: "image_url", image_url: { url: req.body.imageUrl } }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        
        response = completion.choices[0]?.message?.content || "I can see the image you've shared. Let me help you with business insights!";
        console.log('[Jessica] OpenAI image analysis completed');
      } catch (openaiError) {
        console.error('[Jessica] OpenAI image analysis error:', openaiError);
        response = "I can see the image you've shared. I'm still learning to process images, but I can help you with text-based questions about business management, expenses, and tax deductions!";
      }
    } else {
      console.log('[Jessica] Using fallback response for image (no OpenAI)');
      // Fallback response if OpenAI is not configured
      response = "I can see the image you've shared. I'm still learning to process images, but I can help you with text-based questions about business management, expenses, and tax deductions!";
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`[Jessica] Sending image response: ${response.substring(0, 50)}...`);
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