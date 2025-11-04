/**
 * Background Service Worker for WA Scheduler & Reminder
 * Handles alarms, notifications, and message scheduling
 */

// Restore alarms when extension starts or browser restarts
chrome.runtime.onStartup.addListener(() => {
  console.log('[WA Scheduler] Extension started, restoring alarms...');
  restoreAlarms();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[WA Scheduler] Extension installed, initializing alarms...');
  restoreAlarms();
});

/**
 * Restore all alarms from storage when extension starts
 */
async function restoreAlarms() {
  try {
    const result = await chrome.storage.local.get(['scheduledMessages', 'reminders']);
    const scheduledMessages = result.scheduledMessages || [];
    const reminders = result.reminders || [];

    // Restore alarms for scheduled messages
    for (const message of scheduledMessages) {
      if (message.id && message.scheduledTime) {
        const alarmTime = new Date(message.scheduledTime).getTime();
        const now = Date.now();
        
        // Only set alarm if it's in the future
        if (alarmTime > now) {
          chrome.alarms.create(`message_${message.id}`, {
            when: alarmTime
          });
          console.log(`[WA Scheduler] Restored alarm for message ${message.id}`);
        }
      }
    }

    // Restore alarms for reminders
    for (const reminder of reminders) {
      if (reminder.id && reminder.scheduledTime) {
        const alarmTime = new Date(reminder.scheduledTime).getTime();
        const now = Date.now();
        
        // Only set alarm if it's in the future
        if (alarmTime > now) {
          chrome.alarms.create(`reminder_${reminder.id}`, {
            when: alarmTime
          });
          console.log(`[WA Scheduler] Restored alarm for reminder ${reminder.id}`);
        }
      }
    }
  } catch (error) {
    console.error('[WA Scheduler] Error restoring alarms:', error);
  }
}

/**
 * Handle alarm triggers
 * When an alarm fires, check if it's a message or reminder and act accordingly
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[WA Scheduler] Alarm fired: ${alarm.name}`);
  
  try {
    if (alarm.name.startsWith('message_')) {
      await handleScheduledMessage(alarm.name.replace('message_', ''));
    } else if (alarm.name.startsWith('reminder_')) {
      await handleReminder(alarm.name.replace('reminder_', ''));
    }
  } catch (error) {
    console.error('[WA Scheduler] Error handling alarm:', error);
  }
});

/**
 * Handle a scheduled message - inject and send it to WhatsApp Web
 */
async function handleScheduledMessage(messageId) {
  try {
    const result = await chrome.storage.local.get(['scheduledMessages']);
    const scheduledMessages = result.scheduledMessages || [];
    const message = scheduledMessages.find(m => m.id === messageId);

    if (!message) {
      console.error(`[WA Scheduler] Message ${messageId} not found`);
      return;
    }

    // Find WhatsApp Web tab
    let tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    // If no WhatsApp Web tab is open, open one
    if (tabs.length === 0) {
      console.log('[WA Scheduler] No WhatsApp Web tab found, opening one...');
      const newTab = await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
      // Wait for tab to load
      await new Promise(resolve => {
        const listener = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        // Timeout after 10 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 10000);
      });
      tabs = [newTab];
    }

    // Use the first active WhatsApp Web tab, or the first one if none is active
    let activeTab = tabs.find(tab => tab.active) || tabs[0];
    
    // Navigate to specific chat if targetChat is specified
    if (message.targetChat) {
      try {
        // Navigate to the chat using WhatsApp Web URL format
        const chatUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(message.targetChat)}`;
        await chrome.tabs.update(activeTab.id, { url: chatUrl });
        
        // Wait for navigation to complete and chat to load
        await new Promise(resolve => {
          const listener = (tabId, changeInfo) => {
            if (tabId === activeTab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              // Wait longer for chat interface to fully load and be ready
              setTimeout(resolve, 5000);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          // Longer timeout for chat loading
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }, 15000);
        });
        
        // Refresh tab object
        activeTab = await chrome.tabs.get(activeTab.id);
      } catch (navError) {
        console.warn('[WA Scheduler] Could not navigate to specific chat:', navError);
        // Continue anyway - will try to send to current chat
      }
    }

    // Inject content script and send message
    try {
      // Wait a bit more to ensure page is interactive
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // First, try to use the content script if available
      let sendSuccess = false;
      let sendError = null;
      
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'sendMessage',
          message: message.text
        });
        if (response && response.success) {
          sendSuccess = true;
          console.log('[WA Scheduler] Message sent via content script');
        } else if (response && response.error) {
          sendError = response.error;
        }
      } catch (msgError) {
        console.log('[WA Scheduler] Content script message failed, trying script injection...', msgError);
        sendError = msgError.message;
      }

      // If content script didn't work, inject the sendMessageToWhatsApp function directly
      if (!sendSuccess) {
        try {
          // Inject the complete sendMessageToWhatsApp function with waitForElement included
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              // Define waitForElement
              function waitForElement(selectors, maxAttempts = 40, interval = 500) {
                return new Promise((resolve, reject) => {
                  let attempts = 0;
                  const tryFind = () => {
                    attempts++;
                    for (const selector of selectors) {
                      const element = document.querySelector(selector);
                      if (element && element.offsetParent !== null) {
                        resolve(element);
                        return;
                      }
                    }
                    const footer = document.querySelector('#main footer');
                    if (footer) {
                      const contenteditables = footer.querySelectorAll('[contenteditable="true"]');
                      for (const contenteditable of contenteditables) {
                        if (contenteditable.offsetParent !== null) {
                          resolve(contenteditable);
                          return;
                        }
                      }
                    }
                    if (attempts >= maxAttempts) {
                      reject(new Error('Element not found'));
                      return;
                    }
                    setTimeout(tryFind, interval);
                  };
                  tryFind();
                });
              }
              
              // Define sendMessageToWhatsApp using waitForElement
              window.sendMessageToWhatsApp = function(messageText) {
                return new Promise((resolve, reject) => {
                  const inputSelectors = [
                    '[contenteditable="true"][data-tab="10"]',
                    'div[contenteditable="true"][data-tab="10"]',
                    'p[contenteditable="true"][data-tab="10"]',
                    'div[contenteditable="true"][role="textbox"]',
                    'p[contenteditable="true"][role="textbox"]',
                    '#main footer [contenteditable="true"]',
                    '#main footer div[contenteditable="true"]',
                    '#main footer p[contenteditable="true"]',
                    'footer [contenteditable="true"]',
                    '[contenteditable="true"]'
                  ];
                  
                  waitForElement(inputSelectors, 40, 500)
                    .then((messageInput) => {
                      // Send the message
                      messageInput.focus();
                      messageInput.click();
                      setTimeout(() => {
                        // Clear existing content
                        messageInput.innerHTML = '';
                        messageInput.innerText = '';
                        messageInput.textContent = '';
                        
                        // Set text directly - try multiple methods
                        messageInput.innerText = messageText;
                        messageInput.textContent = messageText;
                        
                        // If it's a div, set innerHTML with p tag (WhatsApp structure)
                        if (messageInput.tagName === 'DIV') {
                          const existingP = messageInput.querySelector('p');
                          if (existingP) {
                            existingP.textContent = messageText;
                            existingP.innerText = messageText;
                          } else {
                            messageInput.innerHTML = `<p>${messageText}</p>`;
                          }
                        }
                        
                        // Ensure text is set
                        if (!messageInput.innerText && !messageInput.textContent) {
                          messageInput.textContent = messageText;
                          messageInput.innerText = messageText;
                        }
                        
                        // Dispatch input events
                        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                        messageInput.dispatchEvent(inputEvent);
                        
                        const beforeInputEvent = new Event('beforeinput', { bubbles: true, cancelable: true });
                        messageInput.dispatchEvent(beforeInputEvent);
                        
                        // Wait a bit more for WhatsApp to recognize
                        setTimeout(() => {
                          // Find send button
                          let sendButton = document.querySelector('button[data-tab="11"]');
                          if (!sendButton) {
                            const sendIcon = document.querySelector('span[data-icon="send"]');
                            if (sendIcon) sendButton = sendIcon.closest('button') || sendIcon.closest('span[role="button"]');
                          }
                          if (!sendButton) {
                            sendButton = document.querySelector('button[aria-label*="Send"]') || document.querySelector('button[aria-label*="send"]');
                          }
                          if (!sendButton) {
                            const footer = document.querySelector('#main footer');
                            if (footer) {
                              const buttons = footer.querySelectorAll('button');
                              sendButton = Array.from(buttons).find(btn => !btn.disabled && btn.offsetParent !== null);
                            }
                          }
                          
                            if (sendButton && !sendButton.disabled) {
                              sendButton.click();
                              // Wait and check if sent, but resolve if button was clicked
                              setTimeout(() => {
                                const textAfterSend = messageInput.textContent || messageInput.innerText || '';
                                if (textAfterSend.trim() === '') {
                                  resolve();
                                } else {
                                  // Wait a bit more
                                  setTimeout(() => {
                                    const finalText = messageInput.textContent || messageInput.innerText || '';
                                    if (finalText.trim() === '') {
                                      resolve();
                                    } else {
                                      // Resolve anyway since button was clicked
                                      resolve();
                                    }
                                  }, 1000);
                                }
                              }, 800);
                            } else {
                              // Try Enter key
                              const enterDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
                              messageInput.dispatchEvent(enterDown);
                              setTimeout(() => {
                                const finalText = messageInput.textContent || messageInput.innerText || '';
                                if (finalText === '' || finalText.trim() === '') {
                                  resolve(); // Assume sent if input is empty
                                } else {
                                  setTimeout(() => {
                                    const checkText = messageInput.textContent || messageInput.innerText || '';
                                    if (checkText === '' || checkText.trim() === '') {
                                      resolve();
                                    } else {
                                      // Resolve anyway since Enter was pressed
                                      resolve();
                                    }
                                  }, 1000);
                                }
                              }, 800);
                            }
                        }, 300);
                      }, 500);
                    })
                    .catch((error) => {
                      reject(new Error('Message input box not found. Make sure WhatsApp Web is fully loaded and you have selected a chat.'));
                    });
                });
              };
            }
          });
          
          // Now call the injected function with the message
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (msg) => {
              return window.sendMessageToWhatsApp(msg);
            },
            args: [message.text]
          });
          sendSuccess = true; // Assume success if no error thrown
        } catch (injectError) {
          console.error('[WA Scheduler] Script injection failed:', injectError);
          sendError = injectError.message;
        }
      }
      
      if (!sendSuccess) {
        throw new Error(sendError || 'Failed to send message');
      }

      // Remove the message from scheduled list
      const updatedMessages = scheduledMessages.filter(m => m.id !== messageId);
      await chrome.storage.local.set({ scheduledMessages: updatedMessages });

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: 'WA Scheduler',
        message: 'Message sent successfully!'
      });

      console.log(`[WA Scheduler] Message ${messageId} sent successfully`);
    } catch (error) {
      console.error('[WA Scheduler] Error executing script:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: 'WA Scheduler',
        message: `Failed to send message: ${error.message}`
      });
    }
  } catch (error) {
    console.error('[WA Scheduler] Error handling scheduled message:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'WA Scheduler',
      message: `Error: ${error.message}`
    });
  }
}

/**
 * Handle a reminder - show notification
 */
async function handleReminder(reminderId) {
  try {
    const result = await chrome.storage.local.get(['reminders']);
    const reminders = result.reminders || [];
    const reminder = reminders.find(r => r.id === reminderId);

    if (!reminder) {
      console.error(`[WA Scheduler] Reminder ${reminderId} not found`);
      return;
    }

    // Show notification
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: 'WA Scheduler Reminder',
        message: reminder.text,
        priority: 2
      });
      console.log(`[WA Scheduler] Reminder notification created for ${reminderId}`);
    } catch (notifError) {
      console.error('[WA Scheduler] Error creating notification:', notifError);
      // If notification creation fails, log it but don't throw
      console.log(`[WA Scheduler] Reminder text: ${reminder.text}`);
    }

    // Optionally remove the reminder after showing (uncomment if desired)
    // const updatedReminders = reminders.filter(r => r.id !== reminderId);
    // await chrome.storage.local.set({ reminders: updatedReminders });

    console.log(`[WA Scheduler] Reminder ${reminderId} shown`);
  } catch (error) {
    console.error('[WA Scheduler] Error handling reminder:', error);
    // Try to show notification even if there's an error
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: 'WA Scheduler Reminder',
        message: reminder?.text || 'Reminder',
        priority: 2
      });
    } catch (e) {
      console.error('[WA Scheduler] Failed to show notification:', e);
    }
  }
}

/**
 * Wait for an element to appear in the DOM with retry logic
 * This is injected along with sendMessageToWhatsApp
 */
function waitForElement(selectors, maxAttempts = 40, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryFind = () => {
      attempts++;
      
      // Check if WhatsApp Web is loaded
      const appWrapper = document.querySelector('#app');
      const mainPanel = document.querySelector('#main');
      const isQRCodeScreen = document.querySelector('canvas[aria-label*="Scan"]') !== null;
      
      // Try all selectors
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
      }
      
      // Try alternative method: find any contenteditable in footer
      const footer = document.querySelector('#main footer');
      if (footer) {
        const contenteditables = footer.querySelectorAll('[contenteditable="true"]');
        for (const contenteditable of contenteditables) {
          if (contenteditable.offsetParent !== null) {
            resolve(contenteditable);
            return;
          }
        }
      }
      
      // Try finding any contenteditable in the main area that's in footer
      if (mainPanel) {
        const contenteditables = mainPanel.querySelectorAll('[contenteditable="true"]');
        for (const contenteditable of contenteditables) {
          const isInFooter = footer && footer.contains(contenteditable);
          if (isInFooter && contenteditable.offsetParent !== null) {
            resolve(contenteditable);
            return;
          }
        }
      }
      
      // Check if we're on QR code screen (not logged in)
      if (isQRCodeScreen && attempts > 5) {
        reject(new Error('WhatsApp Web is showing QR code. Please log in first.'));
        return;
      }
      
      if (attempts >= maxAttempts) {
        reject(new Error(`Element not found after ${maxAttempts} attempts (${maxAttempts * interval / 1000}s)`));
        return;
      }
      
      setTimeout(tryFind, interval);
    };
    
    tryFind();
  });
}

/**
 * Function to be injected into WhatsApp Web tab
 * This function will be executed in the context of the WhatsApp Web page
 * Uses the same logic as content.js for consistency
 */
function sendMessageToWhatsApp(messageText) {
  return new Promise((resolve, reject) => {
    try {
      // List of selectors to try
      const inputSelectors = [
        '[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][data-tab="10"]',
        'p[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][role="textbox"]',
        'p[contenteditable="true"][role="textbox"]',
        '#main footer [contenteditable="true"]',
        '#main footer div[contenteditable="true"]',
        '#main footer p[contenteditable="true"]',
        'footer [contenteditable="true"]',
        '[contenteditable="true"]'
      ];
      
      // Wait for the input box to appear (with retry logic)
      waitForElement(inputSelectors, 40, 500)
        .then((messageInput) => {
          sendMessageInjected(messageInput, messageText, resolve, reject);
        })
        .catch((error) => {
          reject(new Error('Message input box not found. Make sure WhatsApp Web is fully loaded and you have selected a chat.'));
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send message once input is found (injected version)
 * This uses the same simple textContent method to avoid duplication
 */
function sendMessageInjected(messageInput, messageText, resolve, reject) {
  try {
    if (!messageInput.offsetParent) {
      reject(new Error('Message input box is not visible'));
      return;
    }

    messageInput.focus();
    messageInput.click();
    
    setTimeout(() => {
      // Clear existing content
      messageInput.innerHTML = '';
      messageInput.innerText = '';
      messageInput.textContent = '';
      
      // Use textContent directly (most reliable, no event duplication)
      let textContainer = messageInput;
      if (messageInput.tagName !== 'P') {
        let pElement = messageInput.querySelector('p');
        if (!pElement) {
          pElement = document.createElement('p');
          messageInput.appendChild(pElement);
        }
        textContainer = pElement;
      }
      
      // Set the text content ONCE
      textContainer.textContent = messageText;
      
      // Dispatch input event only ONCE
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      messageInput.dispatchEvent(inputEvent);
      
      setTimeout(() => {
        attemptSendInjected(messageInput, resolve, reject);
      }, 300);
    }, 300);
  } catch (error) {
    reject(error);
  }
}

/**
 * Attempt to send (injected version)
 */
function attemptSendInjected(messageInput, resolve, reject) {
  let sendButton = document.querySelector('button[data-tab="11"]');
  
  if (!sendButton) {
    const sendIcon = document.querySelector('span[data-icon="send"]');
    if (sendIcon) {
      sendButton = sendIcon.closest('button') || sendIcon.closest('span[role="button"]');
    }
  }
  
  if (!sendButton) {
    sendButton = document.querySelector('button[aria-label*="Send"]') ||
                document.querySelector('button[aria-label*="send"]');
  }
  
  if (!sendButton) {
    const footer = document.querySelector('#main footer');
    if (footer) {
      const buttons = footer.querySelectorAll('button');
      sendButton = Array.from(buttons).find(btn => !btn.disabled && btn.offsetParent !== null);
    }
  }
  
  if (!sendButton || sendButton.disabled) {
    const enterDown = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13
    });
    messageInput.dispatchEvent(enterDown);
    
    setTimeout(() => {
      if (messageInput.innerText === '' || messageInput.textContent === '' || messageInput.innerHTML.trim() === '') {
        resolve();
      } else {
        setTimeout(() => {
          if (messageInput.innerText === '' || messageInput.textContent === '' || messageInput.innerHTML.trim() === '') {
            resolve();
          } else {
            reject(new Error('Could not send message'));
          }
        }, 1000);
      }
    }, 800);
    return;
  }
  
  if (sendButton && !sendButton.disabled) {
    sendButton.click();
    setTimeout(() => {
      if (messageInput.innerText === '' || messageInput.textContent === '' || messageInput.innerHTML.trim() === '') {
        resolve();
      } else {
        setTimeout(() => resolve(), 1000);
      }
    }, 500);
  } else {
    reject(new Error('Send button found but is disabled'));
  }
}

