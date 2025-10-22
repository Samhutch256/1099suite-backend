import * as SQLite from 'expo-sqlite';
import { DailyInput } from '../state/kpiStore';
import { generateUniqueId } from '../utils/generateId';
import { supabaseService } from './supabaseService';

export interface UserDailyInput extends Omit<DailyInput, 'id'> {
  id?: number;
  userId: string;
  syncId: string; // Unique ID for cross-device sync
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private initAttempts = 0;
  private maxInitAttempts = 3;
  private lastInitAttempt = 0;

  async verifySchema() {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Check if daily_inputs table has all required columns
      const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(daily_inputs);`);
      const columnNames = tableInfo.map((col: any) => col.name);
      
      const requiredColumns = [
        'appointments_set_referrals',
        'appointments_set_inbound',
        'appointments_held_referrals',
        'appointments_held_inbound',
        'deals_closed_referrals',
        'deals_closed_inbound',
        'accounts_serviced_referrals',
        'accounts_serviced_inbound',
        'tally_counts'
      ];

      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('Missing columns detected:', missingColumns);
        return false;
      }
      
      console.log('Database schema verification passed');
      return true;
    } catch (error) {
      console.error('Schema verification failed:', error);
      return false;
    }
  }

  async getDatabaseInfo() {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Get table info
      const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(daily_inputs);`);
      console.log('Daily inputs table structure:', tableInfo);
      
      // Get migration info
      try {
        const migrations = await this.db.getAllAsync(`SELECT * FROM migrations ORDER BY version;`);
        console.log('Applied migrations:', migrations);
      } catch (error) {
        console.log('No migrations table found');
      }
      
      return {
        tableInfo,
        columnsCount: tableInfo.length,
        hasRequiredColumns: tableInfo.map((col: any) => col.name).includes('appointments_set_referrals')
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      throw error;
    }
  }

  async initialize() {
    // Prevent concurrent initialization
    if (this.isInitializing && this.initPromise) {
      console.log('⏳ Database initialization already in progress, waiting...');
      await this.initPromise;
      return;
    }
    
    if (this.db) {
      console.log('✅ Database already initialized');
      return;
    }

    // Circuit breaker: prevent too many rapid initialization attempts
    const now = Date.now();
    if (this.initAttempts >= this.maxInitAttempts && (now - this.lastInitAttempt) < 30000) {
      console.warn('⚠️ Database initialization circuit breaker activated - too many attempts');
      throw new Error('Database initialization circuit breaker activated');
    }
    
    if ((now - this.lastInitAttempt) > 30000) {
      this.initAttempts = 0; // Reset attempts after 30 seconds
    }
    
    this.initAttempts++;
    this.lastInitAttempt = now;

    this.isInitializing = true;
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async _initializeInternal() {
    try {
      console.log('🗄️ Initializing database...');
      this.db = await SQLite.openDatabaseAsync('trackingApp.db');
      console.log('✅ Database opened successfully');
      
      await this.createTables();
      console.log('✅ Database tables created successfully');
      
      // Run migrations with timeout
      const migrationTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Migration timeout')), 10000)
      );
      
      await Promise.race([
        this.runMigrations(),
        migrationTimeout
      ]);
      console.log('✅ Database migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      
      // Try to recover with a fresh database
      try {
        console.log('🔄 Attempting database recovery...');
        await this.recoverDatabase();
        console.log('✅ Database recovery successful');
      } catch (recoveryError) {
        console.error('❌ Database recovery failed:', recoveryError);
        let message = 'Unknown error';
        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === 'string') {
          message = error;
        }
        throw new Error(`Database initialization failed: ${message}`);
      }
    }
  }

  private async recoverDatabase() {
    try {
      console.log('🔄 Starting database recovery...');
      
      // Close existing connection if any
      if (this.db) {
        try {
          await this.db.closeAsync();
          console.log('✅ Database closed');
        } catch (closeError) {
          console.warn('⚠️ Error closing database:', closeError);
        }
        this.db = null;
      }
      
      // Try to delete and recreate
      try {
        await SQLite.deleteDatabaseAsync('trackingApp.db');
        console.log('✅ Database file deleted');
      } catch (deleteError) {
        console.warn('⚠️ Error deleting database file:', deleteError);
      }
      
      // Recreate database
      this.db = await SQLite.openDatabaseAsync('trackingApp.db');
      console.log('✅ Database reopened');
      
      // Create basic tables only - skip complex migrations
      await this.createTables();
      console.log('✅ Basic tables created');
      
      console.log('🎉 Database recovery completed');
    } catch (error) {
      console.error('❌ Failed to recover database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Create users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        photo_url TEXT,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL,
        settings TEXT DEFAULT '{}'
      );
    `);

    // Create daily_inputs table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_inputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        sync_id TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        doors_knocked INTEGER DEFAULT 0,
        appointments INTEGER DEFAULT 0,
        appointment_holds INTEGER DEFAULT 0,
        closed_deals INTEGER DEFAULT 0,
        accounts_serviced INTEGER DEFAULT 0,
        hours_worked REAL DEFAULT 0,
        notes TEXT,
        
        -- Sub-input fields
        outreach_door_knocks INTEGER DEFAULT 0,
        outreach_tags_put INTEGER DEFAULT 0,
        outreach_calls_made INTEGER DEFAULT 0,
        appointments_set_door_knocks INTEGER DEFAULT 0,
        appointments_set_tags_put INTEGER DEFAULT 0,
        appointments_set_calls_made INTEGER DEFAULT 0,
        appointments_set_referrals INTEGER DEFAULT 0,
        appointments_set_inbound INTEGER DEFAULT 0,
        appointments_held_door_knocks INTEGER DEFAULT 0,
        appointments_held_tags_put INTEGER DEFAULT 0,
        appointments_held_calls_made INTEGER DEFAULT 0,
        appointments_held_referrals INTEGER DEFAULT 0,
        appointments_held_inbound INTEGER DEFAULT 0,
        deals_closed_door_knocks INTEGER DEFAULT 0,
        deals_closed_tags_put INTEGER DEFAULT 0,
        deals_closed_calls_made INTEGER DEFAULT 0,
        deals_closed_referrals INTEGER DEFAULT 0,
        deals_closed_inbound INTEGER DEFAULT 0,
        accounts_serviced_door_knocks INTEGER DEFAULT 0,
        accounts_serviced_tags_put INTEGER DEFAULT 0,
        accounts_serviced_calls_made INTEGER DEFAULT 0,
        accounts_serviced_referrals INTEGER DEFAULT 0,
        accounts_serviced_inbound INTEGER DEFAULT 0,
        
        tally_counts TEXT DEFAULT '{}',
        
        outreach_referrals INTEGER DEFAULT 0,
        outreach_inbound INTEGER DEFAULT 0,
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id),
        UNIQUE(user_id, date)
      );
    `);

    // Create leads table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        lead_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        address TEXT,
        status TEXT NOT NULL,
        highest_stage_reached TEXT,
        cancellation_status TEXT,
        selected_pipeline_stages TEXT DEFAULT '[]',
        value REAL DEFAULT 0,
        revenue TEXT DEFAULT '{}',
        notes TEXT,
        source TEXT NOT NULL,
        appointment_date TEXT,
        appointment_time TEXT,
        appointment_notes TEXT,
        appointment_status TEXT,
        cancelled_reason TEXT,
        lost_reason TEXT,
        is_cancelled INTEGER DEFAULT 0,
        appointment_created_from TEXT,
        appointment_set_on_date TEXT,
        date_set TEXT,
        date_set_for TEXT,
        follow_up_reminders TEXT DEFAULT '[]',
        next_follow_up TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create expenses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        expense_id TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        receipt TEXT,
        is_deductible INTEGER DEFAULT 1,
        mileage REAL,
        start_location TEXT,
        end_location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create mileage trips table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS mileage_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        trip_id TEXT UNIQUE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        start_location TEXT NOT NULL,
        end_location TEXT,
        distance REAL NOT NULL,
        duration REAL,
        trip_type TEXT NOT NULL DEFAULT 'business',
        irs_rate REAL NOT NULL,
        value REAL NOT NULL,
        purpose TEXT NOT NULL,
        client_tag TEXT,
        job_tag TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        route TEXT DEFAULT '[]',
        is_auto_tracked INTEGER DEFAULT 0,
        map_preview TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create team_members table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        member_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT,
        is_active INTEGER DEFAULT 1,
        joined_at TEXT NOT NULL,
        performance TEXT DEFAULT '{}',
        permissions TEXT DEFAULT '{}',
        invite_status TEXT,
        invited_at TEXT,
        invited_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create plaid_accounts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS plaid_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        account_id TEXT UNIQUE NOT NULL,
        access_token TEXT,
        item_id TEXT NOT NULL,
        institution_name TEXT NOT NULL,
        institution_id TEXT NOT NULL,
        accounts TEXT NOT NULL,
        last_sync TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create plaid_transactions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS plaid_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        transaction_id TEXT UNIQUE NOT NULL,
        account_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        merchant_name TEXT,
        account_name TEXT NOT NULL,
        classification TEXT NOT NULL,
        client_tag TEXT,
        job_tag TEXT,
        is_business_expense INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0,
        source TEXT DEFAULT 'plaid',
        is_reviewed INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        original_transaction TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create user_settings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        app_settings TEXT DEFAULT '{}',
        lead_filter_settings TEXT DEFAULT '{}',
        input_settings TEXT DEFAULT '{}',
        kpi_visibility TEXT DEFAULT '{}',
        visibility_settings TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

    // Create follow_up_reminders table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS follow_up_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        reminder_id TEXT UNIQUE NOT NULL,
        lead_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        notification_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);

  }

  private async runMigrations() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create migrations table if it doesn't exist
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER UNIQUE NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      // Check current version with timeout
      const result = await Promise.race([
        this.db.getFirstAsync<{ version: number }>(`SELECT MAX(version) as version FROM migrations;`),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 5000))
      ]);
      
      const currentVersion = (result as { version: number } | null)?.version ?? 0;
      console.log('Current database version:', currentVersion);

      // Run migrations with individual error handling
      if (currentVersion < 1) {
        try {
          await this.runMigration1();
        } catch (error) {
          console.warn('Migration 1 failed:', error);
        }
      }
      if (currentVersion < 2) {
        try {
          await this.runMigration2();
        } catch (error) {
          console.warn('Migration 2 failed:', error);
        }
      }
      if (currentVersion < 3) {
        try {
          await this.runMigration3();
        } catch (error) {
          console.warn('Migration 3 failed:', error);
        }
      }
      if (currentVersion < 4) {
        try {
          await this.runMigration4();
        } catch (error) {
          console.warn('Migration 4 failed:', error);
        }
      }
      if (currentVersion < 5) {
        try {
          await this.runMigration5();
        } catch (error) {
          console.warn('Migration 5 failed:', error);
        }
      }
    } catch (error) {
      console.error('Migration process failed:', error);
      // Don't throw - continue with basic functionality
    }
  }

  private async runMigration1() {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('Running migration 1: Adding tally_counts column');
    try {
      await this.db.execAsync(`
        ALTER TABLE daily_inputs ADD COLUMN tally_counts TEXT DEFAULT '{}';
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('tally_counts column already exists or error:', error);
    }

    await this.db.runAsync(`
      INSERT OR REPLACE INTO migrations (version, applied_at) VALUES (1, ?);
    `, [new Date().toISOString()]);
  }

  private async runMigration2() {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('Running migration 2: Ensuring all sub-input columns exist');
    
    // Ensure all required columns exist for existing databases
    const requiredColumns = [
      'appointments_set_referrals INTEGER DEFAULT 0',
      'appointments_set_inbound INTEGER DEFAULT 0',
      'appointments_held_referrals INTEGER DEFAULT 0',
      'appointments_held_inbound INTEGER DEFAULT 0',
      'deals_closed_referrals INTEGER DEFAULT 0',
      'deals_closed_inbound INTEGER DEFAULT 0',
      'accounts_serviced_referrals INTEGER DEFAULT 0',
      'accounts_serviced_inbound INTEGER DEFAULT 0'
    ];

    for (const column of requiredColumns) {
      try {
        await this.db.execAsync(`ALTER TABLE daily_inputs ADD COLUMN ${column};`);
        console.log(`Added column: ${column}`);
      } catch (error) {
        // Column might already exist, ignore error
        console.log(`Column ${column} already exists or error:`, error);
      }
    }

    await this.db.runAsync(`
      INSERT OR REPLACE INTO migrations (version, applied_at) VALUES (2, ?);
    `, [new Date().toISOString()]);
  }

  private async runMigration3() {
    if (!this.db) throw new Error('Database not initialized');
    console.log('Running migration 3: Ensuring all outreach columns exist');
    const outreachColumns = [
      'outreach_referrals INTEGER DEFAULT 0',
      'outreach_inbound INTEGER DEFAULT 0',
      'outreach_door_knocks INTEGER DEFAULT 0',
      'outreach_tags_put INTEGER DEFAULT 0',
      'outreach_calls_made INTEGER DEFAULT 0',
      'appointments_set_door_knocks INTEGER DEFAULT 0',
      'appointments_set_tags_put INTEGER DEFAULT 0',
      'appointments_set_calls_made INTEGER DEFAULT 0',
      'appointments_set_referrals INTEGER DEFAULT 0',
      'appointments_set_inbound INTEGER DEFAULT 0',
      'appointments_held_door_knocks INTEGER DEFAULT 0',
      'appointments_held_tags_put INTEGER DEFAULT 0',
      'appointments_held_calls_made INTEGER DEFAULT 0',
      'appointments_held_referrals INTEGER DEFAULT 0',
      'appointments_held_inbound INTEGER DEFAULT 0',
      'deals_closed_door_knocks INTEGER DEFAULT 0',
      'deals_closed_tags_put INTEGER DEFAULT 0',
      'deals_closed_calls_made INTEGER DEFAULT 0',
      'deals_closed_referrals INTEGER DEFAULT 0',
      'deals_closed_inbound INTEGER DEFAULT 0',
      'accounts_serviced_door_knocks INTEGER DEFAULT 0',
      'accounts_serviced_tags_put INTEGER DEFAULT 0',
      'accounts_serviced_calls_made INTEGER DEFAULT 0',
      'accounts_serviced_referrals INTEGER DEFAULT 0',
      'accounts_serviced_inbound INTEGER DEFAULT 0',
      'tally_counts TEXT DEFAULT "{}"'
    ];
    for (const column of outreachColumns) {
      try {
        await this.db.execAsync(`ALTER TABLE daily_inputs ADD COLUMN ${column};`);
        console.log(`Added column: ${column}`);
      } catch (error) {
        // Column might already exist, ignore error
        console.log(`Column ${column} already exists or error:`, error);
      }
    }
    await this.db.runAsync(`
      INSERT OR REPLACE INTO migrations (version, applied_at) VALUES (3, ?);
    `, [new Date().toISOString()]);
  }

  private async runMigration4() {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('Running migration 4: Adding visibility_settings column to user_settings');
    try {
      await this.db.execAsync(`
        ALTER TABLE user_settings ADD COLUMN visibility_settings TEXT DEFAULT '{}';
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('visibility_settings column already exists or error:', error);
    }

    await this.db.runAsync(`
      INSERT OR REPLACE INTO migrations (version, applied_at) VALUES (4, ?);
    `, [new Date().toISOString()]);
  }

  private async runMigration5() {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('Running migration 5: Ensuring Plaid tables have correct schema');
    
    // Drop and recreate plaid_accounts table to ensure correct schema
    try {
      await this.db.execAsync(`DROP TABLE IF EXISTS plaid_accounts;`);
      console.log('Dropped existing plaid_accounts table');
    } catch (error) {
      console.log('Error dropping plaid_accounts table:', error);
    }

    // Drop and recreate plaid_transactions table to ensure correct schema
    try {
      await this.db.execAsync(`DROP TABLE IF EXISTS plaid_transactions;`);
      console.log('Dropped existing plaid_transactions table');
    } catch (error) {
      console.log('Error dropping plaid_transactions table:', error);
    }

    // Recreate plaid_accounts table with correct schema
    await this.db.execAsync(`
      CREATE TABLE plaid_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        account_id TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        item_id TEXT NOT NULL,
        institution_name TEXT NOT NULL,
        institution_id TEXT NOT NULL,
        accounts TEXT NOT NULL,
        last_sync TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);
    console.log('Recreated plaid_accounts table with correct schema');

    // Recreate plaid_transactions table with correct schema
    await this.db.execAsync(`
      CREATE TABLE plaid_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        transaction_id TEXT UNIQUE NOT NULL,
        account_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        merchant_name TEXT,
        account_name TEXT NOT NULL,
        classification TEXT NOT NULL,
        client_tag TEXT,
        job_tag TEXT,
        is_business_expense INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0,
        source TEXT DEFAULT 'plaid',
        is_reviewed INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        original_transaction TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );
    `);
    console.log('Recreated plaid_transactions table with correct schema');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO migrations (version, applied_at) VALUES (5, ?);
    `, [new Date().toISOString()]);
  }

  async saveUser(user: {
    userId: string;
    email: string;
    name: string;
    photoURL?: string;
    provider: string;
    createdAt: string;
    lastLoginAt: string;
  }) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO users 
       (user_id, email, name, photo_url, provider, created_at, last_login_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.userId, user.email, user.name, user.photoURL || null, user.provider, user.createdAt, user.lastLoginAt]
    );
  }

  async saveDailyInput(userId: string, input: Omit<DailyInput, 'id'>): Promise<string> {
    try {
      if (!this.db) {
        await this.initialize();
      }
      if (!this.db) throw new Error('Database initialization failed');

      const syncId = generateUniqueId(`${userId}_${input.date}_`);
      const now = new Date().toISOString();

      // Dynamically fetch columns from the table schema
      const columnsResult = await this.db.getAllAsync(`PRAGMA table_info(daily_inputs);`);
      const allColumns = columnsResult.map((col: any) => col.name).filter((name: string) => name !== 'id'); // skip autoincrement id
      // List of columns and values to insert (must match order)
      const columns = [
        'user_id', 'sync_id', 'date', 'doors_knocked', 'appointments', 'appointment_holds',
        'closed_deals', 'accounts_serviced', 'hours_worked', 'notes',
        'outreach_door_knocks', 'outreach_tags_put', 'outreach_calls_made',
        'appointments_set_door_knocks', 'appointments_set_tags_put', 'appointments_set_calls_made',
        'appointments_set_referrals', 'appointments_set_inbound',
        'appointments_held_door_knocks', 'appointments_held_tags_put', 'appointments_held_calls_made',
        'appointments_held_referrals', 'appointments_held_inbound',
        'deals_closed_door_knocks', 'deals_closed_tags_put', 'deals_closed_calls_made',
        'deals_closed_referrals', 'deals_closed_inbound',
        'accounts_serviced_door_knocks', 'accounts_serviced_tags_put', 'accounts_serviced_calls_made',
        'accounts_serviced_referrals', 'accounts_serviced_inbound',
        'tally_counts', 'outreach_referrals', 'outreach_inbound',
        'created_at', 'updated_at'
      ];
      const values = [
        userId, syncId, input.date, input.doorsKnocked, input.appointments, input.appointmentHolds,
        input.closedDeals, input.accountsServiced, input.hoursWorked, input.notes || '',
        input.outreachDoorKnocks ?? 0, input.outreachTagsPut ?? 0, input.outreachCallsMade ?? 0,
        input.appointmentsSetDoorKnocks ?? 0, input.appointmentsSetTagsPut ?? 0, input.appointmentsSetCallsMade ?? 0,
        input.appointmentsSetReferrals ?? 0, input.appointmentsSetInbound ?? 0,
        input.appointmentsHeldDoorKnocks ?? 0, input.appointmentsHeldTagsPut ?? 0, input.appointmentsHeldCallsMade ?? 0,
        input.appointmentsHeldReferrals ?? 0, input.appointmentsHeldInbound ?? 0,
        input.dealsClosedDoorKnocks ?? 0, input.dealsClosedTagsPut ?? 0, input.dealsClosedCallsMade ?? 0,
        input.dealsClosedReferrals ?? 0, input.dealsClosedInbound ?? 0,
        input.accountsServicedDoorKnocks ?? 0, input.accountsServicedTagsPut ?? 0, input.accountsServicedCallsMade ?? 0,
        input.accountsServicedReferrals ?? 0, input.accountsServicedInbound ?? 0,
        JSON.stringify(input.tallyCounts || {}), input.outreachReferrals ?? 0, input.outreachInbound ?? 0,
        input.createdAt || now, now
      ];
      // Log for debugging
      console.log('[saveDailyInput] daily_inputs columns:', columns);
      console.log('[saveDailyInput] values array length:', values.length);
      console.log('[saveDailyInput] actual table columns:', allColumns);
      // Check for mismatch
      if (columns.length !== values.length) {
        throw new Error(`[saveDailyInput] Column count (${columns.length}) does not match values count (${values.length})`);
      }
      if (columns.length !== allColumns.length) {
        throw new Error(`[saveDailyInput] Column count (${columns.length}) does not match actual table columns (${allColumns.length}).\nColumns: ${columns.join(', ')}\nActual: ${allColumns.join(', ')}`);
      }
      await this.db.runAsync(
        `INSERT OR REPLACE INTO daily_inputs (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values
      );
      return syncId;
    } catch (error) {
      console.error('❌ Failed to save daily input:', error);
      throw error;
    }
  }

  async updateDailyInput(userId: string, syncId: string, updates: Partial<Omit<DailyInput, 'id'>>) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    // Map of JS field names to database column names
    const fieldMapping: { [key: string]: string } = {
      'date': 'date',
      'doorsKnocked': 'doors_knocked',
      'appointments': 'appointments',
      'appointmentHolds': 'appointment_holds',
      'closedDeals': 'closed_deals',
      'accountsServiced': 'accounts_serviced',
      'hoursWorked': 'hours_worked',
      'notes': 'notes',
      'outreachDoorKnocks': 'outreach_door_knocks',
      'outreachTagsPut': 'outreach_tags_put',
      'outreachCallsMade': 'outreach_calls_made',
      'appointmentsSetDoorKnocks': 'appointments_set_door_knocks',
      'appointmentsSetTagsPut': 'appointments_set_tags_put',
      'appointmentsSetCallsMade': 'appointments_set_calls_made',
      'appointmentsSetReferrals': 'appointments_set_referrals',
      'appointmentsSetInbound': 'appointments_set_inbound',
      'appointmentsHeldDoorKnocks': 'appointments_held_door_knocks',
      'appointmentsHeldTagsPut': 'appointments_held_tags_put',
      'appointmentsHeldCallsMade': 'appointments_held_calls_made',
      'appointmentsHeldReferrals': 'appointments_held_referrals',
      'appointmentsHeldInbound': 'appointments_held_inbound',
      'dealsClosedDoorKnocks': 'deals_closed_door_knocks',
      'dealsClosedTagsPut': 'deals_closed_tags_put',
      'dealsClosedCallsMade': 'deals_closed_calls_made',
      'dealsClosedReferrals': 'deals_closed_referrals',
      'dealsClosedInbound': 'deals_closed_inbound',
      'accountsServicedDoorKnocks': 'accounts_serviced_door_knocks',
      'accountsServicedTagsPut': 'accounts_serviced_tags_put',
      'accountsServicedReferrals': 'accounts_serviced_referrals',
      'accountsServicedInbound': 'accounts_serviced_inbound',
      'tallyCounts': 'tally_counts',
      'outreachReferrals': 'outreach_referrals',
      'outreachInbound': 'outreach_inbound'
    };

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMapping[key];
      if (dbField) {
        fields.push(`${dbField} = ?`);
        // Handle JSON fields
        if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(now);

    // Add WHERE clause parameters
    values.push(userId, syncId);

    await this.db.runAsync(
      `UPDATE daily_inputs SET ${fields.join(', ')} WHERE user_id = ? AND sync_id = ?`,
      values
    );
  }

  async getDailyInputs(userId: string, startDate?: string, endDate?: string): Promise<DailyInput[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    // Ensure the daily_inputs table exists
    try {
      await this.db.execAsync(`SELECT 1 FROM daily_inputs LIMIT 1`);
    } catch (error) {
      console.log('Table does not exist, recreating...');
      await this.createTables();
    }

    let query = `
      SELECT * FROM daily_inputs 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (startDate && endDate) {
      query += ` AND date >= ? AND date <= ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY date DESC`;

    const result = await this.db!.getAllAsync(query, params);
    
    return result.map((row: any) => ({
      id: row.sync_id,
      date: row.date,
      doorsKnocked: row.doors_knocked,
      appointments: row.appointments,
      appointmentHolds: row.appointment_holds,
      closedDeals: row.closed_deals,
      accountsServiced: row.accounts_serviced,
      hoursWorked: row.hours_worked,
      notes: row.notes,
      outreachDoorKnocks: row.outreach_door_knocks,
      outreachTagsPut: row.outreach_tags_put,
      outreachCallsMade: row.outreach_calls_made,
      outreachReferrals: row.outreach_referrals,
      outreachInbound: row.outreach_inbound,
      appointmentsSetDoorKnocks: row.appointments_set_door_knocks,
      appointmentsSetTagsPut: row.appointments_set_tags_put,
      appointmentsSetCallsMade: row.appointments_set_calls_made,
      appointmentsSetReferrals: row.appointments_set_referrals,
      appointmentsSetInbound: row.appointments_set_inbound,
      appointmentsHeldDoorKnocks: row.appointments_held_door_knocks,
      appointmentsHeldTagsPut: row.appointments_held_tags_put,
      appointmentsHeldCallsMade: row.appointments_held_calls_made,
      appointmentsHeldReferrals: row.appointments_held_referrals,
      appointmentsHeldInbound: row.appointments_held_inbound,
      dealsClosedDoorKnocks: row.deals_closed_door_knocks,
      dealsClosedTagsPut: row.deals_closed_tags_put,
      dealsClosedCallsMade: row.deals_closed_calls_made,
      dealsClosedReferrals: row.deals_closed_referrals,
      dealsClosedInbound: row.deals_closed_inbound,
      accountsServicedDoorKnocks: row.accounts_serviced_door_knocks,
      accountsServicedTagsPut: row.accounts_serviced_tags_put,
      accountsServicedCallsMade: row.accounts_serviced_calls_made,
      accountsServicedReferrals: row.accounts_serviced_referrals,
      accountsServicedInbound: row.accounts_serviced_inbound,
      tallyCounts: row.tally_counts ? JSON.parse(row.tally_counts) : {},
      createdAt: row.created_at,
    }));
  }

  async getTodayInput(userId: string): Promise<DailyInput | null> {
    const today = new Date().toISOString().split('T')[0];
    const inputs = await this.getDailyInputs(userId, today, today);
    return inputs.length > 0 ? inputs[0] : null;
  }

  async deleteDailyInput(userId: string, syncId: string) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM daily_inputs WHERE user_id = ? AND sync_id = ?',
      [userId, syncId]
    );
  }

  async clearUserData(userId: string) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    // Clear all user data from all tables
    await this.db.runAsync('DELETE FROM daily_inputs WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM leads WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM expenses WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM mileage_trips WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM team_members WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM plaid_accounts WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM plaid_transactions WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM user_settings WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM follow_up_reminders WHERE user_id = ?', [userId]);
    await this.db.runAsync('DELETE FROM users WHERE user_id = ?', [userId]);
  }

  // ===============================
  // LEADS MANAGEMENT
  // ===============================
  
  async saveLead(userId: string, lead: any, p0?: boolean): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    console.log('💾 [Database] Saving lead with dates:', {
      dateSet: lead.dateSet,
      dateSetFor: lead.dateSetFor,
      leadId: lead.id,
      name: lead.name
    });
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO leads (
        user_id, lead_id, name, email, phone, company, address, status,
        highest_stage_reached, cancellation_status, selected_pipeline_stages,
        value, revenue, notes, source, appointment_date, appointment_time,
        appointment_notes, appointment_status, cancelled_reason, lost_reason,
        is_cancelled, appointment_created_from, appointment_set_on_date,
        date_set, date_set_for, follow_up_reminders, next_follow_up,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, lead.id, lead.name, lead.email || '', lead.phone || '', 
        lead.company || '', lead.address || '', lead.status,
        lead.highestStageReached || '', lead.cancellationStatus || '',
        JSON.stringify(lead.selectedPipelineStages || []),
        lead.value ?? 0, JSON.stringify(lead.revenue || {}),
        lead.notes || '', lead.source, lead.appointmentDate || '',
        lead.appointmentTime || '', lead.appointmentNotes || '',
        lead.appointmentStatus || '', lead.cancelledReason || '',
        lead.lostReason || '', lead.isCancelled ? 1 : 0,
        lead.appointmentCreatedFrom || '', lead.appointmentSetOnDate || '',
        lead.dateSet || '', lead.dateSetFor || '',
        JSON.stringify(lead.followUpReminders || []), lead.nextFollowUp || '',
        lead.createdAt || now, lead.updatedAt || now
      ]
    );
    
    console.log('✅ [Database] Lead saved successfully');
  }

  async getLeads(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM leads WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    const leads = result.map((row: any) => ({
      id: row.lead_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      address: row.address,
      status: row.status,
      highestStageReached: row.highest_stage_reached,
      cancellationStatus: row.cancellation_status,
      selectedPipelineStages: JSON.parse(row.selected_pipeline_stages || '[]'),
      value: row.value,
      revenue: JSON.parse(row.revenue || '{}'),
      notes: row.notes,
      source: row.source,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      appointmentNotes: row.appointment_notes,
      appointmentStatus: row.appointment_status,
      cancelledReason: row.cancelled_reason,
      lostReason: row.lost_reason,
      isCancelled: row.is_cancelled === 1,
      appointmentCreatedFrom: row.appointment_created_from,
      appointmentSetOnDate: row.appointment_set_on_date,
      dateSet: row.date_set,
      dateSetFor: row.date_set_for,
      followUpReminders: JSON.parse(row.follow_up_reminders || '[]'),
      nextFollowUp: row.next_follow_up,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    // Log any leads with date information
    leads.forEach(lead => {
      if (lead.dateSet || lead.dateSetFor) {
        console.log('📅 [Database] Lead with dates:', {
          name: lead.name,
          dateSet: lead.dateSet,
          dateSetFor: lead.dateSetFor
        });
      }
    });
    
    return leads;
  }

  async updateLead(userId: string, leadId: string, updates: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    console.log('📝 [DatabaseService] updateLead called with updates:', updates);
    console.log('📅 [DatabaseService] Date Set:', updates.dateSet);
    console.log('📅 [DatabaseService] Date Set For:', updates.dateSetFor);

    const now = new Date().toISOString();
    const fields = [];
    const values: (string | number | null)[] = [];

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt') continue;
      let dbValue: string | number | null;
      if (key === 'selectedPipelineStages' || key === 'revenue' || key === 'followUpReminders') {
        dbValue = JSON.stringify(value);
      } else if (key === 'isCancelled') {
        dbValue = value ? 1 : 0;
      } else if (typeof value === 'string' || typeof value === 'number' || value === null) {
        dbValue = value as string | number | null;
      } else {
        dbValue = String(value);
      }
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbField} = ?`);
      values.push(dbValue);
      
      if (key === 'dateSet' || key === 'dateSetFor') {
        console.log(`📅 [DatabaseService] Field ${key} → ${dbField} = ${dbValue}`);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(now);

    values.push(userId, leadId);

    console.log('📝 [DatabaseService] SQL Query:', `UPDATE leads SET ${fields.join(', ')} WHERE user_id = ? AND lead_id = ?`);
    console.log('📝 [DatabaseService] Values:', values);

    await this.db.runAsync(
      `UPDATE leads SET ${fields.join(', ')} WHERE user_id = ? AND lead_id = ?`,
      values
    );
    
    console.log('✅ [DatabaseService] Lead updated successfully in local database');
  }

  async deleteLead(userId: string, leadId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM leads WHERE user_id = ? AND lead_id = ?',
      [userId, leadId]
    );
    
    // Also delete associated follow-up reminders
    await this.db.runAsync(
      'DELETE FROM follow_up_reminders WHERE user_id = ? AND lead_id = ?',
      [userId, leadId]
    );
  }

  // ===============================
  // EXPENSES MANAGEMENT
  // ===============================
  
  async saveExpense(userId: string, expense: {
    id: string;
    notes?: string;
    vendor_name?: string;
    amount: number;
    category: string;
    timestamp?: string;
    date?: string;
    receipt?: string;
    is_business?: boolean;
    mileage?: number;
    startLocation?: string;
    endLocation?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }, p0?: boolean): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO expenses (
        user_id, expense_id, description, amount, category, date, receipt,
        is_deductible, mileage, start_location, end_location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, expense.id, expense.notes || expense.vendor_name || '', expense.amount, expense.category,
        expense.timestamp || expense.date, expense.receipt || '', expense.is_business ? 1 : 0,
        expense.mileage || null, expense.startLocation || '', expense.endLocation || '',
        expense.createdAt || expense.created_at || now, expense.updatedAt || expense.updated_at || now
      ]
    );
  }

  async getExpenses(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );

    return result.map((row: any) => ({
      id: row.expense_id,
      user_id: row.user_id,
      amount: row.amount,
      category: row.category,
      vendor_name: row.description,
      is_business: row.is_deductible === 1,
      timestamp: row.date,
      notes: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM expenses WHERE user_id = ? AND expense_id = ?',
      [userId, expenseId]
    );
  }

  // ===============================
  // MILEAGE TRIPS MANAGEMENT
  // ===============================
  
  async saveMileageTrip(userId: string, trip: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO mileage_trips (
        user_id, trip_id, start_time, end_time, start_location, end_location,
        distance, duration, trip_type, irs_rate, value, purpose, client_tag, job_tag,
        status, route, is_auto_tracked, map_preview, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, trip.id, trip.startTime, trip.endTime || '',
        JSON.stringify(trip.startLocation), JSON.stringify(trip.endLocation || {}),
        trip.distance, trip.duration || null, trip.tripType || 'business', trip.irsRate,
        trip.value, trip.purpose, trip.clientTag || '', trip.jobTag || '', trip.status,
        JSON.stringify(trip.route || []), trip.isAutoTracked ? 1 : 0, JSON.stringify(trip.mapPreview || {}),
        trip.createdAt || now, trip.updatedAt || now
      ]
    );
  }

  async getMileageTrips(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM mileage_trips WHERE user_id = ? ORDER BY start_time DESC',
      [userId]
    );

    return result.map((row: any) => ({
      id: row.trip_id,
      startTime: row.start_time,
      endTime: row.end_time,
      startLocation: JSON.parse(row.start_location || '{}'),
      endLocation: JSON.parse(row.end_location || '{}'),
      distance: row.distance,
      duration: row.duration,
      tripType: row.trip_type,
      irsRate: row.irs_rate,
      value: row.value,
      purpose: row.purpose,
      clientTag: row.client_tag,
      jobTag: row.job_tag,
      status: row.status,
      route: JSON.parse(row.route || '[]'),
      isAutoTracked: row.is_auto_tracked === 1,
      mapPreview: JSON.parse(row.map_preview || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteMileageTrip(userId: string, tripId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM mileage_trips WHERE user_id = ? AND trip_id = ?',
      [userId, tripId]
    );
  }

  async updateMileageTrip(userId: string, tripId: string, updates: Partial<any>): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    const updateFields = [];
    const updateValues = [];

    // Build dynamic update query based on provided fields
    if (updates.tripType !== undefined) {
      updateFields.push('trip_type = ?');
      updateValues.push(updates.tripType);
    }
    if (updates.irsRate !== undefined) {
      updateFields.push('irs_rate = ?');
      updateValues.push(updates.irsRate);
    }
    if (updates.value !== undefined) {
      updateFields.push('value = ?');
      updateValues.push(updates.value);
    }
    if (updates.clientTag !== undefined) {
      updateFields.push('client_tag = ?');
      updateValues.push(updates.clientTag);
    }
    if (updates.jobTag !== undefined) {
      updateFields.push('job_tag = ?');
      updateValues.push(updates.jobTag);
    }
    if (updates.purpose !== undefined) {
      updateFields.push('purpose = ?');
      updateValues.push(updates.purpose);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.distance !== undefined) {
      updateFields.push('distance = ?');
      updateValues.push(updates.distance);
    }
    if (updates.startTime !== undefined) {
      updateFields.push('start_time = ?');
      updateValues.push(updates.startTime);
    }
    if (updates.endTime !== undefined) {
      updateFields.push('end_time = ?');
      updateValues.push(updates.endTime);
    }
    if (updates.startLocation !== undefined) {
      updateFields.push('start_location = ?');
      updateValues.push(JSON.stringify(updates.startLocation));
    }
    if (updates.endLocation !== undefined) {
      updateFields.push('end_location = ?');
      updateValues.push(JSON.stringify(updates.endLocation));
    }
    if (updates.route !== undefined) {
      updateFields.push('route = ?');
      updateValues.push(JSON.stringify(updates.route));
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    updateValues.push(now);

    if (updateFields.length === 0) return; // No fields to update

    updateValues.push(userId, tripId);

    const query = `UPDATE mileage_trips SET ${updateFields.join(', ')} WHERE user_id = ? AND trip_id = ?`;
    await this.db.runAsync(query, updateValues);
  }

  // ===============================
  // USER SETTINGS MANAGEMENT
  // ===============================
  
  async saveUserSettings(userId: string, settings: {
    appSettings?: any;
    leadFilterSettings?: any;
    inputSettings?: any;
    kpiVisibility?: any;
    visibilitySettings?: any;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    // Check if settings exist
    const existingSettings = await this.db.getFirstAsync(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (existingSettings) {
      // Update existing settings
      const fields = [];
      const values = [];

      if (settings.appSettings !== undefined) {
        fields.push('app_settings = ?');
        values.push(JSON.stringify(settings.appSettings));
      }
      if (settings.leadFilterSettings !== undefined) {
        fields.push('lead_filter_settings = ?');
        values.push(JSON.stringify(settings.leadFilterSettings));
      }
      if (settings.inputSettings !== undefined) {
        fields.push('input_settings = ?');
        values.push(JSON.stringify(settings.inputSettings));
      }
      if (settings.kpiVisibility !== undefined) {
        fields.push('kpi_visibility = ?');
        values.push(JSON.stringify(settings.kpiVisibility));
      }
      if (settings.visibilitySettings !== undefined) {
        fields.push('visibility_settings = ?');
        values.push(JSON.stringify(settings.visibilitySettings));
      }

      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(now);
        values.push(userId);

        await this.db.runAsync(
          `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`,
          values
        );
      }
    } else {
      // Create new settings
      await this.db.runAsync(
        `INSERT INTO user_settings (
          user_id, app_settings, lead_filter_settings, input_settings, 
          kpi_visibility, visibility_settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          JSON.stringify(settings.appSettings || {}),
          JSON.stringify(settings.leadFilterSettings || {}),
          JSON.stringify(settings.inputSettings || {}),
          JSON.stringify(settings.kpiVisibility || {}),
          JSON.stringify(settings.visibilitySettings || {}),
          now, now
        ]
      );
    }
  }

  async getUserSettings(userId: string): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    ) as any;

    if (!result) {
      return {
        appSettings: {},
        leadFilterSettings: {},
        inputSettings: {},
        kpiVisibility: {},
        visibilitySettings: {}
      };
    }

    return {
      appSettings: JSON.parse(result.app_settings || '{}'),
      leadFilterSettings: JSON.parse(result.lead_filter_settings || '{}'),
      inputSettings: JSON.parse(result.input_settings || '{}'),
      kpiVisibility: JSON.parse(result.kpi_visibility || '{}'),
      visibilitySettings: JSON.parse(result.visibility_settings || '{}')
    };
  }

  // ===============================
  // TEAM MEMBERS MANAGEMENT
  // ===============================
  
  async saveTeamMember(userId: string, member: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO team_members (
        user_id, member_id, name, email, role, avatar, is_active, joined_at,
        performance, permissions, invite_status, invited_at, invited_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, member.id, member.name, member.email, member.role,
        member.avatar || '', member.isActive ? 1 : 0, member.joinedAt,
        JSON.stringify(member.performance || {}), JSON.stringify(member.permissions || {}),
        member.inviteStatus || '', member.invitedAt || '', member.invitedBy || '',
        member.createdAt || now, member.updatedAt || now
      ]
    );
  }

  async getTeamMembers(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM team_members WHERE user_id = ? ORDER BY joined_at DESC',
      [userId]
    );

    return result.map((row: any) => ({
      id: row.member_id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      isActive: row.is_active === 1,
      joinedAt: row.joined_at,
      performance: JSON.parse(row.performance || '{}'),
      permissions: JSON.parse(row.permissions || '{}'),
      inviteStatus: row.invite_status,
      invitedAt: row.invited_at,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteTeamMember(userId: string, memberId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM team_members WHERE user_id = ? AND member_id = ?',
      [userId, memberId]
    );
  }

  // ===============================
  // PLAID TRANSACTIONS MANAGEMENT
  // ===============================
  
  async savePlaidAccount(userId: string, account: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO plaid_accounts (
        user_id, account_id, access_token, item_id, institution_name, institution_id,
        accounts, last_sync, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        account.id,
        'server_managed',
        account.itemId,
        account.institutionName,
        account.institutionId,
        JSON.stringify(account.accounts),
        account.lastSync,
        account.isActive ? 1 : 0,
        now,
        now
      ]
    );
  }

  async getPlaidAccounts(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM plaid_accounts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return result.map((row: any) => ({
      id: row.account_id,
      accessToken: 'server_managed',
      itemId: row.item_id,
      institutionName: row.institution_name,
      institutionId: row.institution_id,
      accounts: JSON.parse(row.accounts || '[]'),
      lastSync: row.last_sync,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async savePlaidTransaction(userId: string, transaction: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO plaid_transactions (
        user_id, transaction_id, account_id, amount, date, description, category,
        merchant_name, account_name, classification, client_tag, job_tag,
        is_business_expense, confidence, source, is_reviewed, is_approved, pending,
        original_transaction, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, transaction.id, transaction.accountId, transaction.amount,
        transaction.date, transaction.description, transaction.category,
        transaction.merchantName || '', transaction.accountName, transaction.classification,
        transaction.clientTag || '', transaction.jobTag || '', transaction.isBusinessExpense ? 1 : 0,
        transaction.confidence, transaction.source, transaction.isReviewed ? 1 : 0,
        transaction.isApproved ? 1 : 0, transaction.pending ? 1 : 0, JSON.stringify(transaction.originalTransaction),
        transaction.createdAt || now, transaction.updatedAt || now
      ]
    );
  }

  async getPlaidTransactions(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const result = await this.db.getAllAsync(
      'SELECT * FROM plaid_transactions WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );

    return result.map((row: any) => ({
      id: row.transaction_id,
      accountId: row.account_id,
      amount: row.amount,
      date: row.date,
      description: row.description,
      category: row.category,
      merchantName: row.merchant_name,
      accountName: row.account_name,
      classification: row.classification,
      clientTag: row.client_tag,
      jobTag: row.job_tag,
      isBusinessExpense: row.is_business_expense === 1,
      confidence: row.confidence,
      source: row.source,
      isReviewed: row.is_reviewed === 1,
      isApproved: row.is_approved === 1,
      pending: row.pending === 1,
      originalTransaction: JSON.parse(row.original_transaction || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ===============================
  // FOLLOW-UP REMINDERS MANAGEMENT
  // ===============================
  
  async saveFollowUpReminder(userId: string, reminder: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    const now = new Date().toISOString();
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO follow_up_reminders (
        user_id, reminder_id, lead_id, date, time, type, notes, completed,
        completed_at, notification_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, reminder.id, reminder.leadId || '', reminder.date, reminder.time,
        reminder.type, reminder.notes || '', reminder.completed ? 1 : 0,
        reminder.completedAt || '', reminder.notificationId || '',
        reminder.createdAt || now, reminder.updatedAt || now
      ]
    );
  }

  async getFollowUpReminders(userId: string, leadId?: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    let query = 'SELECT * FROM follow_up_reminders WHERE user_id = ?';
    const params = [userId];

    if (leadId) {
      query += ' AND lead_id = ?';
      params.push(leadId);
    }

    query += ' ORDER BY date ASC, time ASC';

    const result = await this.db.getAllAsync(query, params);

    return result.map((row: any) => ({
      id: row.reminder_id,
      leadId: row.lead_id,
      date: row.date,
      time: row.time,
      type: row.type,
      notes: row.notes,
      completed: row.completed === 1,
      completedAt: row.completed_at,
      notificationId: row.notification_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteFollowUpReminder(userId: string, reminderId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    await this.db.runAsync(
      'DELETE FROM follow_up_reminders WHERE user_id = ? AND reminder_id = ?',
      [userId, reminderId]
    );
  }

  // Outreach Tally Functions
  async getOutreachTallies(userId: string, date: string) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT tally_counts FROM daily_inputs WHERE user_id = ? AND date = ?',
        [userId, date]
      ) as { tally_counts: string } | null;

      if (result?.tally_counts) {
        return JSON.parse(result.tally_counts);
      }
      
      // Return default structure if no data exists
      return {
        doorKnocks: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 },
        tagsPut: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 },
        callsMade: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 }
      };
    } catch (error) {
      console.error('Failed to get outreach tallies:', error);
      throw error;
    }
  }

  async updateOutreachTally(userId: string, date: string, outreachType: string, category: string, increment: number = 1) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Get current tally data
      const currentTallies = await this.getOutreachTallies(userId, date);
      
      // Update the specific tally
      if (!currentTallies[outreachType]) {
        currentTallies[outreachType] = { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 };
      }
      
      const newValue = (currentTallies[outreachType][category] ?? 0) + increment;
      // Ensure we don't go below 0
      currentTallies[outreachType][category] = Math.max(0, newValue);

      // Check if record exists
      const existingRecord = await this.db.getFirstAsync(
        'SELECT id FROM daily_inputs WHERE user_id = ? AND date = ?',
        [userId, date]
      );

      const tallyCountsJson = JSON.stringify(currentTallies);
      const now = new Date().toISOString();

      if (existingRecord) {
        // Update existing record
        await this.db.runAsync(
          'UPDATE daily_inputs SET tally_counts = ?, updated_at = ? WHERE user_id = ? AND date = ?',
          [tallyCountsJson, now, userId, date]
        );
      } else {
        // Create new record
        const syncId = generateUniqueId();
        await this.db.runAsync(
          `INSERT INTO daily_inputs (
            user_id, sync_id, date, tally_counts, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, syncId, date, tallyCountsJson, now, now]
        );
      }

      return currentTallies;
    } catch (error) {
      console.error('Failed to update outreach tally:', error);
      throw error;
    }
  }

  async trackStageChange(userId: string, leadId: string, leadName: string, fromStage: string, toStage: string, source: string, value: number) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const now = new Date().toISOString();
      
      // Create stage_changes table if it doesn't exist
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS stage_changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          lead_id TEXT NOT NULL,
          lead_name TEXT NOT NULL,
          from_stage TEXT NOT NULL,
          to_stage TEXT NOT NULL,
          source TEXT NOT NULL,
          value REAL NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // Insert stage change record
      await this.db.runAsync(
        `INSERT INTO stage_changes 
         (user_id, lead_id, lead_name, from_stage, to_stage, source, value, timestamp, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, leadId, leadName, fromStage, toStage, source, value, now, now]
      );

      console.log(`📊 Stage change tracked in database: ${leadName} - ${fromStage} → ${toStage}`);
    } catch (error) {
      console.error('Failed to track stage change:', error);
      throw error;
    }
  }

  async getStageChangeHistory(userId: string, leadId?: string) {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Database initialization failed');

    try {
      let query = `
        SELECT * FROM stage_changes 
        WHERE user_id = ?
      `;
      const params = [userId];

      if (leadId) {
        query += ` AND lead_id = ?`;
        params.push(leadId);
      }

      query += ` ORDER BY timestamp DESC`;

      const results = await this.db.getAllAsync(query, params);
      return results;
    } catch (error) {
      console.error('Failed to get stage change history:', error);
      return [];
    }
  }

  // ===== SUPABASE-FIRST METHODS =====
  // These methods prioritize Supabase as the primary storage with local SQLite as fallback for offline

  async getLeadsSupabaseFirst(userId: string) {
    try {
      console.log('🔄 Fetching leads from Supabase first...');
      const supabaseLeads = await supabaseService.getLeads(userId);
      
      // Cache in SQLite for offline access
      for (const lead of supabaseLeads) {
        try {
          await this.saveLead(userId, lead);
        } catch (error) {
          console.warn('Failed to cache lead locally:', error);
        }
      }
      
      console.log(`✅ Successfully fetched ${supabaseLeads.length} leads from Supabase`);
      return supabaseLeads;
    } catch (error) {
      console.warn('⚠️ Failed to fetch from Supabase, falling back to local SQLite:', error);
      return await this.getLeads(userId);
    }
  }

  async saveLeadSupabaseFirst(userId: string, lead: any, syncToLocal = true) {
    try {
      console.log('💾 Saving lead to Supabase first...');
      const savedLead = await supabaseService.createLead(userId, lead);
      
      // Cache in SQLite for offline access
      if (syncToLocal) {
        try {
          await this.saveLead(userId, savedLead);
        } catch (error) {
          console.warn('Failed to cache lead locally:', error);
        }
      }
      
      console.log('✅ Successfully saved lead to Supabase');
      return savedLead;
    } catch (error) {
      console.warn('⚠️ Failed to save to Supabase, saving locally:', error);
      return await this.saveLead(userId, lead);
    }
  }

  async updateLeadSupabaseFirst(userId: string, leadId: string, updates: any, syncToLocal = true) {
    try {
      console.log('📝 Updating lead in Supabase first...');
      const updatedLead = await supabaseService.updateLead(userId, leadId, updates);
      
      // Update in SQLite for offline access
      if (syncToLocal) {
        try {
          await this.updateLead(userId, leadId, updates);
        } catch (error) {
          console.warn('Failed to update lead locally:', error);
        }
      }
      
      console.log('✅ Successfully updated lead in Supabase');
      return updatedLead;
    } catch (error) {
      console.warn('⚠️ Failed to update in Supabase, updating locally:', error);
      return await this.updateLead(userId, leadId, updates);
    }
  }

  async deleteLeadSupabaseFirst(userId: string, leadId: string, syncToLocal = true) {
    try {
      console.log('🗑️ Deleting lead from Supabase first...');
      await supabaseService.deleteLead(userId, leadId);
      
      // Delete from SQLite as well
      if (syncToLocal) {
        try {
          await this.deleteLead(userId, leadId);
        } catch (error) {
          console.warn('Failed to delete lead locally:', error);
        }
      }
      
      console.log('✅ Successfully deleted lead from Supabase');
    } catch (error) {
      console.warn('⚠️ Failed to delete from Supabase, deleting locally:', error);
      await this.deleteLead(userId, leadId);
    }
  }

  async getExpensesSupabaseFirst(userId: string) {
    try {
      console.log('🔄 Fetching expenses from Supabase first...');
      const supabaseExpenses = await supabaseService.getExpenses(userId);
      
      // Cache in SQLite for offline access
      for (const expense of supabaseExpenses) {
        try {
          await this.saveExpense(userId, expense);
        } catch (error) {
          console.warn('Failed to cache expense locally:', error);
        }
      }
      
      console.log(`✅ Successfully fetched ${supabaseExpenses.length} expenses from Supabase`);
      return supabaseExpenses;
    } catch (error) {
      console.warn('⚠️ Failed to fetch from Supabase, falling back to local SQLite:', error);
      return await this.getExpenses(userId);
    }
  }

  async saveExpenseSupabaseFirst(userId: string, expense: any, syncToLocal = true) {
    try {
      console.log('💾 Saving expense to Supabase first...');
      const savedExpense = await supabaseService.createExpense(userId, expense);
      
      // Cache in SQLite for offline access
      if (syncToLocal) {
        try {
          await this.saveExpense(userId, savedExpense);
        } catch (error) {
          console.warn('Failed to cache expense locally:', error);
        }
      }
      
      console.log('✅ Successfully saved expense to Supabase');
      return savedExpense;
    } catch (error) {
      console.warn('⚠️ Failed to save to Supabase, saving locally:', error);
      return await this.saveExpense(userId, expense);
    }
  }

  async getDailyInputsSupabaseFirst(userId: string) {
    try {
      console.log('🔄 Fetching daily inputs from Supabase first...');
      const supabaseDailyInputs = await supabaseService.getDailyInputs(userId);
      
      // Cache in SQLite for offline access
      for (const input of supabaseDailyInputs) {
        try {
          await this.saveDailyInput(userId, input);
        } catch (error) {
          console.warn('Failed to cache daily input locally:', error);
        }
      }
      
      console.log(`✅ Successfully fetched ${supabaseDailyInputs.length} daily inputs from Supabase`);
      return supabaseDailyInputs;
    } catch (error) {
      console.warn('⚠️ Failed to fetch from Supabase, falling back to local SQLite:', error);
      return await this.getDailyInputs(userId);
    }
  }

  async saveDailyInputSupabaseFirst(userId: string, input: any, syncToLocal = true) {
    try {
      console.log('💾 Saving daily input to Supabase first...');
      const savedInput = await supabaseService.createDailyInput(userId, input);
      
      // Cache in SQLite for offline access
      if (syncToLocal) {
        try {
          await this.saveDailyInput(userId, savedInput);
        } catch (error) {
          console.warn('Failed to cache daily input locally:', error);
        }
      }
      
      console.log('✅ Successfully saved daily input to Supabase');
      return savedInput;
    } catch (error) {
      console.warn('⚠️ Failed to save to Supabase, saving locally:', error);
      return await this.saveDailyInput(userId, input);
    }
  }

  async updateDailyInputSupabaseFirst(userId: string, inputId: string, updates: any, syncToLocal = true) {
    try {
      console.log('📝 Updating daily input in Supabase first...');
      console.log('🔍 Debug - inputId:', inputId);
      console.log('🔍 Debug - inputId type:', typeof inputId);
      console.log('🔍 Debug - inputId length:', inputId?.length);
      console.log('🔍 Debug - userId:', userId);
      
      await supabaseService.updateDailyInput(userId, inputId, updates);
      
      // Update in SQLite for offline access
      if (syncToLocal) {
        try {
          await this.updateDailyInput(userId, inputId, updates);
        } catch (error) {
          console.warn('Failed to update daily input locally:', error);
        }
      }
      
      console.log('✅ Successfully updated daily input in Supabase');
    } catch (error) {
      console.warn('⚠️ Failed to update in Supabase, updating locally:', error);
      await this.updateDailyInput(userId, inputId, updates);
    }
  }

  // Client methods passthrough to supabaseService
  async getClients(userId: string) {
    return await supabaseService.getClients(userId);
  }
  async saveClient(userId: string, client: any, p0?: boolean) {
    return await supabaseService.createClient(userId, client);
  }
  async updateClient(userId: string, clientId: string, updates: any) {
    return await supabaseService.updateClient(userId, clientId, updates);
  }
  async deleteClient(userId: string, clientId: string) {
    return await supabaseService.deleteClient(userId, clientId);
  }

  // Expense Category methods passthrough to supabaseService
  async getExpenseCategories(userId: string) {
    return await supabaseService.getExpenseCategories(userId);
  }
  async saveExpenseCategory(userId: string, category: any, p0?: boolean) {
    return await supabaseService.createExpenseCategory(userId, category);
  }
  async updateExpenseCategory(userId: string, categoryId: string, updates: any) {
    return await supabaseService.updateExpenseCategory(userId, categoryId, updates);
  }
  async deleteExpenseCategory(userId: string, categoryId: string) {
    return await supabaseService.deleteExpenseCategory(userId, categoryId);
  }

}

export const databaseService = new DatabaseService();
