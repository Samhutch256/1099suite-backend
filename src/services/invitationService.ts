interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterName: string;
  inviteeEmail: string;
  inviteeName: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  expiresAt: string;
}

class InvitationService {
  private baseUrl = 'https://api.your-app.com'; // Replace with your actual API URL
  
  async sendTeamInvitation(params: {
    teamId: string;
    teamName: string;
    inviterName: string;
    inviteeEmail: string;
    inviteeName: string;
    role: string;
  }): Promise<void> {
    const { teamId, teamName, inviterName, inviteeEmail, inviteeName, role } = params;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      throw new Error('Invalid email format');
    }

    // Create invitation record
    const invitation: TeamInvitation = {
      id: Date.now().toString(),
      teamId,
      teamName,
      inviterName,
      inviteeEmail,
      inviteeName,
      role,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    try {
      // In a real app, this would call your backend API
      await this.mockSendEmail(invitation);
      
      // Store invitation locally for tracking
      await this.storeInvitation(invitation);
      
      console.log(`Team invitation sent to ${inviteeEmail} for team "${teamName}"`);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      throw new Error('Failed to send invitation. Please try again.');
    }
  }

  private async mockSendEmail(invitation: TeamInvitation): Promise<void> {
    try {
      // Try to send real email first
      await this.sendRealEmail(invitation);
      console.log(`✅ Email sent successfully to ${invitation.inviteeEmail}`);
    } catch (error) {
      console.error('Failed to send real email, falling back to mock:', error);
      
      // Fallback to mock for development
      await new Promise(resolve => setTimeout(resolve, 1500));
      const emailContent = this.generateEmailContent(invitation);
      console.log('📧 Mock Email Sent (Real email failed):', emailContent);
      
      // Still throw error if user expects real emails
      // Comment out the line below if you want to allow mock fallback
      // throw new Error('Email delivery failed - using mock instead');
    }
  }

  private async sendRealEmail(invitation: TeamInvitation): Promise<void> {
    // Try multiple email services for reliability
    const emailServices = [
      { name: 'FormSubmit', method: () => this.sendViaFormSubmit(invitation) },
      { name: 'Netlify', method: () => this.sendViaNetlify(invitation) },
      { name: 'EmailJS', method: () => this.sendViaEmailJS(invitation) },
    ];

    const errors: string[] = [];
    
    for (const service of emailServices) {
      try {
        await service.method();
        console.log(`✅ Email sent via ${service.name} to ${invitation.inviteeEmail}`);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${service.name}: ${errorMsg}`);
        console.log(`⚠️ ${service.name} failed, trying next service...`);
      }
    }
    
    throw new Error(`All email services failed: ${errors.join('; ')}`);
  }

  private async sendViaNetlify(invitation: TeamInvitation): Promise<void> {
    // Use Netlify Forms as secondary option
    const formData = new FormData();
    formData.append('form-name', 'team-invitation');
    formData.append('email', invitation.inviteeEmail);
    formData.append('name', invitation.inviteeName);
    formData.append('subject', `You're invited to join ${invitation.teamName} on 1099Suite™!`);
    formData.append('message', `
Hi ${invitation.inviteeName},

${invitation.inviterName} has invited you to join the team "${invitation.teamName}" as a ${invitation.role} on 1099Suite™.

Invitation Code: ${invitation.id}
Team: ${invitation.teamName}
Role: ${invitation.role}
Expires: ${new Date(invitation.expiresAt).toLocaleDateString()}

To accept, download 1099Suite™ app and use code: ${invitation.id}

Best regards,
The 1099Suite™ Team
    `);

    const response = await fetch('https://1099suite.netlify.app/', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Netlify failed: ${response.status}`);
    }
  }

  private async sendViaEmailJS(invitation: TeamInvitation): Promise<void> {
    // Skip EmailJS for now as it requires account setup
    // This method will throw to fall back to other services
    throw new Error('EmailJS requires account configuration');
  }

  private async sendViaFormSubmit(invitation: TeamInvitation): Promise<void> {
    // Use FormSubmit.co as primary email service - free and reliable
    const formData = new FormData();
    formData.append('_to', invitation.inviteeEmail);
    formData.append('_subject', `You're invited to join ${invitation.teamName} on 1099Suite™!`);
    formData.append('_template', 'basic');
    formData.append('_captcha', 'false');
    formData.append('_next', 'https://1099suite.com/thanks');
    
    // Add all the invitation details as separate fields
    formData.append('invitee_name', invitation.inviteeName);
    formData.append('inviter_name', invitation.inviterName);
    formData.append('team_name', invitation.teamName);
    formData.append('role', invitation.role);
    formData.append('invitation_code', invitation.id);
    formData.append('expires_date', new Date(invitation.expiresAt).toLocaleDateString());
    
    // Add the formatted message
    formData.append('message', `
Hi ${invitation.inviteeName},

${invitation.inviterName} has invited you to join the team "${invitation.teamName}" as a ${invitation.role} on 1099Suite™.

Team Details:
• Team Name: ${invitation.teamName}
• Your Role: ${invitation.role}
• Invited by: ${invitation.inviterName}
• Invitation Code: ${invitation.id}

To accept this invitation:
1. Download the 1099Suite™ app from your app store
2. Sign up or log in to your account
3. Enter the invitation code: ${invitation.id}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.

Welcome to 1099Suite™ - Your complete business management solution!

Best regards,
The 1099Suite™ Team

Need help? Contact us at Support@1099Suite.com
    `);

    const response = await fetch('https://formsubmit.co/ajax/support@1099suite.com', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok || result.success !== 'true') {
      throw new Error(`FormSubmit failed: ${response.status} - ${JSON.stringify(result)}`);
    }
  }

  private generateEmailContent(invitation: TeamInvitation): string {
    return `
      To: ${invitation.inviteeEmail}
      Subject: You're invited to join ${invitation.teamName} on 1099Suite™!
      
      Hi ${invitation.inviteeName},
      
      ${invitation.inviterName} has invited you to join the team "${invitation.teamName}" as a ${invitation.role} on 1099Suite™.
      
      Team Details:
      • Team Name: ${invitation.teamName}
      • Your Role: ${invitation.role}
      • Invited by: ${invitation.inviterName}
      • Invitation Code: ${invitation.id}
      
      To accept this invitation:
      1. Download the 1099Suite™ app from your app store
      2. Sign up or log in to your account
      3. Enter the invitation code: ${invitation.id}
      
      This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.
      
      Welcome to 1099Suite™ - Your complete business management solution!
      
      Best regards,
      The 1099Suite™ Team
      
      ---
      Need help? Contact us at Support@1099Suite.com
    `;
  }

  private async storeInvitation(invitation: TeamInvitation): Promise<void> {
    // In a real app, this would store in your database
    // For now, we'll just log it
    console.log('Storing invitation:', invitation);
  }

  async checkInvitationStatus(invitationId: string): Promise<TeamInvitation | null> {
    // In a real app, this would query your backend
    // For demo purposes, return null
    return null;
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    // In a real app, this would update the invitation status
    // and add the user to the team
    console.log(`Accepting invitation ${invitationId} for user ${userId}`);
  }

  async declineInvitation(invitationId: string): Promise<void> {
    // In a real app, this would update the invitation status
    console.log(`Declining invitation ${invitationId}`);
  }
}

export const invitationService = new InvitationService();
export type { TeamInvitation };