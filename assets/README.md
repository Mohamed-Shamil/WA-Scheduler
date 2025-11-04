# Extension Icons

This folder should contain the following icon files:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Quick Setup Options

### Option 1: Generate Icons (Recommended)
If you have Python and Pillow installed:
```bash
pip install Pillow
python generate_icons.py
```

### Option 2: Use Online Generator
1. Visit https://favicon.io/favicon-generator/
2. Use text "WA" with WhatsApp green color (#25d366)
3. Download and extract the PNG files
4. Rename and resize to the required sizes:
   - `favicon-16x16.png` → `icon16.png`
   - `favicon-32x32.png` → resize to `icon48.png`
   - `android-chrome-192x192.png` → resize to `icon128.png`

### Option 3: Create Simple Icons
1. Create 16x16, 48x48, and 128x128 pixel PNG images
2. Use WhatsApp green background (#25d366)
3. Add white "WA" text in the center
4. Save as `icon16.png`, `icon48.png`, `icon128.png`

### Option 4: Temporary Workaround
The extension will work without icons - Chrome will show a default puzzle piece icon.
To test immediately, you can temporarily comment out the icon references in `manifest.json`.

## Icon Requirements
- Format: PNG
- Sizes: 16x16, 48x48, 128x128 pixels
- Recommended: WhatsApp green (#25d366) background with white text

