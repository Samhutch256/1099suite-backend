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
const path = require('path');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Log OpenAI initialization
console.log('[Jessica] OpenAI initialization:', {
  hasAPIKey: !!process.env.OPENAI_API_KEY,
  hasClient: !!openai,
  apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Test OpenAI endpoint
app.get('/api/test-openai', async (req, res) => {
  if (!openai) {
    return res.json({ error: 'OpenAI not available' });
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Say "Hello, OpenAI is working!"' }
      ],
      max_tokens: 50
    });
    
    res.json({ 
      success: true, 
      response: response.choices[0]?.message?.content,
      model: 'gpt-4o'
    });
  } catch (error) {
    res.json({ 
      error: 'OpenAI API call failed', 
      details: error.message 
    });
  }
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
    
    console.log('[Jessica] Starting message processing for:', message.substring(0, 50) + '...');
    
    // Check if message contains 2 or more numbers - this is the primary trigger for AI
    const numbers = message.match(/\d+/g);
    const hasMultipleNumbers = numbers && numbers.length >= 2;
    
    console.log('[Jessica] Number analysis:', {
      numbersFound: numbers,
      hasMultipleNumbers,
      messageLength: message.length,
      message: message.substring(0, 100) + '...'
    });
    
    // Force AI for any message with 2+ numbers or complex input patterns
    const forceAI = openai && (
      hasMultipleNumbers || 
      lowerMessage.includes('from') || 
      lowerMessage.includes('via') ||
      lowerMessage.includes('under') ||
      lowerMessage.includes('inbound') ||
      lowerMessage.includes('outreach') ||
      lowerMessage.includes('appointments') ||
      lowerMessage.includes('deals') ||
      lowerMessage.includes('calls') ||
      lowerMessage.includes('held') ||
      lowerMessage.includes('set') ||
      lowerMessage.includes('closed') ||
      lowerMessage.includes('serviced') ||
      lowerMessage.includes('accounts') ||
      lowerMessage.includes('doors') ||
      lowerMessage.includes('knocked') ||
      lowerMessage.includes('derived')
    );
    
    console.log('[Jessica] AI trigger check:', {
      hasOpenAI: !!openai,
      hasMultipleNumbers,
      forceAI,
      messagePreview: message.substring(0, 50)
    });
    
    if (forceAI) {
      console.log('[Jessica] Using AI for complex message analysis');
      console.log('[Jessica] Trigger details:', {
        openai: !!openai,
        hasMultipleNumbers,
        numbersFound: numbers,
        messageLength: message.length
      });
      
      try {
        const systemPrompt = `You are Jessica, a helpful assistant who supports users with lead input, KPIs, appointments, and business operations. Respond naturally and flexibly like ChatGPT. Always infer context and help with initiative.

When users share their business activities, extract and log the relevant data while providing natural, conversational responses.

**Data Extraction Instructions:**
Extract the following key-value pairs from the user's message. Only include fields that have values > 0:

**Main Metrics:**
- doorsKnocked: Total doors knocked
- appointments: Total appointments set
- appointmentHolds: Total appointments held
- closedDeals: Total deals closed
- accountsServiced: Total accounts serviced
- hoursWorked: Hours worked

**Detailed Source Breakdowns:**
- outreachDoorKnocks: Doors knocked for outreach
- outreachTagsPut: Tags put for outreach
- outreachCallsMade: Calls made for outreach (including inbound calls)
- outreachReferrals: Referrals for outreach
- outreachInbound: Inbound calls for outreach

- appointmentsSetDoorKnocks: Appointments set from door knocks
- appointmentsSetTagsPut: Appointments set from tags
- appointmentsSetCallsMade: Appointments set from calls (including inbound calls)
- appointmentsSetReferrals: Appointments set from referrals
- appointmentsSetInbound: Appointments set from inbound calls

- appointmentsHeldDoorKnocks: Appointments held from door knocks
- appointmentsHeldTagsPut: Appointments held from tags
- appointmentsHeldCallsMade: Appointments held from calls (including inbound calls)
- appointmentsHeldReferrals: Appointments held from referrals
- appointmentsHeldInbound: Appointments held from inbound calls

- dealsClosedDoorKnocks: Deals closed from door knocks
- dealsClosedTagsPut: Deals closed from tags
- dealsClosedCallsMade: Deals closed from calls (including inbound calls)
- dealsClosedReferrals: Deals closed from referrals
- dealsClosedInbound: Deals closed from inbound calls

- accountsServicedDoorKnocks: Accounts serviced from door knocks
- accountsServicedTagsPut: Accounts serviced from tags
- accountsServicedCallsMade: Accounts serviced from calls (including inbound calls)
- accountsServicedReferrals: Accounts serviced from referrals
- accountsServicedInbound: Accounts serviced from inbound calls

**Key extraction rules:**
1. Look for numbers followed by activity descriptions
2. Identify source types (door knocks, tags, calls, referrals, inbound) when mentioned
3. Distinguish between "appointments set" vs "appointments held"
4. Only include fields that have values > 0
5. Handle natural language variations (e.g., "I knocked", "knocked", "doors", "via", "from", "received", "got", "derived")
6. For multi-line input, parse each line separately and sum up totals
7. When user says "inbound calls", map to both outreachCallsMade and outreachInbound
8. When user says "received X inbound calls", treat as outreachCallsMade and outreachInbound
9. When user says "set X appointments", map to appointments
10. When user says "held X appointments", map to appointmentHolds
11. When user says "X deals from inbound", map to dealsClosedInbound
12. When user says "X accounts derived from inbound", map to accountsServicedInbound
13. **IMPORTANT**: When user specifies a source (e.g., "under inbound", "from door knocks"), map BOTH the main field AND the corresponding sub-field:
    - "2 appointments under inbound" → appointments: 2, appointmentsSetInbound: 2
    - "3 deals from door knocks" → closedDeals: 3, dealsClosedDoorKnocks: 3
    - "1 account from referrals" → accountsServiced: 1, accountsServicedReferrals: 1
    - "4 appointments held from calls" → appointmentHolds: 4, appointmentsHeldCallsMade: 4
14. **ADDITIVE vs REPLACEMENT**: 
    - Additive language ("more", "additional", "extra", "another", "plus", "also") → ADD to existing values
    - Standard language ("I closed 5 deals", "I set 2 appointments") → REPLACE existing values

**Common patterns to recognize:**
- "received 25 inbound calls" → outreachCallsMade: 25, outreachInbound: 25
- "set 5 appointments" → appointments: 5
- "3 appointments held" → appointmentHolds: 3
- "2 deals closed" → closedDeals: 2
- "knocked 30 doors" → doorsKnocked: 30
- "3 deals from inbound" → dealsClosedInbound: 3
- "1 account derived from inbound" → accountsServicedInbound: 1

**Response Format:**
If you can extract data, respond with PURE JSON only, no additional text:
{
  "doorsKnocked": 25,
  "appointments": 3,
  "appointmentHolds": 1,
  "closedDeals": 2,
  "accountsServiced": 1,
  "hoursWorked": 8,
  "outreachDoorKnocks": 15,
  "outreachCallsMade": 25,
  "outreachInbound": 25,
  "appointmentsSetDoorKnocks": 2,
  "appointmentsHeldReferrals": 1,
  "dealsClosedInbound": 1
}

If you cannot extract specific data, provide a natural, helpful response that guides the user toward better input.

**Natural Communication Guidelines:**
- Be conversational and engaging
- Acknowledge the user's work and progress
- Provide context-aware suggestions
- Handle vague inputs gracefully with helpful guidance
- Use natural language, not rigid templates
- Show initiative in helping users achieve their goals`;

        console.log('[Jessica] Making OpenAI API call...');
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 1000,
          temperature: 0.1
        });

        const aiContent = aiResponse.choices[0]?.message?.content;
        console.log('[Jessica] OpenAI API call successful');
        console.log('[Jessica] Raw AI response:', aiContent);

        if (aiContent) {
          try {
            // Try to parse as JSON first (for data extraction)
            let extractedData = {};
            let naturalResponse = aiContent;
            
            try {
              extractedData = JSON.parse(aiContent);
              console.log('[Jessica] Parsed AI response as JSON:', extractedData);
              
              // If we got JSON data, build a natural response
              const activities = [];
              if (extractedData.doorsKnocked > 0) activities.push(`${extractedData.doorsKnocked} doors knocked`);
              if (extractedData.appointments > 0) activities.push(`${extractedData.appointments} appointments set`);
              if (extractedData.appointmentHolds > 0) activities.push(`${extractedData.appointmentHolds} appointments held`);
              if (extractedData.closedDeals > 0) activities.push(`${extractedData.closedDeals} deals closed`);
              if (extractedData.accountsServiced > 0) activities.push(`${extractedData.accountsServiced} accounts serviced`);
              if (extractedData.hoursWorked > 0) activities.push(`${extractedData.hoursWorked} hours worked`);
              
              if (activities.length > 0) {
                // Check if user is using additive language
                const lowerMessage = message.toLowerCase();
                const isAdditive = lowerMessage.includes('more') || 
                                 lowerMessage.includes('additional') || 
                                 lowerMessage.includes('extra') || 
                                 lowerMessage.includes('another') ||
                                 lowerMessage.includes('plus') ||
                                 lowerMessage.includes('also');
                
                if (isAdditive) {
                  naturalResponse = `🎉 Great! I've added ${activities.join(', ')} to your totals for today. Keep building momentum!`;
                } else {
                  naturalResponse = `🎉 Great work! I've logged ${activities.join(', ')} for today. You're making excellent progress! Keep up the momentum!`;
                }
              }
            } catch (parseError) {
              // If not JSON, use the natural response as-is
              console.log('[Jessica] Using natural AI response:', aiContent);
              naturalResponse = aiContent;
            }

            // Ensure all required fields are present with defaults
            const completeData = {
              doorsKnocked: 0,
              appointments: 0,
              appointmentHolds: 0,
              closedDeals: 0,
              accountsServiced: 0,
              hoursWorked: 0,
              notes: '',
              // Sub-inputs with defaults
              outreachDoorKnocks: 0,
              outreachTagsPut: 0,
              outreachCallsMade: 0,
              outreachReferrals: 0,
              outreachInbound: 0,
              appointmentsSetDoorKnocks: 0,
              appointmentsSetTagsPut: 0,
              appointmentsSetCallsMade: 0,
              appointmentsSetReferrals: 0,
              appointmentsSetInbound: 0,
              appointmentsHeldDoorKnocks: 0,
              appointmentsHeldTagsPut: 0,
              appointmentsHeldCallsMade: 0,
              appointmentsHeldReferrals: 0,
              appointmentsHeldInbound: 0,
              dealsClosedDoorKnocks: 0,
              dealsClosedTagsPut: 0,
              dealsClosedCallsMade: 0,
              dealsClosedReferrals: 0,
              dealsClosedInbound: 0,
              accountsServicedDoorKnocks: 0,
              accountsServicedTagsPut: 0,
              accountsServicedCallsMade: 0,
              accountsServicedReferrals: 0,
              accountsServicedInbound: 0,
              ...extractedData
            };

            if (supabase && userId) {
              console.log('[Jessica] Saving to Supabase for user:', userId);
              const today = new Date().toISOString().split('T')[0];
              
              // Check for existing data
              const { data: existingData, error: fetchError } = await supabase
                .from('daily_inputs')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .single();

              if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('[Jessica] Error fetching existing data:', fetchError);
              }

              // Prepare upsert data with proper field mapping
              const upsertData = {
                user_id: userId,
                date: today,
                doors_knocked: completeData.doorsKnocked,
                appointments: completeData.appointments,
                appointment_holds: completeData.appointmentHolds,
                closed_deals: completeData.closedDeals,
                accounts_serviced: completeData.accountsServiced,
                hours_worked: completeData.hoursWorked,
                notes: completeData.notes,
                // Sub-input fields
                outreach_door_knocks: completeData.outreachDoorKnocks,
                outreach_tags_put: completeData.outreachTagsPut,
                outreach_calls_made: completeData.outreachCallsMade,
                outreach_referrals: completeData.outreachReferrals,
                outreach_inbound: completeData.outreachInbound,
                appointments_set_door_knocks: completeData.appointmentsSetDoorKnocks,
                appointments_set_tags_put: completeData.appointmentsSetTagsPut,
                appointments_set_calls_made: completeData.appointmentsSetCallsMade,
                appointments_set_referrals: completeData.appointmentsSetReferrals,
                appointments_set_inbound: completeData.appointmentsSetInbound,
                appointments_held_door_knocks: completeData.appointmentsHeldDoorKnocks,
                appointments_held_tags_put: completeData.appointmentsHeldTagsPut,
                appointments_held_calls_made: completeData.appointmentsHeldCallsMade,
                appointments_held_referrals: completeData.appointmentsHeldReferrals,
                appointments_held_inbound: completeData.appointmentsHeldInbound,
                deals_closed_door_knocks: completeData.dealsClosedDoorKnocks,
                deals_closed_tags_put: completeData.dealsClosedTagsPut,
                deals_closed_calls_made: completeData.dealsClosedCallsMade,
                deals_closed_referrals: completeData.dealsClosedReferrals,
                deals_closed_inbound: completeData.dealsClosedInbound,
                accounts_serviced_door_knocks: completeData.accountsServicedDoorKnocks,
                accounts_serviced_tags_put: completeData.accountsServicedTagsPut,
                accounts_serviced_calls_made: completeData.accountsServicedCallsMade,
                accounts_serviced_referrals: completeData.accountsServicedReferrals,
                accounts_serviced_inbound: completeData.accountsServicedInbound,
              };

              // If existing data, merge the values
              if (existingData) {
                console.log('[Jessica] Merging with existing data');
                
                // Check if user is using additive language
                const lowerMessage = message.toLowerCase();
                const isAdditive = lowerMessage.includes('more') || 
                                 lowerMessage.includes('additional') || 
                                 lowerMessage.includes('extra') || 
                                 lowerMessage.includes('another') ||
                                 lowerMessage.includes('plus') ||
                                 lowerMessage.includes('also');
                
                console.log('[Jessica] Additive language detected:', isAdditive);
                
                Object.keys(completeData).forEach(key => {
                  if (completeData[key] > 0) {
                    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    if (upsertData[dbKey] !== undefined) {
                      if (isAdditive) {
                        // Add to existing value
                        upsertData[dbKey] = (existingData[dbKey] || 0) + completeData[key];
                        console.log(`[Jessica] Adding ${completeData[key]} to existing ${dbKey}: ${existingData[dbKey] || 0} + ${completeData[key]} = ${upsertData[dbKey]}`);
                      } else {
                        // Replace existing value
                        upsertData[dbKey] = completeData[key];
                        console.log(`[Jessica] Replacing ${dbKey}: ${existingData[dbKey] || 0} → ${completeData[key]}`);
                      }
                    }
                  }
                });
              }

              const { data: saveData, error: saveError } = await supabase
                .from('daily_inputs')
                .upsert(upsertData, { onConflict: 'user_id,date' });

              if (saveError) {
                console.error('[Jessica] Error saving to Supabase:', saveError);
              } else {
                console.log('[Jessica] Successfully saved to Supabase:', saveData);
              }
            }

            // Build response message
            const activities = [];
            if (completeData.doorsKnocked > 0) activities.push(`${completeData.doorsKnocked} doors knocked`);
            if (completeData.appointments > 0) activities.push(`${completeData.appointments} appointments set`);
            if (completeData.appointmentHolds > 0) activities.push(`${completeData.appointmentHolds} appointments held`);
            if (completeData.closedDeals > 0) activities.push(`${completeData.closedDeals} deals closed`);
            if (completeData.accountsServiced > 0) activities.push(`${completeData.accountsServiced} accounts serviced`);
            if (completeData.hoursWorked > 0) activities.push(`${completeData.hoursWorked} hours worked`);

            // Customize Jessica's response here
            response = naturalResponse;

            res.json({
              response: response,
              extractedData: completeData,
              shouldSave: true,
              timestamp: new Date().toISOString()
            });
            return;

          } catch (parseError) {
            console.log('[Jessica] Failed to parse AI response as JSON:', parseError);
            console.log('[Jessica] Raw AI content:', aiContent);
            response = "I understand what you're saying, but I need a bit more detail to log your activities properly. Could you try being more specific with numbers and what you accomplished? For example, 'I knocked 25 doors' or 'I set 3 appointments today' would help me track your progress better!";
          }
        } else {
          throw new Error('No AI response received');
        }
      } catch (aiError) {
        console.error('[Jessica] AI analysis failed:', aiError);
        console.log('[Jessica] Falling back to simple processing');
      }
    } else {
      console.log('[Jessica] AI analysis not triggered. Conditions:', {
        hasOpenAI: !!openai,
        hasMultipleNumbers,
        messageLength: message.length
      });
    }
    
    // Simple fallback for basic messages (single number only)
    if (!response) {
      console.log('[Jessica] Using simple fallback for basic message');
      
      // Enhanced fallback processing for complex inputs
      const numbers = message.match(/\d+/g);
      const lowerMessage = message.toLowerCase();
      
      if (numbers && numbers.length >= 1) {
        const inputDataObj = {};
        let hasData = false;
        
        // Parse complex inputs like "received 25 inbound calls, set 5 appointments, 3 appointments held, and 2 deals closed"
        if (lowerMessage.includes('received') && lowerMessage.includes('inbound') && lowerMessage.includes('calls')) {
          const inboundMatch = message.match(/received\s+(\d+)\s+inbound\s+calls/i);
          if (inboundMatch) {
            const count = parseInt(inboundMatch[1]);
            inputDataObj.outreachCallsMade = count;
            inputDataObj.outreachInbound = count;
            hasData = true;
          }
        }
        
        if (lowerMessage.includes('set') && lowerMessage.includes('appointments')) {
          const setMatch = message.match(/set\s+(\d+)\s+appointments/i);
          if (setMatch) {
            inputDataObj.appointments = parseInt(setMatch[1]);
            hasData = true;
          }
        }
        
        if (lowerMessage.includes('appointments') && lowerMessage.includes('held')) {
          const heldMatch = message.match(/(\d+)\s+appointments?\s+held/i);
          if (heldMatch) {
            inputDataObj.appointmentHolds = parseInt(heldMatch[1]);
            hasData = true;
          }
        }
        
        if (lowerMessage.includes('deals') && lowerMessage.includes('closed')) {
          const dealsMatch = message.match(/(\d+)\s+deals?\s+closed/i);
          if (dealsMatch) {
            inputDataObj.closedDeals = parseInt(dealsMatch[1]);
            hasData = true;
          }
        }
        
        if (lowerMessage.includes('knocked') || lowerMessage.includes('door')) {
          const doorsMatch = message.match(/(\d+)\s+doors?/i) || message.match(/knocked\s+(\d+)/i);
          if (doorsMatch) {
            inputDataObj.doorsKnocked = parseInt(doorsMatch[1]);
            hasData = true;
          }
        }
        
        if (lowerMessage.includes('hour') || lowerMessage.includes('worked')) {
          const hoursMatch = message.match(/(\d+)\s+hours?/i) || message.match(/worked\s+(\d+)/i);
          if (hoursMatch) {
            inputDataObj.hoursWorked = parseInt(hoursMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X deals from inbound" pattern
        if (lowerMessage.includes('deals') && lowerMessage.includes('from') && lowerMessage.includes('inbound')) {
          const dealsInboundMatch = message.match(/(\d+)\s+deals?\s+from\s+inbound/i);
          if (dealsInboundMatch) {
            inputDataObj.dealsClosedInbound = parseInt(dealsInboundMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X accounts derived from inbound" pattern
        if (lowerMessage.includes('account') && lowerMessage.includes('derived') && lowerMessage.includes('from') && lowerMessage.includes('inbound')) {
          const accountsInboundMatch = message.match(/(\d+)\s+accounts?\s+derived\s+from\s+inbound/i);
          if (accountsInboundMatch) {
            inputDataObj.accountsServicedInbound = parseInt(accountsInboundMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X deals closed" pattern
        if (lowerMessage.includes('deals') && lowerMessage.includes('closed')) {
          const dealsClosedMatch = message.match(/(\d+)\s+deals?\s+closed/i);
          if (dealsClosedMatch) {
            inputDataObj.closedDeals = parseInt(dealsClosedMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X accounts serviced" pattern
        if (lowerMessage.includes('account') && lowerMessage.includes('serviced')) {
          const accountsServicedMatch = message.match(/(\d+)\s+accounts?\s+serviced/i);
          if (accountsServicedMatch) {
            inputDataObj.accountsServiced = parseInt(accountsServicedMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X deals from inbound" pattern (alternative)
        if (lowerMessage.includes('deals') && lowerMessage.includes('inbound')) {
          const dealsInboundAltMatch = message.match(/(\d+)\s+deals?\s+.*inbound/i);
          if (dealsInboundAltMatch) {
            inputDataObj.dealsClosedInbound = parseInt(dealsInboundAltMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X accounts derived from inbound" pattern (alternative)
        if (lowerMessage.includes('account') && lowerMessage.includes('inbound')) {
          const accountsInboundAltMatch = message.match(/(\d+)\s+accounts?\s+.*inbound/i);
          if (accountsInboundAltMatch) {
            inputDataObj.accountsServicedInbound = parseInt(accountsInboundAltMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X appointments under inbound" pattern
        if (lowerMessage.includes('appointments') && lowerMessage.includes('under') && lowerMessage.includes('inbound')) {
          const appointmentsInboundMatch = message.match(/(\d+)\s+appointments?\s+under\s+inbound/i);
          if (appointmentsInboundMatch) {
            inputDataObj.appointments = parseInt(appointmentsInboundMatch[1]);
            inputDataObj.appointmentsSetInbound = parseInt(appointmentsInboundMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "Log X appointments for today under inbound" pattern
        if (lowerMessage.includes('log') && lowerMessage.includes('appointments') && lowerMessage.includes('under') && lowerMessage.includes('inbound')) {
          const logAppointmentsInboundMatch = message.match(/log\s+(\d+)\s+appointments?\s+.*under\s+inbound/i);
          if (logAppointmentsInboundMatch) {
            inputDataObj.appointments = parseInt(logAppointmentsInboundMatch[1]);
            inputDataObj.appointmentsSetInbound = parseInt(logAppointmentsInboundMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "Log X deals from inbound" pattern
        if (lowerMessage.includes('log') && lowerMessage.includes('deals') && lowerMessage.includes('from') && lowerMessage.includes('inbound')) {
          const logDealsInboundMatch = message.match(/log\s+(\d+)\s+deals?\s+.*from\s+inbound/i);
          if (logDealsInboundMatch) {
            inputDataObj.closedDeals = parseInt(logDealsInboundMatch[1]);
            inputDataObj.dealsClosedInbound = parseInt(logDealsInboundMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "Log X accounts from referrals" pattern
        if (lowerMessage.includes('log') && lowerMessage.includes('account') && lowerMessage.includes('from') && lowerMessage.includes('referral')) {
          const logAccountsReferralMatch = message.match(/log\s+(\d+)\s+accounts?\s+.*from\s+referrals?/i);
          if (logAccountsReferralMatch) {
            inputDataObj.accountsServiced = parseInt(logAccountsReferralMatch[1]);
            inputDataObj.accountsServicedReferrals = parseInt(logAccountsReferralMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X appointments from door knocks" pattern
        if (lowerMessage.includes('appointments') && lowerMessage.includes('from') && lowerMessage.includes('door')) {
          const appointmentsDoorMatch = message.match(/(\d+)\s+appointments?\s+from\s+door/i);
          if (appointmentsDoorMatch) {
            inputDataObj.appointments = parseInt(appointmentsDoorMatch[1]);
            inputDataObj.appointmentsSetDoorKnocks = parseInt(appointmentsDoorMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X deals from door knocks" pattern
        if (lowerMessage.includes('deals') && lowerMessage.includes('from') && lowerMessage.includes('door')) {
          const dealsDoorMatch = message.match(/(\d+)\s+deals?\s+from\s+door/i);
          if (dealsDoorMatch) {
            inputDataObj.closedDeals = parseInt(dealsDoorMatch[1]);
            inputDataObj.dealsClosedDoorKnocks = parseInt(dealsDoorMatch[1]);
            hasData = true;
          }
        }
        
        // Handle "X accounts from referrals" pattern
        if (lowerMessage.includes('account') && lowerMessage.includes('from') && lowerMessage.includes('referral')) {
          const accountsReferralMatch = message.match(/(\d+)\s+accounts?\s+from\s+referrals?/i);
          if (accountsReferralMatch) {
            inputDataObj.accountsServiced = parseInt(accountsReferralMatch[1]);
            inputDataObj.accountsServicedReferrals = parseInt(accountsReferralMatch[1]);
            hasData = true;
          }
        }
        
        if (hasData) {
          // Build response message
          const fallbackActivities = [];
          if (inputDataObj.doorsKnocked) fallbackActivities.push(`${inputDataObj.doorsKnocked} doors knocked`);
          if (inputDataObj.outreachCallsMade) fallbackActivities.push(`${inputDataObj.outreachCallsMade} inbound calls`);
          if (inputDataObj.appointments) fallbackActivities.push(`${inputDataObj.appointments} appointments set`);
          if (inputDataObj.appointmentHolds) fallbackActivities.push(`${inputDataObj.appointmentHolds} appointments held`);
          if (inputDataObj.closedDeals) fallbackActivities.push(`${inputDataObj.closedDeals} deals closed`);
          if (inputDataObj.hoursWorked) fallbackActivities.push(`${inputDataObj.hoursWorked} hours worked`);
          if (inputDataObj.dealsClosedInbound) fallbackActivities.push(`${inputDataObj.dealsClosedInbound} deals from inbound`);
          if (inputDataObj.accountsServicedInbound) fallbackActivities.push(`${inputDataObj.accountsServicedInbound} accounts from inbound`);
          if (inputDataObj.appointmentsSetInbound) fallbackActivities.push(`${inputDataObj.appointmentsSetInbound} appointments from inbound`);
          if (inputDataObj.appointmentsSetDoorKnocks) fallbackActivities.push(`${inputDataObj.appointmentsSetDoorKnocks} appointments from door knocks`);
          if (inputDataObj.dealsClosedDoorKnocks) fallbackActivities.push(`${inputDataObj.dealsClosedDoorKnocks} deals from door knocks`);
          if (inputDataObj.accountsServicedReferrals) fallbackActivities.push(`${inputDataObj.accountsServicedReferrals} accounts from referrals`);
          
          // Check if user is using additive language
          const isAdditive = lowerMessage.includes('more') || 
                           lowerMessage.includes('additional') || 
                           lowerMessage.includes('extra') || 
                           lowerMessage.includes('another') ||
                           lowerMessage.includes('plus') ||
                           lowerMessage.includes('also');
          
          // Customize fallback response
          if (isAdditive) {
            response = `🚀 Awesome! I've added ${fallbackActivities.join(', ')} to your totals for today. Keep building momentum!`;
          } else {
            response = `🚀 Awesome! I've logged ${fallbackActivities.join(', ')} for today. You're making great progress!`;
          }
          
          res.json({
            response: response,
            extractedData: inputDataObj,
            shouldSave: true,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
      
      // Only handle simple messages with exactly ONE number if no complex parsing worked
      if (numbers && numbers.length === 1) {
        const count = parseInt(numbers[0]);
        if (lowerMessage.includes('knocked') || lowerMessage.includes('door')) {
          response = `🎯 I'll log ${count} doors knocked for today. You're building momentum!`;
        } else if (lowerMessage.includes('appointment') || lowerMessage.includes('set')) {
          response = `📅 I'll log ${count} appointments for today. Great networking!`;
        } else if (lowerMessage.includes('deal') || lowerMessage.includes('closed')) {
          response = `💰 I'll log ${count} deals closed for today. Fantastic results!`;
        } else if (lowerMessage.includes('hour') || lowerMessage.includes('worked')) {
          response = `⏰ I'll log ${count} hours worked for today. Stay productive!`;
        }
      }
    }
    
    // Final fallback for any other messages
    if (!response) {
      console.log('[Jessica] No specific processing, using general fallback');
      response = "I'd love to help you track your business activities! Try telling me something specific like 'I knocked 25 doors, set 3 appointments from door knocks, and closed 2 deals from inbound calls' with numbers and details. I'm here to help you stay organized and motivated! 🎯";
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

// Google OAuth configuration
const googleOAuthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || '515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com',
  process.env.GOOGLE_CLIENT_SECRET
);

// Google OAuth callback endpoint
app.get('/auth/google/callback', async (req, res) => {
  console.log('[Google OAuth] Callback received:', req.query);
  
  // Extract the authorization code from the query parameters
  const { code, state } = req.query;
  
  if (!code) {
    console.error('[Google OAuth] No authorization code received');
    return res.status(400).json({ error: 'No authorization code received' });
  }
  
  try {
    // Exchange the authorization code for tokens
    const { tokens } = await googleOAuthClient.getToken(code);
    console.log('[Google OAuth] Tokens received:', { 
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      id_token: !!tokens.id_token 
    });
    
    // Get user info from Google
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID || '515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    console.log('[Google OAuth] User info:', {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    });
    
    // Return user data and tokens
    res.json({
      success: true,
      message: 'Google OAuth successful',
      user: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Google OAuth] Token exchange error:', error);
    res.status(500).json({ 
      error: 'Failed to exchange authorization code for tokens',
      details: error.message 
    });
  }
});

// Google OAuth token exchange endpoint (POST)
app.post('/auth/google/callback', async (req, res) => {
  console.log('[Google OAuth] Token exchange request received');
  
  const { code } = req.body;
  
  if (!code) {
    console.error('[Google OAuth] No authorization code received');
    return res.status(400).json({ error: 'No authorization code received' });
  }
  
  try {
    // Exchange the authorization code for tokens
    const { tokens } = await googleOAuthClient.getToken(code);
    console.log('[Google OAuth] Tokens received:', { 
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      id_token: !!tokens.id_token 
    });
    
    // Get user info from Google
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID || '515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    console.log('[Google OAuth] User info:', {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    });
    
    // Return user data and tokens
    res.json({
      success: true,
      message: 'Google OAuth successful',
      user: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Google OAuth] Token exchange error:', error);
    res.status(500).json({ 
      error: 'Failed to exchange authorization code for tokens',
      details: error.message 
    });
  }
});

// Serve privacy policy and terms of service
app.get('/privacy-policy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - 1099Suite</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #f97316; }
        h2 { color: #374151; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p><strong>Last updated:</strong> December 2024</p>

    <h2>1. Information We Collect</h2>
    <p>1099Suite collects information you provide directly to us, including:</p>
    <ul>
        <li>Account information (name, email, password)</li>
        <li>Business data (expenses, mileage, KPIs)</li>
        <li>Usage data to improve our services</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
        <li>Provide and maintain our services</li>
        <li>Process your business data and generate reports</li>
        <li>Send you important updates about our service</li>
        <li>Improve our application and user experience</li>
    </ul>

    <h2>3. Data Security</h2>
    <p>We implement appropriate security measures to protect your personal information. Your data is encrypted and stored securely using industry-standard practices.</p>

    <h2>4. Third-Party Services</h2>
    <p>We use trusted third-party services including:</p>
    <ul>
        <li>Google OAuth for authentication</li>
        <li>Supabase for data storage</li>
        <li>Railway for hosting</li>
    </ul>

    <h2>5. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and data</li>
        <li>Export your data</li>
    </ul>

    <h2>6. Contact Us</h2>
    <p>If you have questions about this privacy policy, please contact us at your support email.</p>
</body>
</html>
  `);
});

app.get('/terms-of-service', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - 1099Suite</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #f97316; }
        h2 { color: #374151; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><strong>Last updated:</strong> December 2024</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using 1099Suite, you accept and agree to be bound by the terms and provision of this agreement.</p>

    <h2>2. Description of Service</h2>
    <p>1099Suite is a business management application designed for independent contractors to track expenses, mileage, KPIs, and business metrics.</p>

    <h2>3. User Accounts</h2>
    <p>You are responsible for:</p>
    <ul>
        <li>Maintaining the confidentiality of your account</li>
        <li>All activities that occur under your account</li>
        <li>Providing accurate and complete information</li>
    </ul>

    <h2>4. Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
        <li>Use the service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to the service</li>
        <li>Interfere with the proper working of the service</li>
        <li>Share your account credentials with others</li>
    </ul>

    <h2>5. Data and Privacy</h2>
    <p>Your data is important to us. We:</p>
    <ul>
        <li>Store your data securely</li>
        <li>Never sell your personal information</li>
        <li>Use your data only to provide our services</li>
        <li>Allow you to export your data at any time</li>
    </ul>

    <h2>6. Service Availability</h2>
    <p>We strive to maintain high availability but cannot guarantee uninterrupted service. We may perform maintenance that temporarily affects service availability.</p>

    <h2>7. Limitation of Liability</h2>
    <p>1099Suite is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>

    <h2>8. Changes to Terms</h2>
    <p>We may update these terms from time to time. We will notify users of significant changes via email or in-app notification.</p>

    <h2>9. Contact Information</h2>
    <p>If you have questions about these terms, please contact us at your support email.</p>
</body>
</html>
  `);
});

// Example: Add more endpoints here for other backend needs

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Plaid server running on port ${PORT}`)); 