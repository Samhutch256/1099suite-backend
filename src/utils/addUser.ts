import { databaseService } from '../services/database';
import { generateUniqueId } from './generateId';

export async function addUserToDatabase(email: string, name?: string) {
  try {
    console.log('Initializing database...');
    await databaseService.initialize();
    
    const now = new Date().toISOString();
    const userId = generateUniqueId('user_');
    
    // Extract name from email if not provided
    const userName = name || email.split('@')[0].replace(/[0-9]/g, '').replace(/[^\w]/g, ' ').trim() || 'User';
    
    const newUser = {
      userId: userId,
      email: email,
      name: userName,
      photoURL: undefined,
      provider: 'manual',
      createdAt: now,
      lastLoginAt: now
    };
    
    console.log('Adding user to database:', newUser);
    await databaseService.saveUser(newUser);
    
    console.log('✅ Successfully added user:', newUser.email);
    console.log('User ID:', userId);
    
    return { success: true, userId, user: newUser };
    
  } catch (error) {
    console.error('❌ Failed to add user:', error);
    // Check if it's a constraint error (user already exists)
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('UNIQUE constraint')) {
        console.log('ℹ️  User already exists in database');
        return { success: true, message: 'User already exists', error };
      }
    }
    return { success: false, error };
  }
}

// Function specifically for adding the requested email
export async function addSamHutchEmail() {
  return await addUserToDatabase('Samhutch256@gmail.com', 'Sam Hutchinson');
}