import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Paths
FONT_DIR = "/Users/armaganercan/.gemini/config/plugins/custom-skills-plugin/skills-disabled/canvas-design/canvas-fonts"
TITLE_FONT_PATH = os.path.join(FONT_DIR, "InstrumentSerif-Regular.ttf")
MONO_FONT_PATH = os.path.join(FONT_DIR, "GeistMono-Regular.ttf")
SANS_FONT_PATH = os.path.join(FONT_DIR, "Outfit-Regular.ttf")

# Double resolution for supersampling
SCALE = 2
WIDTH, HEIGHT = 1600 * SCALE, 2400 * SCALE

# Colors (Hex to RGB)
BG_COLOR = (13, 13, 15)       # Charcoal
GRID_COLOR = (24, 25, 28)     # Very subtle grid
AXIS_COLOR = (45, 47, 52)     # Subtle axes
CREAM_COLOR = (230, 223, 211) # Warm Cream (main lines, primary text)
TERRACOTTA = (194, 89, 63)    # Accent 1
SAGE = (111, 130, 113)        # Accent 2
MUTED_TEXT = (130, 128, 124)  # Muted grey-cream

def draw_dashed_circle(draw, center, radius, color, width=1, dash_len=10, gap_len=10):
    cx, cy = center
    circumference = 2 * math.pi * radius
    num_segments = int(circumference / (dash_len + gap_len))
    if num_segments == 0:
        return
    
    angle_step = 360 / num_segments
    dash_angle = (dash_len / circumference) * 360
    
    for i in range(num_segments):
        start_angle = i * angle_step
        end_angle = start_angle + dash_angle
        # Draw arc
        draw.arc(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            start_angle, end_angle,
            fill=color, width=width
        )

def draw_dotted_circle(draw, center, radius, color, width=2, dot_spacing=15):
    cx, cy = center
    circumference = 2 * math.pi * radius
    num_dots = int(circumference / dot_spacing)
    if num_dots == 0:
        return
    
    for i in range(num_dots):
        angle = (i * 2 * math.pi) / num_dots
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        # Draw dot
        draw.ellipse([x - width, y - width, x + width, y + width], fill=color)

def draw_crosshair(draw, center, size, color, width=1):
    cx, cy = center
    draw.line([cx - size, cy, cx + size, cy], fill=color, width=width)
    draw.line([cx, cy - size, cx, cy + size], fill=color, width=width)

def main():
    # 1. Create Base Image
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(image)
    
    # 2. Draw Subtle Background Grid
    grid_spacing = 100 * SCALE
    for x in range(0, WIDTH, grid_spacing):
        draw.line([x, 0, x, HEIGHT], fill=GRID_COLOR, width=1)
    for y in range(0, HEIGHT, grid_spacing):
        draw.line([0, y, WIDTH, y], fill=GRID_COLOR, width=1)
        
    # 3. Draw Outer Margin and Border
    margin = 80 * SCALE
    border_color = CREAM_COLOR
    # Draw outer frame
    draw.rectangle([margin, margin, WIDTH - margin, HEIGHT - margin], outline=border_color, width=2)
    
    # Inner thin border
    inner_margin = margin + 12 * SCALE
    draw.rectangle([inner_margin, inner_margin, WIDTH - inner_margin, HEIGHT - inner_margin], outline=AXIS_COLOR, width=1)
    
    # Border tick marks (like a scientific ruler)
    tick_len = 8 * SCALE
    for x in range(inner_margin, WIDTH - inner_margin, 40 * SCALE):
        # Top ticks
        draw.line([x, inner_margin, x, inner_margin + tick_len], fill=AXIS_COLOR, width=1)
        # Bottom ticks
        draw.line([x, HEIGHT - inner_margin, x, HEIGHT - inner_margin - tick_len], fill=AXIS_COLOR, width=1)
    for y in range(inner_margin, HEIGHT - inner_margin, 40 * SCALE):
        # Left ticks
        draw.line([inner_margin, y, inner_margin + tick_len, y], fill=AXIS_COLOR, width=1)
        # Right ticks
        draw.line([WIDTH - inner_margin, y, WIDTH - inner_margin - tick_len, y], fill=AXIS_COLOR, width=1)
        
    # 4. Central Geometric Art (Recursive Feedback System)
    # Let's shift it slightly upwards for asymmetry
    cx, cy = WIDTH // 2, HEIGHT // 2 - 200
    
    # Subtle radial lines extending from center
    num_radials = 24
    for i in range(num_radials):
        angle = (i * 2 * math.pi) / num_radials
        # Draw radial line extending from radius 150px to 900px
        r1, r2 = 150 * SCALE, 900 * SCALE
        x1 = cx + r1 * math.cos(angle)
        y1 = cy + r1 * math.sin(angle)
        x2 = cx + r2 * math.cos(angle)
        y2 = cy + r2 * math.sin(angle)
        draw.line([x1, y1, x2, y2], fill=GRID_COLOR, width=1)
        
    # Precise Concentric Circles
    # Outer boundaries
    draw.ellipse([cx - 900 * SCALE, cy - 900 * SCALE, cx + 900 * SCALE, cy + 900 * SCALE], outline=AXIS_COLOR, width=1)
    
    # Primary Cream Circles (varying weights)
    draw.ellipse([cx - 750 * SCALE, cy - 750 * SCALE, cx + 750 * SCALE, cy + 750 * SCALE], outline=CREAM_COLOR, width=3)
    draw.ellipse([cx - 450 * SCALE, cy - 450 * SCALE, cx + 450 * SCALE, cy + 450 * SCALE], outline=CREAM_COLOR, width=1)
    draw.ellipse([cx - 200 * SCALE, cy - 200 * SCALE, cx + 200 * SCALE, cy + 200 * SCALE], outline=CREAM_COLOR, width=5)
    
    # Accent Dashed and Dotted Circles
    draw_dashed_circle(draw, (cx, cy), 850 * SCALE, TERRACOTTA, width=2, dash_len=40, gap_len=20)
    draw_dashed_circle(draw, (cx, cy), 600 * SCALE, SAGE, width=1, dash_len=20, gap_len=15)
    draw_dotted_circle(draw, (cx, cy), 350 * SCALE, CREAM_COLOR, width=3, dot_spacing=25)
    
    # Crosshair at center
    draw_crosshair(draw, (cx, cy), 40 * SCALE, TERRACOTTA, width=2)
    
    # Intersecting spiral or arcs
    # Let's draw an arching logarithmic curve
    spiral_points = []
    a = 15 * SCALE
    b = 0.12
    for theta_deg in range(0, 1080, 5):
        theta = math.radians(theta_deg)
        r = a * math.exp(b * theta)
        if r > 1000 * SCALE:
            break
        x = cx + r * math.cos(theta)
        y = cy + r * math.sin(theta)
        spiral_points.append((x, y))
    if len(spiral_points) > 1:
        draw.line(spiral_points, fill=TERRACOTTA, width=2)
        
    # Add coordinates and markers along the spiral and intersections
    # We will load fonts for writing text
    font_mono_small = ImageFont.truetype(MONO_FONT_PATH, 11 * SCALE)
    font_mono_medium = ImageFont.truetype(MONO_FONT_PATH, 16 * SCALE)
    font_sans_small = ImageFont.truetype(SANS_FONT_PATH, 14 * SCALE)
    font_title = ImageFont.truetype(TITLE_FONT_PATH, 130 * SCALE)
    font_subtitle = ImageFont.truetype(SANS_FONT_PATH, 18 * SCALE)
    
    # Plot intersection nodes and their coordinates
    nodes = [
        (cx + 750 * SCALE * math.cos(math.radians(30)), cy + 750 * SCALE * math.sin(math.radians(30)), "node_01"),
        (cx + 450 * SCALE * math.cos(math.radians(135)), cy + 450 * SCALE * math.sin(math.radians(135)), "node_02"),
        (cx + 600 * SCALE * math.cos(math.radians(270)), cy + 600 * SCALE * math.sin(math.radians(270)), "node_03"),
        (cx + 200 * SCALE * math.cos(math.radians(210)), cy + 200 * SCALE * math.sin(math.radians(210)), "ref_core")
    ]
    
    for nx, ny, label in nodes:
        # Draw a solid dot
        draw.ellipse([nx - 6 * SCALE, ny - 6 * SCALE, nx + 6 * SCALE, ny + 6 * SCALE], fill=TERRACOTTA)
        # Outer ring around dot
        draw.ellipse([nx - 12 * SCALE, ny - 12 * SCALE, nx + 12 * SCALE, ny + 12 * SCALE], outline=CREAM_COLOR, width=1)
        # Text label next to dot
        offset_x = 15 * SCALE
        offset_y = -10 * SCALE
        draw.text((nx + offset_x, ny + offset_y), label.upper(), fill=CREAM_COLOR, font=font_mono_small)
        
        # Draw helper line pointing to dot
        draw.line([nx + offset_x - 3 * SCALE, ny + offset_y + 12 * SCALE, nx, ny], fill=AXIS_COLOR, width=1)
        
    # 5. Typographic Overlay
    
    # Main Title (bottom-left)
    title_text = "RECURSION"
    title_x = margin + 40 * SCALE
    title_y = HEIGHT - margin - 220 * SCALE
    draw.text((title_x, title_y), title_text, fill=CREAM_COLOR, font=font_title)
    
    # Subtitle
    subtitle_text = "SYSTEMATIC PATHWAYS OF COGNITIVE ATTENTION"
    subtitle_y = title_y + 145 * SCALE
    draw.text((title_x, subtitle_y), subtitle_text, fill=TERRACOTTA, font=font_subtitle)
    
    # Paragraph or brief description
    desc_text = "An abstract study of recursive system behavior, mapping visual vector trajectories\nagainst the silent expansion of self-referential mathematical loops."
    desc_y = subtitle_y + 35 * SCALE
    draw.text((title_x, desc_y), desc_text, fill=MUTED_TEXT, font=font_sans_small)
    
    # Technical metadata block (bottom-right)
    metadata = [
        ("PROJECT ID", "80E0D7B1-ANTIGRAVITY"),
        ("MOVEMENT", "RECURSIVE SILENCE"),
        ("VECTOR SHIFT", "+0.0042 / RAD"),
        ("RESOLUTION", "1600 X 2400 PX"),
        ("COMPOSITION", "ASYMMETRIC GRID"),
        ("TIMESTAMP", "2026.06.09 11:06")
    ]
    
    meta_x = WIDTH - margin - 350 * SCALE
    meta_y = HEIGHT - margin - 200 * SCALE
    
    for i, (key, value) in enumerate(metadata):
        y_offset = meta_y + i * 24 * SCALE
        # Draw Key
        draw.text((meta_x, y_offset), f"{key}:", fill=MUTED_TEXT, font=font_mono_small)
        # Draw Value (right-aligned or offset)
        draw.text((meta_x + 130 * SCALE, y_offset), value, fill=CREAM_COLOR, font=font_mono_small)
        
    # Scale reference bar (like a map scale bar)
    scale_bar_x = meta_x
    scale_bar_y = meta_y - 30 * SCALE
    scale_bar_w = 250 * SCALE
    scale_bar_h = 4 * SCALE
    draw.rectangle([scale_bar_x, scale_bar_y, scale_bar_x + scale_bar_w, scale_bar_y + scale_bar_h], fill=CREAM_COLOR)
    draw.rectangle([scale_bar_x, scale_bar_y, scale_bar_x + scale_bar_w // 4, scale_bar_y + scale_bar_h], fill=TERRACOTTA)
    draw.text((scale_bar_x, scale_bar_y - 20 * SCALE), "0", fill=MUTED_TEXT, font=font_mono_small)
    draw.text((scale_bar_x + scale_bar_w - 40 * SCALE, scale_bar_y - 20 * SCALE), "1.6180", fill=MUTED_TEXT, font=font_mono_small)
    
    # Top frame metadata
    top_meta_y = margin + 25 * SCALE
    draw.text((margin + 40 * SCALE, top_meta_y), "CANVAS ART DEMO // V0.1", fill=MUTED_TEXT, font=font_mono_small)
    draw.text((WIDTH - margin - 220 * SCALE, top_meta_y), "LATENT VECTOR SCALE 1:1", fill=MUTED_TEXT, font=font_mono_small)
    
    # 6. Apply Subtle Organic Film Grain (via NumPy)
    img_array = np.array(image, dtype=np.float32)
    # Generate random noise (mean=0, std=4.5)
    noise = np.random.normal(0, 4.5, img_array.shape)
    # Add noise and clip
    noisy_img = np.clip(img_array + noise, 0, 255).astype(np.uint8)
    image = Image.fromarray(noisy_img)
    
    # 7. Downsample to target size for perfect anti-aliasing (supersampling)
    final_w, final_h = WIDTH // SCALE, HEIGHT // SCALE
    image_final = image.resize((final_w, final_h), resample=Image.Resampling.LANCZOS)
    
    # Save Image
    output_path = "/Users/armaganercan/.gemini/antigravity/scratch/canvas-design-demo/canvas_output.png"
    image_final.save(output_path, "PNG")
    print(f"Canvas design successfully generated and saved to: {output_path}")

if __name__ == "__main__":
    main()
