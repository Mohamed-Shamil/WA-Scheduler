# WA Scheduler & Reminder

A privacy-focused Chrome Extension for scheduling WhatsApp Web messages and reminders. All data is stored locally - no external servers.

## Features

- 📅 **Schedule Messages**: Automatically send WhatsApp messages at a specific date and time
- 🔔 **Create Reminders**: Get Chrome notifications for important reminders
- 🔒 **Privacy-First**: All data stored locally using `chrome.storage.local`
- ⚡ **Reliable**: Uses Chrome Alarms API for accurate timing
- 🎨 **Modern UI**: Clean, minimal interface

## Installation

### Step 1: Prepare Icons

The extension requires icon files. You can:

1. **Option A**: Create your own icons (16x16, 48x48, 128x128 pixels) and save them as:
   - `assets/icon16.png`
   - `assets/icon48.png`
   - `assets/icon128.png`

2. **Option B**: Use online icon generators:
   - Visit [favicon.io](https://favicon.io/favicon-generator/) or similar
   - Generate icons with text "WA" or WhatsApp green color (#25d366)
   - Download and rename to the required sizes

3. **Option C**: Use placeholder icons:
   - The extension will work without icons, but Chrome will show a default icon
   - You can temporarily remove icon references from `manifest.json` if needed

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `scheduler` folder (this directory)
5. The extension should now appear in your extensions list

### Step 3: Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "WA Scheduler & Reminder"
3. Click the pin icon to keep it visible

## Usage

### Scheduling a Message

1. Open WhatsApp Web (https://web.whatsapp.com) and select a chat
2. Click the extension icon in Chrome toolbar
3. Enter your message in the textarea
4. Select a date and time (must be in the future)
5. Leave the "This is a reminder" checkbox unchecked
6. Click **Schedule**
7. The message will be sent automatically when the scheduled time arrives

### Creating a Reminder

1. Click the extension icon
2. Enter your reminder text
3. Select a date and time
4. Check the "This is a reminder" checkbox
5. Click **Schedule**
6. You'll receive a Chrome notification at the scheduled time

### Viewing Scheduled Items

1. Click the extension icon
2. Click **View Scheduled** button
3. See all your scheduled messages and reminders
4. Delete items by clicking the **Delete** button

## How It Works

### Architecture

- **Background Service Worker** (`background.js`): Handles alarms, notifications, and message injection
- **Content Script** (`content.js`): Runs on WhatsApp Web pages, provides message sending functions
- **Popup UI** (`popup/`): User interface for scheduling messages and reminders
- **Scheduler Utils** (`utils/scheduler.js`): Core scheduling logic and storage management

### Technical Details

1. **Storage**: All data stored in `chrome.storage.local`
2. **Alarms**: Uses `chrome.alarms` API for precise timing
3. **Message Injection**: Uses `chrome.scripting.executeScript` to inject messages into WhatsApp Web
4. **Notifications**: Chrome notifications API for reminders

### Important Notes

- **WhatsApp Web must be open**: The extension can only send messages when WhatsApp Web is open and you have a chat selected
- **Active tab**: The extension will use the active WhatsApp Web tab, or the first one found
- **Message input selector**: Uses `[contenteditable='true'][data-tab='10']` to find the message input
- **Send button**: Automatically finds and clicks the send button
- **Error handling**: If WhatsApp Web is closed, you'll receive a notification explaining why the message couldn't be sent

## Testing

### Test Message Scheduling

1. Open WhatsApp Web and select a chat
2. Schedule a message for 1-2 minutes in the future
3. Wait for the scheduled time
4. Verify the message is sent automatically
5. Check Chrome notifications for confirmation

### Test Reminders

1. Schedule a reminder for 1 minute in the future
2. Wait for the scheduled time
3. Verify Chrome notification appears
4. Click notification to see reminder details

### Test Edge Cases

- **WhatsApp Web closed**: Schedule a message, close WhatsApp Web, wait for time - should show error notification
- **No chat selected**: Schedule a message, ensure no chat is selected in WhatsApp Web - should handle gracefully
- **Browser restart**: Schedule items, restart Chrome - alarms should restore automatically

## Troubleshooting

### Extension not loading

- Check that all files are in the correct locations
- Verify `manifest.json` is valid JSON
- Check Chrome extensions page for error messages

### Messages not sending

- Ensure WhatsApp Web is open and active
- Make sure you have a chat selected
- Check browser console for errors (F12 → Console)
- Verify the scheduled time has passed

### Alarms not working

- Check that alarms are restored on browser startup
- Verify Chrome notifications permission is granted
- Check background service worker logs in `chrome://extensions` → Service Worker

### Icons not showing

- Verify icon files exist in `assets/` folder
- Check file names match manifest.json exactly
- Ensure icons are valid PNG files

## Development

### Project Structure

```
scheduler/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js             # Content script for WhatsApp Web
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── utils/
│   └── scheduler.js       # Scheduling utilities
├── assets/
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

### Code Style

- Modern JavaScript (ES2022+)
- Async/await patterns
- Comprehensive error handling
- Detailed code comments
- Modular architecture

## Privacy & Security

- **No external servers**: All data stored locally
- **No data collection**: Extension doesn't send any data externally
- **Local storage only**: Uses Chrome's local storage API
- **No tracking**: Zero analytics or tracking

## Limitations

- Works only with WhatsApp Web (not mobile app)
- Requires WhatsApp Web tab to be open for message sending
- Requires a chat to be selected before scheduling
- Message automation is for personal use only

## License

This extension is provided as-is for personal use. Use responsibly and in accordance with WhatsApp's Terms of Service.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify all requirements are met
4. Check Chrome extension permissions

---

**Enjoy scheduling your WhatsApp messages! 🚀**

