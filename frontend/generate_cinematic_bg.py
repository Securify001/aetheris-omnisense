#!/usr/bin/env python3
"""
generate_cinematic_bg.py
Generates a stunning, 2560x1440 high-definition background image:
frontend/public/bg-cinematic.png and frontend/public/hero-bg.png
Features:
- Deep cybernetic cosmic void (dark obsidian #030805 to #05140b)
- Glowing aurora nebula in emerald (#00F59B), neon lime (#A3E635), and deep teal
- Perspective digital grid with glowing horizon
- Constellations of neural network nodes and synaptic pulse rays
- Specular stardust particles
"""

import math
import random
from PIL import Image, ImageDraw, ImageFilter

W, H = 2560, 1440

def generate():
    print(f"Creating {W}x{H} cinematic background...")
    # Base dark gradient
    base = Image.new("RGBA", (W, H), (3, 8, 5, 255))
    draw = ImageDraw.Draw(base)

    # 1. Vertical ambient gradient
    for y in range(H):
        t = y / H
        # Horizon peak near center-bottom
        glow = math.exp(-((t - 0.45) ** 2) / 0.12)
        r = int(3 + glow * 8)
        g = int(8 + glow * 32 + t * 14)
        b = int(5 + glow * 18 + t * 8)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # 2. Aurora Nebula Layer (soft glowing clouds)
    aurora = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aurora)

    # Central energetic core
    a_draw.ellipse([W*0.25, H*0.1, W*0.75, H*0.8], fill=(0, 245, 155, 30))
    a_draw.ellipse([W*0.35, H*0.2, W*0.65, H*0.65], fill=(5, 150, 105, 45))
    a_draw.ellipse([W*0.4, H*0.28, W*0.6, H*0.55], fill=(163, 230, 53, 28))

    # Side ambient nebulae
    a_draw.ellipse([-W*0.1, H*0.2, W*0.35, H*0.9], fill=(0, 245, 155, 20))
    a_draw.ellipse([W*0.65, H*0.1, W*1.1, H*0.85], fill=(5, 150, 105, 25))

    aurora = aurora.filter(ImageFilter.GaussianBlur(90))

    # 3. Perspective Cyber Grid (Ground/Horizon)
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grid)
    horizon_y = int(H * 0.62)

    # Horizontal lines with increasing spacing towards bottom
    y = horizon_y
    step = 8
    while y < H:
        alpha = int(min(140, 25 + (y - horizon_y) / (H - horizon_y) * 110))
        g_draw.line([(0, y), (W, y)], fill=(0, 245, 155, alpha), width=1)
        step = int(step * 1.18 + 2)
        y += step

    # Vanishing perspective lines converging at (W/2, horizon_y)
    cx = W // 2
    for x in range(-W, W * 2, 75):
        alpha = int(max(10, 80 - abs(x - cx) / W * 60))
        g_draw.line([(cx, horizon_y), (x, H)], fill=(0, 245, 155, alpha), width=1)

    # Glowing horizon separator
    g_draw.line([(0, horizon_y), (W, horizon_y)], fill=(163, 230, 53, 140), width=2)

    # 4. Neural Network Constellations (Nodes and Interconnects)
    nodes_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(nodes_layer)

    random.seed(42)  # Deterministic seed for aesthetic balance
    nodes = []
    for _ in range(65):
        nx = random.randint(int(W * 0.05), int(W * 0.95))
        ny = random.randint(int(H * 0.08), int(H * 0.60))
        size = random.uniform(2.5, 6.0)
        col = random.choice([
            (0, 245, 155, random.randint(140, 240)),
            (163, 230, 53, random.randint(140, 240)),
            (236, 253, 245, random.randint(180, 255)),
        ])
        nodes.append((nx, ny, size, col))

    # Connect nearby nodes with synaptic threads
    for i, (x1, y1, s1, c1) in enumerate(nodes):
        for j, (x2, y2, s2, c2) in enumerate(nodes[i + 1:]):
            dist = math.hypot(x2 - x1, y2 - y1)
            if dist < 220:
                alpha = int((1 - dist / 220) * 85)
                n_draw.line([(x1, y1), (x2, y2)], fill=(0, 245, 155, alpha), width=1)

    # Draw nodes with specular glow
    for nx, ny, size, col in nodes:
        # Halo
        n_draw.ellipse([nx - size*2.5, ny - size*2.5, nx + size*2.5, ny + size*2.5], fill=(col[0], col[1], col[2], 30))
        # Core
        n_draw.ellipse([nx - size, ny - size, nx + size, ny + size], fill=col)

    # 5. Stardust sparkles
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stars)
    for _ in range(160):
        sx = random.randint(0, W)
        sy = random.randint(0, int(H * 0.7))
        alpha = random.randint(40, 180)
        s_draw.point((sx, sy), fill=(236, 253, 245, alpha))

    # Composite all layers
    final = Image.alpha_composite(base, aurora)
    final = Image.alpha_composite(final, grid)
    final = Image.alpha_composite(final, nodes_layer)
    final = Image.alpha_composite(final, stars)

    # Save 2560x1440 background
    out1 = "/home/idealz/My-Project/Otari-VoxVision/frontend/public/bg-cinematic.png"
    out2 = "/home/idealz/My-Project/Otari-VoxVision/frontend/public/hero-bg.png"
    final.save(out1, "PNG", optimize=True)
    final.save(out2, "PNG", optimize=True)
    print(f"Successfully generated:\n -> {out1}\n -> {out2}")

if __name__ == "__main__":
    generate()
