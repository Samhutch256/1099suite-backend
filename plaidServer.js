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
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    await supabase.from('plaid_tokens').upsert({ user_id, access_token: accessToken });
    res.status(200).json({ access_token: accessToken, message: 'Access token stored successfully.' });
  } catch (error) {
    console.error('Exchange error:', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// Plaid: Get Transactions
app.get('/api/transactions', async (req, res) => {
  const { user_id, start_date, end_date } = req.query;
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
  const { message, userId } = req.body;
  console.log(`[Jessica] Received message from user ${userId}: ${message}`);
  
  try {
    let response;
    
    if (openai && process.env.OPENAI_API_KEY) {
      // Use OpenAI for intelligent responses
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Jessica, an AI assistant for a 1099 contractor management app called 1099Suite. 
            You help users with:
            - Business management and organization
            - Expense tracking and deductions
            - Lead management and CRM
            - Mileage tracking
            - Tax preparation tips
            - Productivity and efficiency
            
            Be helpful, friendly, and professional. Keep responses concise but informative. 
            If you don't know something specific about the app, suggest they check the relevant section or contact support.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      
      response = completion.choices[0]?.message?.content || "I'm here to help!";
    } else {
      // Fallback responses if OpenAI is not configured
      const fallbackResponses = [
        "I understand you're asking about that. Let me help you with that.",
        "That's a great question! Here's what I can tell you about that.",
        "I'm here to help! Let me provide some guidance on that.",
        "Thanks for reaching out! I can assist you with that.",
        "I see what you're asking about. Let me give you some information on that."
      ];
      
      response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
  
  try {
    let response;
    
    if (openai && process.env.OPENAI_API_KEY) {
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
    } else {
      // Fallback response if OpenAI is not configured
      response = "I can see the image you've shared. I'm still learning to process images, but I can help you with text-based questions about business management, expenses, and tax deductions!";
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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