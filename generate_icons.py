"""
Simple script to generate extension icons
Requires Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow is required. Install it with: pip install Pillow")
    exit(1)

import os

def create_icon(size, filename):
    """Create a simple icon with WhatsApp green background and 'WA' text"""
    # Create image with WhatsApp green background (#25d366)
    img = Image.new('RGB', (size, size), color='#25d366')
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fallback to default if not available
    try:
        # Try to use a system font
        font_size = size // 3
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Use default font if system fonts not available
            font = ImageFont.load_default()
            font_size = size // 4
    
    # Calculate text position (centered)
    text = "WA"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2)
    
    # Draw white text
    draw.text(position, text, fill='white', font=font)
    
    # Save icon
    os.makedirs('assets', exist_ok=True)
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

if __name__ == "__main__":
    print("Generating extension icons...")
    create_icon(16, 'assets/icon16.png')
    create_icon(48, 'assets/icon48.png')
    create_icon(128, 'assets/icon128.png')
    print("Icons generated successfully!")

