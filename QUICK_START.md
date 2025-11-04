# Quick Start Guide

## Step 1: Generate Icons (Optional but Recommended)

```bash
pip install Pillow
python generate_icons.py
```

Or follow the instructions in `assets/README.md` to create icons manually.

## Step 2: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `scheduler` folder

## Step 3: Test the Extension

### Test a Reminder (Easiest First Test)

1. Click the extension icon in Chrome toolbar
2. Type: "Test reminder"
3. Set time to 1 minute from now
4. Check "This is a reminder" checkbox
5. Click **Schedule**
6. Wait 1 minute
7. You should see a Chrome notification!

### Test Message Scheduling

1. Open WhatsApp Web: https://web.whatsapp.com
2. **Important**: Select a chat (click on any conversation)
3. Click the extension icon
4. Type: "Hello, this is a scheduled message!"
5. Set time to 2 minutes from now
6. Make sure "This is a reminder" is **unchecked**
7. Click **Schedule**
8. Keep WhatsApp Web open and wait 2 minutes
9. The message should be sent automatically!

## Troubleshooting

### "Message input box not found"
- Make sure you have **selected a chat** in WhatsApp Web
- Wait for WhatsApp Web to fully load
- Refresh the page if needed

### "WhatsApp Web tab not found"
- The extension only works when WhatsApp Web is open
- Open https://web.whatsapp.com in a tab

### No notifications appearing
- Check Chrome notification permissions
- Go to `chrome://settings/content/notifications`
- Make sure notifications are allowed

### Extension icon not showing
- The extension will work without icons
- Chrome will show a default puzzle piece icon
- Follow `assets/README.md` to add icons later

## Verification Checklist

- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] Popup opens when clicking extension icon
- [ ] Can schedule a reminder and receive notification
- [ ] Can schedule a message when WhatsApp Web is open
- [ ] Scheduled items appear in "View Scheduled"
- [ ] Can delete scheduled items

## Next Steps

- Read the full `README.md` for detailed documentation
- Check browser console (F12) for any errors
- Review background service worker logs in `chrome://extensions/`

Happy scheduling! 🚀

