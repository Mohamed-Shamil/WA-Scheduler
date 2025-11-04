/**
 * Content Script for WA Scheduler & Reminder
 * Runs in the context of WhatsApp Web pages
 * Provides helper functions for message injection
 */

// Prevent duplicate execution
if (window.waSchedulerLoaded) {
  console.log('[WA Scheduler] Content script already loaded, skipping');
} else {
  window.waSchedulerLoaded = true;
  console.log('[WA Scheduler] Content script loaded on WhatsApp Web');

  /**
   * Listen for messages from background script
   * This allows the background script to request message sending
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage') {
      // Handle async Promise
      sendMessageToWhatsApp(request.message)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('[WA Scheduler] Error sending message:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    }
  });
}

/**
 * Wait for an element to appear in the DOM with retry logic
 */
function waitForElement(selectors, maxAttempts = 40, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryFind = () => {
      attempts++;
      
      // Check if WhatsApp Web is loaded (not showing QR code)
      const appWrapper = document.querySelector('#app');
      const mainPanel = document.querySelector('#main');
      const isQRCodeScreen = document.querySelector('canvas[aria-label*="Scan"]') !== null;
      
      if (!appWrapper) {
        console.log(`[WA Scheduler] Attempt ${attempts}: WhatsApp Web app not found yet`);
      } else if (isQRCodeScreen) {
        console.log(`[WA Scheduler] Attempt ${attempts}: WhatsApp Web showing QR code - not logged in`);
      } else if (!mainPanel) {
        console.log(`[WA Scheduler] Attempt ${attempts}: Main panel not found yet`);
      }
      
      // Try all selectors
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          console.log(`[WA Scheduler] Found input box using selector: ${selector}`);
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
            console.log('[WA Scheduler] Found input box in footer');
            resolve(contenteditable);
            return;
          }
        }
      }
      
      // Try finding any contenteditable in the main area
      const main = document.querySelector('#main');
      if (main) {
        const contenteditables = main.querySelectorAll('[contenteditable="true"]');
        for (const contenteditable of contenteditables) {
          // Check if it's in the footer area (likely the message input)
          const isInFooter = footer && footer.contains(contenteditable);
          if (isInFooter && contenteditable.offsetParent !== null) {
            console.log('[WA Scheduler] Found input box in main footer area');
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
        // Log diagnostic info
        console.error('[WA Scheduler] Diagnostic info:');
        console.error('- App wrapper:', !!appWrapper);
        console.error('- Main panel:', !!mainPanel);
        console.error('- Footer:', !!footer);
        console.error('- QR code screen:', isQRCodeScreen);
        if (main) {
          const allContenteditables = main.querySelectorAll('[contenteditable="true"]');
          console.error('- Total contenteditables found:', allContenteditables.length);
        }
        reject(new Error(`Element not found after ${maxAttempts} attempts (${maxAttempts * interval / 1000}s)`));
        return;
      }
      
      setTimeout(tryFind, interval);
    };
    
    tryFind();
  });
}

// Prevent duplicate function definitions
if (!window.sendMessageToWhatsApp) {
  /**
   * Send a message to WhatsApp Web
   * This function is used by both the background script (via injection)
   * and can be called directly from content script context
   */
  window.sendMessageToWhatsApp = function(messageText) {
    return new Promise((resolve, reject) => {
      try {
        // List of selectors to try, in order of preference
        // WhatsApp Web uses various selectors depending on the version
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
        
        console.log('[WA Scheduler] Starting to look for message input box...');
        
        // Wait for the input box to appear (with retry logic - 40 attempts = 20 seconds)
        waitForElement(inputSelectors, 40, 500)
          .then((messageInput) => {
            console.log('[WA Scheduler] Message input box found, proceeding to send message');
            sendMessage(messageInput, messageText, resolve, reject);
          })
          .catch((error) => {
            console.error('[WA Scheduler] Failed to find message input box:', error);
            reject(new Error('Message input box not found. Make sure WhatsApp Web is fully loaded and you have selected a chat.'));
          });
      } catch (error) {
        console.error('[WA Scheduler] Error in sendMessageToWhatsApp:', error);
        reject(error);
      }
    });
  };
}

// Prevent duplicate function definitions
if (!window.waSchedulerSendMessage) {
  window.waSchedulerSendMessage = true;
}

/**
 * Send the message once the input box is found
 */
function sendMessage(messageInput, messageText, resolve, reject) {
  try {
    // Ensure input is visible and ready
    if (!messageInput.offsetParent) {
      reject(new Error('Message input box is not visible'));
      return;
    }

    // Focus the input
    messageInput.focus();
    messageInput.click();
    
    // Wait a moment for focus to take effect
    setTimeout(() => {
      // Clear any existing content properly
      messageInput.innerHTML = '';
      messageInput.innerText = '';
      messageInput.textContent = '';
      
      console.log('[WA Scheduler] Setting message text:', messageText);
      
      // Set text using WhatsApp Web's expected format
      // WhatsApp uses a div with a p element inside for the message
      if (messageInput.tagName === 'DIV') {
        // Clear and set using innerHTML with p tag (WhatsApp's structure)
        messageInput.innerHTML = `<p>${messageText}</p>`;
      } else if (messageInput.tagName === 'P') {
        // It's already a p element, just set text
        messageInput.textContent = messageText;
        messageInput.innerText = messageText;
      } else {
        // Fallback: set both innerText and textContent
        messageInput.innerText = messageText;
        messageInput.textContent = messageText;
      }
      
      // Verify text was set
      const currentText = messageInput.innerText || messageInput.textContent || 
                         (messageInput.querySelector('p')?.textContent) || '';
      
      console.log('[WA Scheduler] Text set. Current value:', currentText);
      
      if (!currentText || currentText.trim() === '') {
        console.warn('[WA Scheduler] Text was not set properly, trying alternative method');
        // Try setting directly on the element
        messageInput.textContent = messageText;
        messageInput.innerText = messageText;
      }
      
      // Dispatch input event to trigger WhatsApp's handlers
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      messageInput.dispatchEvent(inputEvent);
      
      // Also dispatch beforeinput for better compatibility
      const beforeInputEvent = new Event('beforeinput', { bubbles: true, cancelable: true });
      messageInput.dispatchEvent(beforeInputEvent);
      
      // Wait a bit longer for WhatsApp to process the input and enable send button
      setTimeout(() => {
        attemptSend(messageInput, resolve, reject);
      }, 800);
    }, 300);
  } catch (error) {
    console.error('[WA Scheduler] Error in sendMessage:', error);
    reject(error);
  }
}

// Removed character-by-character typing function as it was causing duplication issues

/**
 * Attempt to send the message by finding and clicking the send button
 */
function attemptSend(messageInput, resolve, reject) {
  // Find and click the send button - try multiple strategies
  let sendButton = null;
  
  // Strategy 1: Data-tab attribute
  sendButton = document.querySelector('button[data-tab="11"]');
  
  // Strategy 2: Data-icon send
  if (!sendButton) {
    const sendIcon = document.querySelector('span[data-icon="send"]');
    if (sendIcon) {
      sendButton = sendIcon.closest('button');
      if (!sendButton) {
        sendButton = sendIcon.closest('span[role="button"]');
      }
    }
  }
  
  // Strategy 3: Aria-label
  if (!sendButton) {
    sendButton = document.querySelector('button[aria-label*="Send"]') ||
                document.querySelector('button[aria-label*="send"]') ||
                document.querySelector('button[aria-label*="Enviar"]');
  }
  
  // Strategy 4: Look for button near the input area
  if (!sendButton) {
    const footer = document.querySelector('#main footer');
    if (footer) {
      sendButton = footer.querySelector('button[type="button"]:not([disabled])');
    }
  }
  
  // Strategy 5: Look for any button that's not disabled in the footer
  if (!sendButton) {
    const footer = document.querySelector('#main footer');
    if (footer) {
      const buttons = footer.querySelectorAll('button');
      sendButton = Array.from(buttons).find(btn => !btn.disabled && btn.offsetParent !== null);
    }
  }
  
  // Strategy 6: Try pressing Enter key programmatically
  if (!sendButton || sendButton.disabled) {
    console.log('[WA Scheduler] Send button not found, trying Enter key...');
    
    // Try multiple Enter key events
    const enterDown = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    });
    
    const enterPress = new KeyboardEvent('keypress', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    });
    
    const enterUp = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    });
    
    messageInput.dispatchEvent(enterDown);
    messageInput.dispatchEvent(enterPress);
    messageInput.dispatchEvent(enterUp);
    
    // Wait a moment and check if message was sent
    setTimeout(() => {
      const textAfterEnter = messageInput.textContent || messageInput.innerText || messageInput.innerHTML.replace(/<[^>]*>/g, '');
      if (textAfterEnter.trim() === '') {
        console.log('[WA Scheduler] Message appears to be sent via Enter key');
        resolve();
      } else {
        // Try one more time with a longer wait
        setTimeout(() => {
          const finalText = messageInput.textContent || messageInput.innerText || messageInput.innerHTML.replace(/<[^>]*>/g, '');
          if (finalText.trim() === '') {
            console.log('[WA Scheduler] Message sent via Enter key (delayed verification)');
            resolve();
          } else {
            reject(new Error('Could not send message. Please try selecting a chat and ensure the send button is visible.'));
          }
        }, 1500);
      }
    }, 1000);
    return;
  }
  
  if (sendButton && !sendButton.disabled) {
    // Get the message text from input for verification
    const messageTextToVerify = messageInput.textContent || messageInput.innerText || 
                               (messageInput.querySelector('p')?.textContent) || '';
    
    // Click the send button - use native click
    sendButton.click();
    console.log('[WA Scheduler] Send button clicked');
    
    // Wait and verify message was actually sent by checking if it appears in chat
    let checkCount = 0;
    const maxChecks = 8;
    const checkInterval = 500;
    
    const verifySent = () => {
      checkCount++;
      
      // Check 1: Is input cleared?
      const textAfterSend = messageInput.textContent || messageInput.innerText || 
                           messageInput.innerHTML.replace(/<[^>]*>/g, '');
      
      if (textAfterSend.trim() === '') {
        console.log('[WA Scheduler] Message sent successfully - input cleared');
        resolve();
        return;
      }
      
      // Check 2: Did message appear in chat? (more reliable)
      try {
        const messagePanels = document.querySelectorAll('[data-testid="conversation-panel-messages"]');
        for (const panel of messagePanels) {
          const messages = Array.from(panel.querySelectorAll('[data-testid="msg-container"]'));
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const lastMessageText = (lastMessage.textContent || '').trim();
            
            // Check if last message matches what we sent
            if (lastMessageText && messageTextToVerify && 
                (lastMessageText === messageTextToVerify.trim() || 
                 lastMessageText.includes(messageTextToVerify.trim()) ||
                 messageTextToVerify.trim().includes(lastMessageText))) {
              console.log('[WA Scheduler] Message found in chat - sent successfully!');
              resolve();
              return;
            }
          }
        }
      } catch (e) {
        // Ignore errors in verification
      }
      
      if (checkCount >= maxChecks) {
        // After multiple checks, still not confirmed
        console.warn('[WA Scheduler] Could not verify message was sent. Input still contains:', textAfterSend);
        console.warn('[WA Scheduler] Please check WhatsApp manually to see if message was sent');
        // Resolve anyway to avoid blocking
        resolve();
      } else {
        // Check again
        setTimeout(verifySent, checkInterval);
      }
    };
    
    // Start verification after initial delay
    setTimeout(verifySent, 1000);
  } else {
    reject(new Error('Send button found but is disabled. Make sure you have selected a chat and the message input is active.'));
  }
}

