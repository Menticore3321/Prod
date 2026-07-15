# Master Project Implementation Plan & Customization Guide

Welcome to the **DEE J PRODUCTIONS** Video Editor Portfolio. This document outlines the structure of the entire project, maps out the dependencies, and shows you exactly how to customize the assets, videos, and theme parameters.

---

## 📁 Workspace Directory Structure

All project files are located inside this folder:
- [PRacto pr](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr)

Here is a map of the components and their locations:

| Component | File Path | Purpose | Editable Configuration |
| :--- | :--- | :--- | :--- |
| **HTML Layout** | [index.html](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/index.html) | Core DOM structure, titles, 10 Shorts, and 5 Long-form cinematic items. | Edit section names, descriptions, or change YouTube video IDs. |
| **Design System** | [index.css](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/index.css) | Minimalist monochrome variables, layout templates, and hover animations. | Edit styling theme tokens, fonts, and responsive grid configurations. |
| **3D Background** | [three-bg.js](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/three-bg.js) | Three.js rendering engine for ambient particles and grid lines. | Modify floating speed, particle density, and grid scaling. |
| **Core App Logic** | [app.js](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/app.js) | Handles smooth scroll, liquid custom cursor, and scroll-docking logo path animations. | Modify docking triggers, cursor scaling, and modal bindings. |
| **Local Server** | [start.py](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/start.py) | Python launcher script to serve pages and auto-open browser. | Port bindings and default launch options. |

---

## ⚡ How to Customize Configurations

### 1. Changing YouTube Video IDs
All videos are loaded dynamically using standard YouTube video IDs. You can modify these directly in [index.html](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/index.html):
- **Showreel Section**: Locate the wrapper with `data-video-id="ScMzIvxBSi4"` (Line 80) and replace the ID.
- **Cinematic Works (16:9)**: Locate the cards in the horizontal track (Lines 98, 112, 126, 140, 154) and replace the `data-video-id` values.
- **Viral Shorts (9:16)**: Locate the 10 short cards in the grid (starting at Line 178) and replace their `data-video-id` values.

### 2. Changing the Color Theme & Styling
You can change the entire color palette by editing CSS custom variables at the top of [index.css](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/index.css) (Lines 5 to 33). The site combines a high-end matte black base with a Formula 1-inspired electric neon yellow:
```css
:root {
    --color-bg-deep: #050505;       /* Deep obsidian background */
    --color-white: #ffffff;         /* Base white */
    --color-neon: #dfff00;          /* F1 Electric Lime/Yellow */
    --color-border: #191919;        /* Border color */
}
```

### 3. Modifying the SVG Monogram Logo
The logo is trace-vectorized as an SVG structure inside [index.html](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/index.html) (Line 79). You can change stroke weights or path shapes directly inside the SVG markup:
- **Stroke Width**: Adjust `stroke-width="8"` inside the paths to thicken/thin the lines.
- **Stroke Color**: Defaults to `#dfff00` on the main layer (`.logo-main`) and chromatic glitch layer tints.

### 4. Customizing Scroll Logo Docking
The logo docking animation is powered by GSAP ScrollTrigger inside [app.js](file:///c:/Users/deepa/Downloads/PRacto%20portfolio/PRacto%20pr/app.js) (Lines 112 to 169):
- **Start and End Points**: The ScrollTrigger trigger is bound to `#hero`. Docking finishes when the hero scrolls past `30%` of the viewport heights (`end: "bottom 30%"`).
- **Scale Factor**: Scales the logo container from its initial hero size (320px x 350px) down to the navigation bar logo dock (32px x 35px).

---

## 🚀 Execution & Verification
To test and view your local workspace edits:
1. Open terminal inside `PRacto pr`.
2. Run the command:
   ```bash
   python start.py
   ```
3. Open `http://localhost:8000/` in your browser.
