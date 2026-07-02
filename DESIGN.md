# Design System & Guidelines

## 1. Aesthetic Vibe
- **Style**: Modern, Minimalist, Professional (PowerBI / SaaS style)
- **Visual Density**: High (Dense Layout) to fit as much actionable data on screen as possible without feeling cluttered.
- **Motion Intensity**: Low/Subtle. Animations should only be used for micro-interactions (e.g., hover states on charts) and not distract from data.
- **Design Variance**: Structured and grid-based. Symmetry and alignment are critical.

## 2. Typography
- **Primary Font**: Geist / Inter (Optimize for numbers and tabular data)
- **Hierarchy**:
  - Dashboard Titles: Text-xl to 2xl, semi-bold
  - Section Headers: Text-sm to base, font-medium, subtle gray
  - Data / Metrics: Large, bold, highly legible numerals
  - Helper Text: Text-xs, muted.

## 3. Colors
- **Primary Accent**: Emerald (Green) - Signifies growth, revenue, and positive sentiment.
  - Tailwind: `emerald-500` to `emerald-600` for active states.
  - Backgrounds for badges: `emerald-50` with `emerald-600` text.
- **Backgrounds**: Pure white for cards (`bg-white`), subtle light gray for main canvas (`bg-gray-50`).
- **Text**: Off-black for primary text (`text-slate-900`), muted slate for secondary (`text-slate-500`).
- **Borders**: Extremely subtle (`border-gray-100` or `border-slate-200`). No harsh lines.

## 4. Layout & Components
- **Grids**: Use CSS Grid extensively (`grid-cols-2`, `grid-cols-4`).
- **Cards**: Flat design with very subtle shadow (`shadow-sm`), rounded corners (`rounded-xl` or `rounded-2xl`).
- **Data Visualization**: Colors in charts should harmonise with the Emerald accent (using complementary data visualization palettes like teal, amber, and rose for contrast).
- **Interactive States**: Clear hover states for chart elements (cursor pointers).

## 5. Impeccable Anti-Patterns (Enforced)
- 🚫 NO pure black `#000000` text. Use `slate-900`.
- 🚫 NO default AI purple gradients or glowing buttons.
- 🚫 NO overly rounded pills for standard data cards (stick to consistent radius).
- 🚫 NO Serif fonts.
- 🚫 NO double-borders or heavy shadows on cards.
