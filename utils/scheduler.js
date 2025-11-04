/**
 * Scheduler Utility Functions
 * Handles message and reminder scheduling logic
 */

/**
 * Generate a unique ID for scheduled items
 */
function generateId() {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Schedule a message to be sent at a specific time
 * @param {string} messageText - The message text to send
 * @param {Date} scheduledTime - When to send the message
 * @param {string} targetChat - Optional: Phone number or chat identifier to send to
 * @returns {Promise<string>} - The ID of the scheduled message
 */
async function scheduleMessage(messageText, scheduledTime, targetChat = null) {
  try {
    const messageId = generateId();
    const message = {
      id: messageId,
      text: messageText,
      scheduledTime: scheduledTime.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // Add target chat if provided (phone number with country code, no + or spaces)
    if (targetChat && targetChat.trim()) {
      // Clean phone number: remove +, spaces, dashes, parentheses
      message.targetChat = targetChat.trim().replace(/[\s\+\-\(\)]/g, '');
    }

    // Get existing messages
    const result = await chrome.storage.local.get(['scheduledMessages']);
    const scheduledMessages = result.scheduledMessages || [];
    
    // Add new message
    scheduledMessages.push(message);
    await chrome.storage.local.set({ scheduledMessages });

    // Create alarm
    const alarmTime = scheduledTime.getTime();
    chrome.alarms.create(`message_${messageId}`, {
      when: alarmTime
    });

    console.log(`[WA Scheduler] Message scheduled: ${messageId} for ${scheduledTime}`);
    return messageId;
  } catch (error) {
    console.error('[WA Scheduler] Error scheduling message:', error);
    throw error;
  }
}

/**
 * Schedule a reminder notification at a specific time
 * @param {string} reminderText - The reminder text
 * @param {Date} scheduledTime - When to show the reminder
 * @returns {Promise<string>} - The ID of the scheduled reminder
 */
async function scheduleReminder(reminderText, scheduledTime) {
  try {
    const reminderId = generateId();
    const reminder = {
      id: reminderId,
      text: reminderText,
      scheduledTime: scheduledTime.toISOString(),
      createdAt: new Date().toISOString()
    };

    // Get existing reminders
    const result = await chrome.storage.local.get(['reminders']);
    const reminders = result.reminders || [];
    
    // Add new reminder
    reminders.push(reminder);
    await chrome.storage.local.set({ reminders });

    // Create alarm
    const alarmTime = scheduledTime.getTime();
    chrome.alarms.create(`reminder_${reminderId}`, {
      when: alarmTime
    });

    console.log(`[WA Scheduler] Reminder scheduled: ${reminderId} for ${scheduledTime}`);
    return reminderId;
  } catch (error) {
    console.error('[WA Scheduler] Error scheduling reminder:', error);
    throw error;
  }
}

/**
 * Get all scheduled messages
 * @returns {Promise<Array>} - Array of scheduled messages
 */
async function getScheduledMessages() {
  try {
    const result = await chrome.storage.local.get(['scheduledMessages']);
    return result.scheduledMessages || [];
  } catch (error) {
    console.error('[WA Scheduler] Error getting scheduled messages:', error);
    return [];
  }
}

/**
 * Get all scheduled reminders
 * @returns {Promise<Array>} - Array of scheduled reminders
 */
async function getScheduledReminders() {
  try {
    const result = await chrome.storage.local.get(['reminders']);
    return result.reminders || [];
  } catch (error) {
    console.error('[WA Scheduler] Error getting scheduled reminders:', error);
    return [];
  }
}

/**
 * Delete a scheduled message
 * @param {string} messageId - The ID of the message to delete
 */
async function deleteScheduledMessage(messageId) {
  try {
    const result = await chrome.storage.local.get(['scheduledMessages']);
    const scheduledMessages = result.scheduledMessages || [];
    const updatedMessages = scheduledMessages.filter(m => m.id !== messageId);
    await chrome.storage.local.set({ scheduledMessages: updatedMessages });
    
    // Cancel the alarm
    chrome.alarms.clear(`message_${messageId}`);
    
    console.log(`[WA Scheduler] Message ${messageId} deleted`);
  } catch (error) {
    console.error('[WA Scheduler] Error deleting message:', error);
    throw error;
  }
}

/**
 * Delete a scheduled reminder
 * @param {string} reminderId - The ID of the reminder to delete
 */
async function deleteScheduledReminder(reminderId) {
  try {
    const result = await chrome.storage.local.get(['reminders']);
    const reminders = result.reminders || [];
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    await chrome.storage.local.set({ reminders: updatedReminders });
    
    // Cancel the alarm
    chrome.alarms.clear(`reminder_${reminderId}`);
    
    console.log(`[WA Scheduler] Reminder ${reminderId} deleted`);
  } catch (error) {
    console.error('[WA Scheduler] Error deleting reminder:', error);
    throw error;
  }
}

