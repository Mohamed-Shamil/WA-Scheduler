# Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Message input box not found"

This error occurs when the extension cannot find the WhatsApp Web message input box. Here's how to fix it:

#### **Solution 1: Ensure WhatsApp Web is fully loaded**
1. Open WhatsApp Web manually: https://web.whatsapp.com
2. Make sure you're logged in (not showing QR code)
3. Wait for the chat list to fully load
4. Select a chat by clicking on it
5. Wait until you can see the message input box at the bottom
6. Then try scheduling a message

#### **Solution 2: Check if you're logged in**
- If WhatsApp Web shows a QR code, you need to scan it with your phone first
- The extension cannot send messages when you're not logged in

#### **Solution 3: Ensure a chat is selected**
- The message input box only appears when a chat is selected
- Click on any conversation in the chat list
- Wait for the chat to open and the input box to appear

#### **Solution 4: For sending to specific phone numbers**
- When using the "Send to" field with a phone number:
  - Use the full phone number with country code (e.g., `1234567890`)
  - Don't include `+` or spaces
  - The extension will navigate to that chat automatically
  - Wait time: The extension waits up to 20 seconds for the chat to load
  - Make sure the phone number is correct and the contact exists in WhatsApp

#### **Solution 5: Check browser console for details**
1. Open WhatsApp Web
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Look for messages starting with `[WA Scheduler]`
5. These logs will tell you:
   - If the extension is trying to find the input box
   - How many attempts it's made
   - What selectors it's trying
   - Diagnostic information if it fails

### Issue: Messages not sending automatically

#### **Solution 1: Check Chrome notifications**
- The extension shows notifications when messages are sent or fail
- Check if you see a notification saying the message was sent
- If you see an error notification, check the message content

#### **Solution 2: Verify the scheduled time has passed**
- Check the extension popup → "View Scheduled"
- Make sure the scheduled time has actually passed
- The extension uses Chrome's alarm system, which should be accurate

#### **Solution 3: Check background service worker**
1. Go to `chrome://extensions/`
2. Find "WA Scheduler & Reminder"
3. Click "Service Worker" (or "Inspect views: background page")
4. Check the console for any errors
5. Look for alarm triggers and message sending attempts

### Issue: Extension not loading

#### **Solution 1: Reload the extension**
1. Go to `chrome://extensions/`
2. Find "WA Scheduler & Reminder"
3. Click the reload icon (circular arrow)
4. Try again

#### **Solution 2: Check for errors**
1. In `chrome://extensions/`, look for any red error messages
2. Check that all required permissions are granted
3. Make sure the extension is enabled

### Issue: Can't delete scheduled items

#### **Solution 1: Refresh the popup**
1. Close the extension popup
2. Reopen it
3. Click "View Scheduled" again
4. Try deleting

#### **Solution 2: Check browser console**
- Open the popup
- Right-click → Inspect
- Check console for JavaScript errors

## Debugging Tips

### Enable detailed logging
The extension already logs detailed information. To see it:

1. **For content script (WhatsApp Web page):**
   - Open WhatsApp Web
   - Press F12 → Console tab
   - Look for `[WA Scheduler]` messages

2. **For background service worker:**
   - Go to `chrome://extensions/`
   - Click "Service Worker" link
   - Check the console for logs

3. **For popup:**
   - Right-click the extension icon → Inspect popup
   - Check console for errors

### Common log messages

- `[WA Scheduler] Content script loaded` - Extension is active on WhatsApp Web
- `[WA Scheduler] Starting to look for message input box...` - Trying to send a message
- `[WA Scheduler] Attempt X: ...` - Retrying to find input box
- `[WA Scheduler] Found input box using selector: ...` - Successfully found input
- `[WA Scheduler] Message sent successfully` - Message was sent

### What to check if nothing works

1. **WhatsApp Web status:**
   - ✅ Logged in (not showing QR code)
   - ✅ Chat list loaded
   - ✅ A chat is selected
   - ✅ Message input box is visible

2. **Extension status:**
   - ✅ Extension is enabled
   - ✅ Permissions granted (storage, alarms, notifications, scripting, tabs)
   - ✅ No errors in `chrome://extensions/`

3. **Scheduled message:**
   - ✅ Scheduled time has passed
   - ✅ WhatsApp Web tab is open (or will be opened automatically)
   - ✅ For phone numbers: Contact exists in WhatsApp

## Getting Help

If you're still having issues:

1. Check the browser console for detailed error messages
2. Check the background service worker console
3. Note down:
   - What you were trying to do
   - The exact error message
   - Whether WhatsApp Web is logged in
   - Whether a chat is selected
   - The browser console logs

## Performance Notes

- The extension waits up to **20 seconds** for the input box to appear
- When navigating to a specific chat, it waits up to **15 seconds** for the page to load
- This is normal - WhatsApp Web can take time to load, especially on slower connections

