# Puzzle & Dragon Game – Current Specification Document

*Generated on 2025-11-22 (JST)*

---

## 1. Project Overview

The **Puzzle & Dragon** web‑based mini‑game is a JavaScript/HTML/CSS application that lets users select orbs, view drops, and interact with a ranking button. The UI has been iteratively refined to work on both desktop and mobile devices.

---

## 2. Core UI Components

| Component | Description | Current Implementation Details |
|-----------|-------------|--------------------------------|
| **Palette Header** | Text prompting the user to select a drop. | `配置するドロップを選択:` – displayed horizontally at the top of the palette on mobile. |
| **Orb Selection Row** | Row of orb icons that the user can tap/click. | Orbs are rendered via `drawOrb` in `script.js`; size is controlled by CSS variables `--orb-size` (default 48px). |
| **Ranking Button** | Prominent button that opens the ranking view. | Enlarged to 64 px height, bold font, primary colour `#ff6600`. |
| **Drop Display** | Visual representation of the selected drop. | Rendered as a circle/rounded‑square container; image is stretched to fill the container without preserving aspect ratio. |
| **Skill Display (Removed)** | Previously displayed skill information – now removed per UI refinement. |

---

## 3. Layout Specifications

### 3.1 Desktop Layout
- Palette header and orb row are stacked vertically.
- The ranking button sits below the orb row, centered.
- Drop container is placed to the right of the palette on larger screens.

### 3.2 Mobile Layout (Responsive)
- **Header**: Horizontal, fixed at the top of the palette area.
- **Orb Row**: Directly beneath the header, displayed **horizontally** with equal spacing.
- The layout avoids a tall, vertically‑long column; everything fits within the viewport width.
- Media query breakpoint: `@media (max-width: 600px)` adjusts font‑size, spacing, and container dimensions.

---

## 4. Styling Details (CSS)

- **Base Colours**: Primary `#ff6600`, secondary `#4a90e2`, background `#f5f5f5`.
- **Typography**: Google Font **Inter** – weight 400 for body, 600 for headings.
- **Orb Size**: `--orb-size: 48px;` (purple orb adjusted to match other orbs).
- **Drop Container**:
  ```css
  .drop {
    width: 80px;
    height: 80px;
    border-radius: 50%; /* circle */
    overflow: hidden;
    background-size: 100% 100%; /* stretch image */
    background-position: center;
  }
  ```
- **Responsive Adjustments** (in `orb-preview-override.css`):
  ```css
  @media (max-width: 600px) {
    .palette-header { font-size: 1rem; }
    .orb { width: var(--orb-size-mobile, 36px); height: var(--orb-size-mobile, 36px); }
    .ranking-button { width: 100%; height: 64px; }
  }
  ```

---

## 5. JavaScript Behaviour (script.js)

- `drawOrb(context, type, x, y)` draws an orb of the given `type` at `(x, y)` using the shared sprite sheet.
- The function now respects the **orb size variable** and ensures the purple orb uses the same dimensions as the others.
- Drop image handling: the image source is set as the background of the `.drop` element; CSS forces the image to stretch, eliminating distortion.
- Event listeners are attached to each orb element to update the selected drop and refresh the UI.

---

## 6. Outstanding Tasks / Future Work

1. **Accessibility** – add ARIA labels to orb buttons.
2. **Internationalisation** – externalise all Japanese strings to a localisation file.
3. **Performance** – lazy‑load orb sprite sheet for slower connections.
4. **Testing** – add visual regression tests for mobile layout.

---

*This specification document is stored as an artifact in the repository and should be kept up‑to‑date with any UI or functional changes.*
