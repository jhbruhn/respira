# SKiTCH Controller UI Design Analysis & Recommendations

## Executive Summary

The SKiTCH Controller application has a solid foundation with Tailwind CSS v4, Heroicons, and a clean component structure. However, there are opportunities to improve visual hierarchy, consistency, accessibility, and user experience through refined color usage, typography, spacing, and interactive feedback.

---

## Current State Assessment

### Strengths
- Clean, modern aesthetic with Tailwind CSS
- Good use of Heroicons for consistent iconography
- Responsive two-column layout that maximizes workspace
- Workflow stepper provides clear progress indication
- NextStepGuide component offers excellent contextual help
- Compact design suitable for professional/technical users

### Areas for Improvement
- Inconsistent color usage across components (multiple shades of blue, cyan, yellow)
- Typography hierarchy could be stronger
- Button states need better visual feedback
- Information density varies across components
- Some accessibility concerns (color contrast, focus states)
- Visual weight of components doesn't always match importance

---

## Detailed Analysis & Recommendations

### 1. COLOR SYSTEM & CONSISTENCY

#### Current Issues
- **Multiple blue variants**: blue-50, blue-100, blue-600, blue-700, cyan-50, cyan-100, cyan-600
- **Inconsistent status colors**: Both cyan and blue used for "active" states
- **Scattered color definitions**: Colors defined inline throughout components
- **No semantic color system**: Colors don't communicate clear meaning

#### Recommendations

**Establish a Semantic Color Palette:**

```css
/* Create a design tokens file: src/styles/design-tokens.css */
@theme {
  --color-primary: #2563eb;          /* blue-600 - Primary actions, branding */
  --color-primary-light: #3b82f6;    /* blue-500 - Hover states */
  --color-primary-dark: #1d4ed8;     /* blue-700 - Active states */

  --color-secondary: #64748b;        /* slate-600 - Secondary actions */
  --color-secondary-light: #94a3b8;  /* slate-400 */

  --color-success: #16a34a;          /* green-600 - Success, complete */
  --color-success-bg: #dcfce7;       /* green-100 */

  --color-warning: #d97706;          /* amber-600 - Warnings, waiting */
  --color-warning-bg: #fef3c7;       /* amber-100 */

  --color-danger: #dc2626;           /* red-600 - Errors, destructive */
  --color-danger-bg: #fee2e2;        /* red-100 */

  --color-info: #0891b2;             /* cyan-600 - Information, active */
  --color-info-bg: #cffafe;          /* cyan-100 */

  --color-neutral-50: #f9fafb;       /* Backgrounds */
  --color-neutral-100: #f3f4f6;      /* Subtle backgrounds */
  --color-neutral-300: #d1d5db;      /* Borders */
  --color-neutral-600: #4b5563;      /* Secondary text */
  --color-neutral-900: #111827;      /* Primary text */
}
```

**Apply Consistently Across Components:**

Replace scattered color classes with semantic tokens:
- `bg-blue-600` → `bg-primary`
- `bg-cyan-600` → `bg-info`
- `text-blue-900` → `text-primary-dark`

**Status Color Mapping:**
```typescript
// Create utility: src/utils/statusColors.ts
export const STATUS_COLORS = {
  idle: 'info',        // Cyan/blue - machine ready
  active: 'info',      // Cyan/blue - in progress
  waiting: 'warning',  // Amber - user action needed
  complete: 'success', // Green - finished
  error: 'danger',     // Red - error state
  paused: 'warning'    // Amber - paused
} as const;
```

---

### 2. TYPOGRAPHY & READABILITY

#### Current Issues
- Inconsistent heading sizes across components
- Some text too small (10px, 11px)
- Line height not optimized for readability
- Font weight usage inconsistent

#### Recommendations

**Establish Typography Scale:**

```typescript
// Component heading hierarchy
h1: "text-2xl font-bold"          // Main title (SKiTCH Controller)
h2: "text-xl font-semibold"       // Section titles (Pattern Preview)
h3: "text-base font-semibold"     // Subsection titles (Pattern Information)
h4: "text-sm font-semibold"       // Small headings (Color Blocks)

// Body text scale
body-lg: "text-base leading-relaxed"      // 16px
body: "text-sm leading-normal"            // 14px
body-sm: "text-xs leading-normal"         // 12px
caption: "text-[11px] leading-tight"      // 11px (use sparingly)
```

**Specific Component Improvements:**

**WorkflowStepper:**
```tsx
// Current: text-xs for step labels - TOO SMALL
<div className="text-xs font-semibold">

// Recommended: Larger, more readable
<div className="text-sm font-semibold tracking-wide">
```

**ProgressMonitor - Color Blocks:**
```tsx
// Current: text-xs for thread labels
<span className="text-xs text-gray-600">

// Recommended: Slightly larger for better scannability
<span className="text-sm text-neutral-600">
```

**PatternCanvas - Overlays:**
```tsx
// Current: Mixed sizes (10px, 11px, 13px)
<div className="text-[11px]">
<div className="text-[13px]">

// Recommended: Use consistent scale
<div className="text-xs">        // 12px
<div className="text-sm">        // 14px
```

---

### 3. SPACING & VISUAL HIERARCHY

#### Current Issues
- Component padding varies (p-3, p-4, p-6)
- Inconsistent gap spacing (gap-2, gap-3, gap-4, gap-6)
- Section headers don't always stand out
- Some areas too cramped, others too spacious

#### Recommendations

**Standardize Component Spacing:**

```css
/* Card/Section padding */
.card-sm { @apply p-4; }       /* Compact cards (ProgressMonitor) */
.card-md { @apply p-5; }       /* Standard cards (MachineConnection) */
.card-lg { @apply p-6; }       /* Important cards (NextStepGuide) */

/* Content spacing */
.stack-xs { @apply space-y-2; }   /* Tight grouping */
.stack-sm { @apply space-y-3; }   /* Related items */
.stack-md { @apply space-y-4; }   /* Section spacing */
.stack-lg { @apply space-y-6; }   /* Major sections */
```

**Improve Visual Hierarchy in Cards:**

```tsx
// Current header style (weak separation)
<h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">

// Recommended (stronger presence)
<div className="mb-5 pb-3 border-b border-neutral-200">
  <h2 className="text-xl font-bold text-neutral-900">Pattern Preview</h2>
</div>
```

**ProgressMonitor Layout Enhancement:**
```tsx
// Current: Grid with generic gaps
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Recommended: Better defined sections
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-4">...</div>  {/* Left column */}
  <div className="space-y-4">...</div>  {/* Right column */}
</div>
```

---

### 4. BUTTON DESIGN & INTERACTION STATES

#### Current Issues
- Hover effects inconsistent
- No active/pressed state visual feedback
- Disabled states use grayscale filter (unusual)
- Loading states could be clearer
- Button hierarchy not always clear

#### Recommendations

**Primary Button System:**

```tsx
// Primary actions (Start Sewing, Upload, Connect)
className="
  px-6 py-3
  bg-primary text-white
  rounded-lg font-semibold text-sm
  shadow-sm
  hover:bg-primary-light hover:shadow-md
  active:bg-primary-dark active:scale-[0.98]
  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
  disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none
  transition-all duration-150 ease-in-out
  cursor-pointer
"

// Secondary actions (Mask Trace, Refresh)
className="
  px-6 py-3
  bg-white text-neutral-700 border border-neutral-300
  rounded-lg font-semibold text-sm
  shadow-sm
  hover:bg-neutral-50 hover:border-neutral-400
  active:bg-neutral-100 active:scale-[0.98]
  focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2
  disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
  transition-all duration-150 ease-in-out
  cursor-pointer
"

// Destructive actions (Delete, Disconnect)
className="
  px-6 py-3
  bg-danger text-white
  rounded-lg font-semibold text-sm
  shadow-sm
  hover:bg-red-700 hover:shadow-md
  active:bg-red-800 active:scale-[0.98]
  focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2
  disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none
  transition-all duration-150 ease-in-out
  cursor-pointer
"
```

**Remove Grayscale Filter:**
```tsx
// Current (problematic)
disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]

// Recommended (clearer)
disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none
```

**Icon Buttons (Zoom controls):**
```tsx
// Current: Generic hover effect
<button className="w-8 h-8 p-1 border border-gray-300 bg-white rounded
  hover:bg-blue-600 hover:text-white hover:border-blue-600">

// Recommended: More refined interaction
<button className="
  w-9 h-9
  flex items-center justify-center
  bg-white border border-neutral-300
  rounded-lg
  text-neutral-700
  hover:bg-primary hover:text-white hover:border-primary
  active:bg-primary-dark active:scale-95
  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
  transition-all duration-150
  cursor-pointer
">
  <PlusIcon className="w-5 h-5" />
</button>
```

---

### 5. COMPONENT-SPECIFIC IMPROVEMENTS

#### WorkflowStepper

**Current Issues:**
- Steps appear small and hard to read
- Progress line is subtle
- Color coding could be clearer

**Recommendations:**
```tsx
// Larger, more prominent steps
<div className="w-10 h-10 rounded-full ...">  {/* was w-8 h-8 */}

// Stronger progress line
<div className="absolute top-5 left-0 right-0 h-1 bg-blue-900/20" ...>  {/* was h-0.5 */}
<div className="... h-1 bg-blue-100 ..." ...>  {/* was h-0.5 */}

// Better color contrast for text
<div className={`text-sm font-bold ${isCurrent ? 'text-white' : isComplete ? 'text-blue-50' : 'text-blue-200'}`}>
```

#### MachineConnection

**Current Issues:**
- Status badge colors defined inline
- Machine info grid could be more scannable
- Auto-refresh indicator too subtle

**Recommendations:**
```tsx
// Status badge with better visual weight
<span className={`
  inline-flex items-center gap-2
  px-3.5 py-2
  rounded-lg
  font-semibold text-sm
  border border-current/20
  ${statusBadgeColors[stateVisual.color]}
`}>

// Clearer machine info layout
<div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-3 mb-4">
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium text-neutral-600">Model:</span>
    <span className="text-base font-bold text-neutral-900">{machineInfo.modelNumber}</span>
  </div>
  ...
</div>

// More prominent auto-refresh indicator
<span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-xs font-medium text-blue-700 border border-blue-200">
  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
  Auto-refreshing
</span>
```

#### ProgressMonitor - Color Blocks

**Current Issues:**
- Current block indication could be stronger
- Progress bar within block is small
- Thread color swatches are small

**Recommendations:**
```tsx
// Larger thread color swatches
<div
  className="w-6 h-6 rounded-md border-2 border-white shadow-md ring-1 ring-neutral-300 flex-shrink-0"  {/* was w-5 h-5 */}
  style={{ backgroundColor: block.threadHex }}
/>

// Stronger current block highlighting
<div className={`
  p-3 rounded-lg border-2 transition-all
  ${isCompleted ? 'border-success bg-success-bg' : ''}
  ${isCurrent ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20' : ''}
  ${!isCompleted && !isCurrent ? 'border-neutral-200 bg-neutral-50 opacity-70' : ''}
`}>

// More prominent block progress bar
<div className="mt-2 h-1.5 bg-neutral-200 rounded-full overflow-hidden">  {/* was h-1 */}
  <div
    className="h-full bg-primary transition-all duration-300"
    style={{ width: `${blockProgress}%` }}
  />
</div>
```

#### NextStepGuide

**Current Issues:**
- Good overall, but could use better visual differentiation between states
- Icon size could be more prominent

**Recommendations:**
```tsx
// Larger, more prominent icon
<InformationCircleIcon className="w-10 h-10 text-blue-600 flex-shrink-0" />  {/* was w-8 h-8 */}

// Add subtle shadow for depth
<div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg shadow-md">

// Enhance list item styling
<ul className="list-disc list-inside text-sm text-blue-800 space-y-2 ml-1">
  <li className="pl-1"><strong>Press the button...</strong></li>
</ul>
```

#### PatternCanvas

**Current Issues:**
- Overlays could be more cohesive in styling
- Zoom controls could be grouped better
- Pattern offset indicator is cluttered

**Recommendations:**
```tsx
// Unified overlay styling
<div className="absolute top-3 left-3 bg-white/98 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-neutral-200 z-10 max-w-[180px]">

// Grouped zoom controls with better spacing
<div className="absolute bottom-5 right-5 flex items-center gap-1 bg-white/98 backdrop-blur-sm px-2 py-2 rounded-xl shadow-lg border border-neutral-200 z-10">
  <button className="...">...</button>
  <div className="w-px h-6 bg-neutral-200 mx-1"></div>  {/* Separator */}
  <span className="px-3 text-sm font-semibold text-neutral-900">{zoom}%</span>
  <div className="w-px h-6 bg-neutral-200 mx-1"></div>
  <button className="...">...</button>
  <button className="...">...</button>
</div>

// Cleaner pattern offset display
<div className="absolute bottom-24 right-5 bg-white/98 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-neutral-200 z-10">
  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Position</div>
  <div className="text-sm font-bold text-primary">
    X: {x}mm  Y: {y}mm
  </div>
</div>
```

---

### 6. ACCESSIBILITY IMPROVEMENTS

#### Current Issues
- Missing focus states on some interactive elements
- Color-only state indication (color blocks)
- Small touch targets (zoom buttons: 32px)
- No keyboard navigation for canvas
- Some contrast ratios below WCAG AA

#### Recommendations

**Focus States:**
```tsx
// Add visible focus rings to all interactive elements
focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
```

**Touch Targets:**
```tsx
// Minimum 44px × 44px for buttons
<button className="min-w-[44px] min-h-[44px] ...">
```

**Color Block Accessibility:**
```tsx
// Add patterns/icons in addition to colors
{isCompleted && <CheckCircleIcon className="w-5 h-5 text-success" />}
{isCurrent && <ArrowRightIcon className="w-5 h-5 text-primary animate-pulse" />}
{!isCompleted && !isCurrent && <CircleStackIcon className="w-5 h-5 text-neutral-400" />}
```

**Contrast Improvements:**
```tsx
// Current: text-blue-300 on blue-700 background (low contrast)
<div className="text-blue-300">

// Recommended: Better contrast
<div className="text-blue-100">
```

**ARIA Labels:**
```tsx
<button
  onClick={handleZoomIn}
  aria-label="Zoom in on pattern preview"
  title="Zoom In"
>
  <PlusIcon className="w-5 h-5" />
</button>
```

---

### 7. INFORMATION DENSITY & WHITESPACE

#### Current Issues
- FileUpload pattern info feels cramped
- ProgressMonitor tries to show too much in limited space
- Some cards have excessive padding while others are tight

#### Recommendations

**FileUpload - Pattern Information:**
```tsx
// Current: Everything in one gray box
<div className="bg-gray-50 p-4 rounded-lg space-y-3">

// Recommended: Use grid for better scannability
<div className="grid grid-cols-2 gap-3">
  <div className="bg-white p-3 rounded-lg border border-neutral-200">
    <div className="text-xs text-neutral-500 mb-1">File Name</div>
    <div className="font-semibold text-sm text-neutral-900 truncate">{fileName}</div>
  </div>
  <div className="bg-white p-3 rounded-lg border border-neutral-200">
    <div className="text-xs text-neutral-500 mb-1">Size</div>
    <div className="font-semibold text-sm text-neutral-900">{size} mm</div>
  </div>
  <div className="bg-white p-3 rounded-lg border border-neutral-200">
    <div className="text-xs text-neutral-500 mb-1">Colors</div>
    <div className="font-semibold text-sm text-neutral-900">{colors}</div>
  </div>
  <div className="bg-white p-3 rounded-lg border border-neutral-200">
    <div className="text-xs text-neutral-500 mb-1">Stitches</div>
    <div className="font-semibold text-sm text-neutral-900">{stitches}</div>
  </div>
</div>
```

**Consistent Card Padding:**
```tsx
// Standard card wrapper
<div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
```

---

### 8. PROGRESS & LOADING STATES

#### Current Issues
- Upload progress bar has nice shimmer effect, but sewing progress bar doesn't
- Loading states (file loading, Python initialization) could be more engaging
- No skeleton states for loading content

#### Recommendations

**Consistent Progress Bars:**
```tsx
// Unified progress bar component style
<div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
  <div
    className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300 ease-out relative overflow-hidden"
    style={{ width: `${progress}%` }}
  >
    {/* Shimmer effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
  </div>
</div>
```

**Loading Spinner Component:**
```tsx
// Create reusable loading indicator
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      border-primary border-t-transparent
      rounded-full
      animate-spin
    `} />
  );
}

// Use in FileUpload
{isLoading && (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="sm" />
    <span>Loading pattern...</span>
  </div>
)}
```

---

### 9. RESPONSIVE DESIGN ENHANCEMENTS

#### Current Issues
- Two-column layout breaks to single column on mobile (good)
- WorkflowStepper text becomes very small on narrow screens
- Color blocks in ProgressMonitor could stack better on mobile

#### Recommendations

**WorkflowStepper Mobile Optimization:**
```tsx
// Simplify on small screens
<div className="hidden sm:block text-sm font-bold">{step.label}</div>
<div className="sm:hidden text-[10px] font-bold">{step.id}</div>
```

**ProgressMonitor Responsive Grid:**
```tsx
// Better mobile stacking
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
  {/* Color blocks: scrollable on mobile */}
  <div className="lg:max-h-none max-h-[300px] overflow-y-auto">
    {/* Color blocks */}
  </div>
</div>
```

---

## Implementation Priority

### Phase 1: Foundation (High Impact, Low Effort)
1. Establish semantic color tokens
2. Standardize typography scale
3. Update button states and remove grayscale filter
4. Add focus states for accessibility
5. Improve touch target sizes

### Phase 2: Polish (High Impact, Medium Effort)
1. Refine WorkflowStepper visual prominence
2. Enhance color block design in ProgressMonitor
3. Improve PatternCanvas overlay cohesion
4. Standardize component spacing
5. Update status badge styling

### Phase 3: Enhancement (Medium Impact, Medium Effort)
1. Create reusable button component variants
2. Refine FileUpload information display
3. Add consistent loading states
4. Improve responsive behavior
5. Add subtle animations and transitions

### Phase 4: Advanced (Nice to Have)
1. Dark mode support
2. Custom theme configuration
3. Animation performance optimization
4. Advanced accessibility features (keyboard nav for canvas)
5. User preference persistence

---

## Code Examples: Key Component Updates

### Example 1: Updated MachineConnection Button

**Before:**
```tsx
<button
  onClick={onConnect}
  className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3] cursor-pointer"
>
  Connect to Machine
</button>
```

**After:**
```tsx
<button
  onClick={onConnect}
  className="
    px-6 py-3
    bg-primary text-white
    rounded-lg font-semibold text-sm
    shadow-sm
    hover:bg-primary-light hover:shadow-md hover:scale-[1.02]
    active:bg-primary-dark active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
    disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none
    transition-all duration-150 ease-in-out
    cursor-pointer
  "
  aria-label="Connect to Brother embroidery machine via Bluetooth"
>
  Connect to Machine
</button>
```

### Example 2: Updated Color Block Design

**Before:**
```tsx
<div className={`p-2 rounded bg-gray-100 border-2 border-transparent transition-all ${
  isCompleted ? 'border-green-600 bg-green-50' :
  isCurrent ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/20' :
  'opacity-60'
}`}>
```

**After:**
```tsx
<div className={`
  p-3 rounded-lg border-2 transition-all duration-200
  ${isCompleted ? 'border-success bg-success-bg/50 shadow-sm' : ''}
  ${isCurrent ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20 scale-[1.02]' : ''}
  ${!isCompleted && !isCurrent ? 'border-neutral-200 bg-neutral-50 opacity-70' : ''}
`}>
  <div className="flex items-center gap-3">  {/* increased gap */}
    <div
      className="w-6 h-6 rounded-md border-2 border-white shadow-md ring-1 ring-neutral-300 flex-shrink-0"
      style={{ backgroundColor: block.threadHex }}
      aria-label={`Thread color ${block.threadHex}`}
    />
    <span className="font-semibold text-sm flex-1">Thread {block.colorIndex + 1}</span>
    {isCompleted && <CheckCircleIcon className="w-5 h-5 text-success" aria-label="Completed" />}
    {isCurrent && <ArrowRightIcon className="w-5 h-5 text-primary" aria-label="Current" />}
    {!isCompleted && !isCurrent && <CircleStackIcon className="w-5 h-5 text-neutral-400" aria-label="Upcoming" />}
    <span className="text-sm text-neutral-600 font-medium">{block.stitchCount.toLocaleString()}</span>
  </div>
  {isCurrent && (
    <div className="mt-2.5 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${blockProgress}%` }}
        role="progressbar"
        aria-valuenow={blockProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )}
</div>
```

---

## Accessibility Checklist

- [ ] All interactive elements have minimum 44×44px touch targets
- [ ] Focus states visible on all focusable elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Status information not conveyed by color alone
- [ ] All icons have appropriate aria-labels or titles
- [ ] Form inputs have associated labels
- [ ] Loading states announced to screen readers
- [ ] Keyboard navigation works for all controls
- [ ] Error messages are clear and actionable
- [ ] Progress bars have appropriate ARIA attributes

---

## Design System Assets Needed

### Typography
- Font stack: System UI fonts (already handled by Tailwind)
- Defined text sizes and line heights
- Consistent font weights (400, 500, 600, 700)

### Colors
- Semantic color palette with design tokens
- Status color mapping
- Neutral grays for backgrounds and borders

### Spacing
- Standardized padding scale (4px increments)
- Consistent gap/margin values
- Section spacing guidelines

### Components
- Button variants (primary, secondary, danger, ghost)
- Card/panel styles
- Badge/tag styles
- Progress indicators
- Loading states
- Alert/notification styles

### Icons
- Heroicons (already in use)
- Consistent sizing (w-4, w-5, w-6, w-8)
- Proper color inheritance

---

## Conclusion

The SKiTCH Controller has a solid UI foundation but would benefit significantly from:

1. **Systematic color usage** - Define semantic tokens, apply consistently
2. **Stronger visual hierarchy** - Clearer typography, better spacing
3. **Better interaction feedback** - Refined button states, remove grayscale filter
4. **Enhanced accessibility** - Focus states, touch targets, ARIA labels
5. **Polished details** - Consistent component styling, unified overlays

These improvements will create a more professional, usable, and accessible application while maintaining the compact, efficient design suitable for technical users.

The recommended changes are incremental and can be implemented in phases, starting with the high-impact, low-effort foundational improvements and progressing to more advanced enhancements.
