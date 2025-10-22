import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { FollowUpReminder } from '../state/contractorStore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Set up notification categories for follow-up actions
      await Notifications.setNotificationCategoryAsync('follow-up', [
        {
          identifier: 'COMPLETE',
          buttonTitle: 'Mark Complete',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SNOOZE',
          buttonTitle: 'Snooze 1hr',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async scheduleFollowUpReminder(
    reminder: FollowUpReminder,
    leadName: string,
    leadPhone?: string
  ): Promise<string | null> {
    try {
      await this.initialize();

      const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
      const now = new Date();

      // Don't schedule if the time has already passed
      if (reminderDateTime <= now) {
        console.log('Reminder time has already passed, not scheduling');
        return null;
      }

      const typeEmoji = {
        call: '📞',
        email: '✉️',
        meeting: '🤝',
        other: '📋'
      };

      const actionText = {
        call: 'Call',
        email: 'Email',
        meeting: 'Meet with',
        other: 'Follow up with'
      };

      const title = `${typeEmoji[reminder.type]} ${actionText[reminder.type]} ${leadName}`;
      const body = reminder.notes 
        ? `${reminder.notes}${leadPhone ? `\n📱 ${leadPhone}` : ''}`
        : `Scheduled ${reminder.type} follow-up${leadPhone ? `\n📱 ${leadPhone}` : ''}`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: 'follow-up',
          data: {
            reminderId: reminder.id,
            leadName,
            leadPhone,
            type: reminder.type,
            originalTime: reminder.time,
            originalDate: reminder.date,
          },
        },
        trigger: {
          type: 'date',
          date: reminderDateTime,
        },
      });

      console.log(`Scheduled notification ${notificationId} for ${reminderDateTime}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Handle notification responses (when user taps on notification actions)
  setupNotificationResponseHandler() {
    Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data;

      if (actionIdentifier === 'COMPLETE') {
        // Mark reminder as complete
        console.log('User marked reminder as complete:', data.reminderId);
        // This would typically trigger a store action to mark the reminder complete
      } else if (actionIdentifier === 'SNOOZE') {
        // Snooze for 1 hour
        console.log('User snoozed reminder:', data.reminderId);
        this.snoozeReminder(data, 60); // 60 minutes
      }
    });
  }

  private async snoozeReminder(reminderData: any, minutes: number) {
    try {
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Snoozed: ${reminderData.leadName}`,
          body: `Reminder for ${reminderData.type} follow-up${reminderData.leadPhone ? `\n📱 ${reminderData.leadPhone}` : ''}`,
          categoryIdentifier: 'follow-up',
          data: reminderData,
        },
        trigger: {
          type: 'date',
          date: snoozeTime,
        },
      });

      console.log(`Snoozed reminder for ${minutes} minutes`);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  }
}

export const notificationService = new NotificationService();