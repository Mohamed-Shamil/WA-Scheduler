/**
 * Popup Script for WA Scheduler & Reminder
 * Handles UI interactions and scheduling
 */

// DOM elements
const messageTextarea = document.getElementById('messageText');
const scheduledDateTime = document.getElementById('scheduledDateTime');
const targetChatInput = document.getElementById('targetChat');
const isReminderCheckbox = document.getElementById('isReminder');
const scheduleBtn = document.getElementById('scheduleBtn');
const testSendBtn = document.getElementById('testSendBtn');
const viewScheduledBtn = document.getElementById('viewScheduledBtn');
const statusMessage = document.getElementById('statusMessage');
const scheduledList = document.getElementById('scheduledList');
const chatSelectionSection = document.getElementById('chatSelectionSection');

// Hide chat selection when reminder is checked
isReminderCheckbox.addEventListener('change', () => {
  chatSelectionSection.style.display = isReminderCheckbox.checked ? 'none' : 'block';
});

// Set minimum datetime to current time
const now = new Date();
const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);
scheduledDateTime.min = localDateTime;

// Set default to 1 hour from now
const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
const defaultDateTime = new Date(oneHourLater.getTime() - oneHourLater.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);
scheduledDateTime.value = defaultDateTime;

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Clear status after 5 seconds for success/info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 5000);
  }
}

/**
 * Validate form inputs
 */
function validateForm() {
  const message = messageTextarea.value.trim();
  const dateTime = scheduledDateTime.value;

  if (!message) {
    showStatus('Please enter a message', 'error');
    return false;
  }

  if (!dateTime) {
    showStatus('Please select a date and time', 'error');
    return false;
  }

  const selectedTime = new Date(dateTime);
  const currentTime = new Date();

  if (selectedTime <= currentTime) {
    showStatus('Please select a future date and time', 'error');
    return false;
  }

  return true;
}

/**
 * Schedule a message or reminder
 */
async function schedule() {
  if (!validateForm()) {
    return;
  }

    const message = messageTextarea.value.trim();
    const dateTime = scheduledDateTime.value;
    const targetChat = targetChatInput.value.trim();
    const isReminder = isReminderCheckbox.checked;

    try {
      scheduleBtn.disabled = true;
      scheduleBtn.textContent = 'Scheduling...';

      const scheduledTime = new Date(dateTime);

      if (isReminder) {
        // Schedule as reminder
        await scheduleReminder(message, scheduledTime);
        showStatus(`Reminder scheduled for ${formatDateTime(scheduledTime)}`, 'success');
      } else {
        // Schedule as message
        await scheduleMessage(message, scheduledTime, targetChat || null);
        const chatInfo = targetChat ? ` to ${targetChat}` : '';
        showStatus(`Message scheduled${chatInfo} for ${formatDateTime(scheduledTime)}`, 'success');
      }

    // Clear form
    messageTextarea.value = '';
    targetChatInput.value = '';
    isReminderCheckbox.checked = false;
    
    // Update scheduled time to 1 hour from now
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    const nextHourLocal = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    scheduledDateTime.value = nextHourLocal;

    // Refresh the scheduled list
    await loadScheduledItems();
  } catch (error) {
    console.error('Error scheduling:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    scheduleBtn.disabled = false;
    scheduleBtn.textContent = 'Schedule';
  }
}

/**
 * Format date and time for display
 */
function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Load and display scheduled messages and reminders
 */
async function loadScheduledItems() {
  try {
    const messages = await getScheduledMessages();
    const reminders = await getScheduledReminders();
    
    // Combine and sort by scheduled time
    const allItems = [
      ...messages.map(m => ({ ...m, type: 'message' })),
      ...reminders.map(r => ({ ...r, type: 'reminder' }))
    ].sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

    if (allItems.length === 0) {
      scheduledList.innerHTML = '<div class="empty-state">No scheduled items</div>';
      return;
    }

    scheduledList.innerHTML = allItems.map(item => {
      const scheduledDate = new Date(item.scheduledTime);
      const isPast = scheduledDate < new Date();
      const chatInfo = item.targetChat ? ` <small style="color: #667781;">→ ${escapeHtml(item.targetChat)}</small>` : '';
      
      // Escape the ID and type for safe onclick handler
      const safeId = escapeHtml(item.id);
      const safeType = escapeHtml(item.type);
      
      const typeLabel = item.type === 'message' ? 'Message' : 'Reminder';
      const typeBadge = item.type === 'message' ? '<span class="type-badge type-message">MSG</span>' : '<span class="type-badge type-reminder">REM</span>';
      
      return `
        <div class="scheduled-item ${isPast ? 'past' : ''}">
          <div class="scheduled-item-header">
            <span class="scheduled-item-type">${typeBadge} ${typeLabel}${chatInfo}</span>
            <span class="scheduled-item-time">${formatDateTime(scheduledDate)}</span>
          </div>
          <div class="scheduled-item-text">${escapeHtml(item.text)}</div>
          <div class="scheduled-item-actions">
            <button class="btn-small btn-delete" data-item-id="${safeId}" data-item-type="${safeType}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners to delete buttons (using event delegation for safety)
    scheduledList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-item-id');
        const type = e.target.getAttribute('data-item-type');
        deleteItem(id, type);
      });
    });
  } catch (error) {
    console.error('Error loading scheduled items:', error);
    scheduledList.innerHTML = '<div class="empty-state">Error loading scheduled items</div>';
  }
}

/**
 * Delete a scheduled item
 */
async function deleteItem(id, type) {
  try {
    if (confirm('Are you sure you want to delete this item?')) {
      if (type === 'message') {
        await deleteScheduledMessage(id);
      } else {
        await deleteScheduledReminder(id);
      }
      showStatus('Item deleted', 'success');
      await loadScheduledItems();
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    showStatus(`Error deleting item: ${error.message}`, 'error');
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Delete function is now called via event listeners (no need for global)

/**
 * Test send message immediately (without scheduling)
 */
async function testSendNow() {
  const message = messageTextarea.value.trim();
  
  if (!message) {
    showStatus('Please enter a message to test', 'error');
    return;
  }
  
  try {
    testSendBtn.disabled = true;
    testSendBtn.textContent = 'Sending...';
    showStatus('Testing message send...', 'info');
    
    // Find WhatsApp Web tab
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    if (tabs.length === 0) {
      showStatus('Error: WhatsApp Web is not open. Please open https://web.whatsapp.com first.', 'error');
      testSendBtn.disabled = false;
      testSendBtn.textContent = 'Test Send Now (to current chat)';
      return;
    }
    
    const activeTab = tabs.find(tab => tab.active) || tabs[0];
    
    // Try to send message via content script
    try {
      // Try to send message (content script should already be loaded from manifest)
      // Don't inject again to avoid duplicates
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'sendMessage',
        message: message
      });
      
      if (response && response.success) {
        showStatus('✓ Test message sent successfully!', 'success');
        messageTextarea.value = '';
      } else if (response && response.error) {
        showStatus(`Error: ${response.error}`, 'error');
      } else {
        showStatus('Error: Unknown response from WhatsApp Web', 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}. Make sure you have selected a chat in WhatsApp Web.`, 'error');
    }
  } catch (error) {
    console.error('Test send error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    testSendBtn.disabled = false;
    testSendBtn.textContent = 'Test Send Now (to current chat)';
  }
}

// Event listeners
scheduleBtn.addEventListener('click', schedule);
testSendBtn.addEventListener('click', testSendNow);
viewScheduledBtn.addEventListener('click', loadScheduledItems);

// Load scheduled items on popup open
loadScheduledItems();

// Allow Enter key to schedule (Ctrl+Enter)
messageTextarea.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    schedule();
  }
});

