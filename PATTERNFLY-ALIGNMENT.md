# PatternFly Design System Alignment

## Overview
The Storage Integration Dashboard has been redesigned to align with **PatternFly v5** design system - Red Hat's enterprise-grade design system for building consistent and accessible user interfaces.

## What is PatternFly?

PatternFly is Red Hat's open-source design system that provides:
- Reusable design patterns and components
- Accessibility built-in (WCAG 2.1 AA compliant)
- Consistent enterprise UX across Red Hat products
- Comprehensive design tokens and guidelines

Website: https://www.patternfly.org/

## Key Changes

### 1. **Design Tokens**
Replaced custom variables with PatternFly's global CSS variables:

**Color Palette:**
- `--pf-v5-global--palette--blue-400` → Primary blue (#06c)
- `--pf-v5-global--palette--green-400` → Success green
- `--pf-v5-global--palette--gold-400` → Warning gold
- `--pf-v5-global--palette--red-100` → Danger red
- `--pf-v5-global--palette--black-*` → Grayscale tokens

**Spacing:**
- `--pf-v5-global--spacer--xs` → 0.25rem (4px)
- `--pf-v5-global--spacer--sm` → 0.5rem (8px)
- `--pf-v5-global--spacer--md` → 1rem (16px)
- `--pf-v5-global--spacer--lg` → 1.5rem (24px)
- `--pf-v5-global--spacer--xl` → 2rem (32px)
- `--pf-v5-global--spacer--2xl` → 3rem (48px)
- `--pf-v5-global--spacer--3xl` → 4rem (64px)

**Typography:**
- Font families: RedHatText, RedHatDisplay, RedHatMono
- Font sizes: xs (0.75rem) → 4xl (2.25rem)
- Font weights: normal (400), bold (700)
- Line heights: sm (1.3), md (1.5)

**Borders:**
- Border widths: sm (1px), md (2px), lg (3px)
- Border radius: sm (3px), lg (6px)
- Border colors: 100 (light gray), 200 (medium gray)

**Shadows:**
- Box shadows: sm, md, lg, xl (following PatternFly elevation system)

### 2. **Component Alignment**

#### Buttons
- **Style:** PatternFly button component
- **Primary:** Blue background (#06c), white text
- **Secondary/Outline:** White background, gray border
- **States:** Hover (darker blue), active (inset shadow), focus (blue outline)
- **Spacing:** Consistent with PatternFly button padding

#### Navigation (Sidebar)
- **Style:** PatternFly vertical navigation
- **Active indicator:** Left blue border (3px) instead of full background
- **Hover state:** Light gray background
- **Font:** Normal weight, bold when active
- **Alignment:** PatternFly nav list pattern

#### Forms (Search & Filters)
- **Style:** PatternFly form controls
- **Border:** 1px solid gray, blue on hover/focus
- **Focus:** Inner blue shadow (inset) following PatternFly
- **Spacing:** Standard PatternFly form control spacing

#### Checkboxes
- **Style:** PatternFly checkbox component
- **Size:** 1.125rem (18px) - PatternFly standard
- **Border:** Medium gray, blue on hover
- **Checked:** Blue background with white checkmark
- **Focus:** Blue outline ring

#### Data Table
- **Style:** PatternFly table component
- **Header:** Light gray background, bold text, 2px bottom border
- **Rows:** White background, 1px gray bottom border
- **Hover:** Light gray background
- **Sticky header:** Positioned for scrolling tables

#### Cards (Data Section)
- **Style:** PatternFly card component
- **Border:** 1px solid gray with small shadow
- **Border radius:** 3px (PatternFly sm)
- **Header:** White background, separated with border

#### Alerts
- **Style:** PatternFly alert component
- **Border:** 3px left border with color indicator
- **Colors:** Red (danger), green (success)
- **Background:** Light tinted backgrounds

#### Status Badges
- **Style:** PatternFly label component
- **Shape:** Pill-shaped with full border radius (3rem)
- **Size:** xs font size with border
- **Colors:** Light backgrounds with colored borders and text

### 3. **Color System**

**Primary Colors (Blue):**
- 50: #e7f1fa (very light)
- 100: #bee1f4 (light)
- 400: #06c (primary - used for links, primary buttons)
- 500: #004080 (dark - used for hover states)

**Success (Green):**
- 50: #f3faf2 (background)
- 400: #5ba352
- 500: #3e8635 (primary success)

**Warning (Gold):**
- 50: #fdf7e7 (background)
- 400: #f0ab00 (primary warning)

**Danger (Red):**
- 50: #fdf2f2 (background)
- 100: #c9190b (primary danger)
- 200: #a30000 (dark danger)

**Grayscale (Black palette):**
- 100-300: Light grays (backgrounds, borders)
- 400-600: Medium grays (secondary text, borders)
- 700-900: Dark grays (primary text)

### 4. **Typography**

**Font Families:**
- **Text:** RedHatText (fallback: Overpass, sans-serif)
- **Headings:** RedHatDisplay
- **Monospace:** RedHatMono (for code, URLs)

**Size Scale:**
- xs: 0.75rem (12px) - Small labels, badges
- sm: 0.875rem (14px) - Secondary text
- md: 1rem (16px) - Body text (base)
- lg: 1.125rem (18px) - Large body
- xl: 1.25rem (20px) - H3
- 2xl: 1.5rem (24px) - H2
- 3xl: 1.875rem (30px) - H1
- 4xl: 2.25rem (36px) - Display

**Weights:**
- normal: 400 (body text, buttons)
- bold: 700 (headings, active states, table headers)

### 5. **Spacing System**

All spacing uses PatternFly's 8px-based scale:
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 16px (1rem) - Base unit
- lg: 24px (1.5rem)
- xl: 32px (2rem)
- 2xl: 48px (3rem)
- 3xl: 64px (4rem)

Applied to:
- Component padding/margins
- Gap between elements
- Section spacing
- Form control spacing

### 6. **Interactive States**

Following PatternFly interaction patterns:

**Focus:**
- 2px blue outline with 0.125rem offset
- Applied to all interactive elements
- High contrast for accessibility

**Hover:**
- Buttons: Darker background
- Links: Darker color + underline
- Inputs: Blue border
- Table rows: Light gray background
- Nav items: Light gray background

**Active:**
- Buttons: Inset shadow
- Nav items: Blue left border + bold text

**Disabled:**
- 50% opacity
- Cursor: not-allowed
- No hover effects

### 7. **Accessibility**

PatternFly-compliant accessibility features:
- ✅ WCAG 2.1 AA color contrast ratios
- ✅ Visible focus indicators on all interactive elements
- ✅ Keyboard navigation support
- ✅ Semantic HTML structure
- ✅ Reduced motion support (`prefers-reduced-motion`)
- ✅ Screen reader friendly (maintained structure)

### 8. **Responsive Design**

Breakpoints following PatternFly patterns:
- Desktop: Default (full sidebar, horizontal layout)
- Tablet (≤1200px): Narrower sidebar
- Mobile (≤768px): Stacked layout, horizontal tabs
- Small Mobile (≤480px): Optimized spacing, smaller fonts

### 9. **Component Patterns**

#### Page Header
- Follows PatternFly Page component pattern
- Sticky positioning
- Bottom border and subtle shadow
- Flex layout with actions on right

#### Sidebar Navigation
- Follows PatternFly vertical Nav pattern
- Active item indicated by left border
- Scrollable content area
- Collapsible sections ready

#### Data Table
- Follows PatternFly Table component
- Compact variant styling
- Sortable ready (structure supports)
- Responsive overflow

#### Form Controls
- Follows PatternFly Form component
- Consistent sizing across inputs
- Clear validation states ready
- Proper label associations

## Benefits of PatternFly Alignment

1. **Consistency:** Matches Red Hat product family UX
2. **Familiarity:** Users recognize patterns from other Red Hat products
3. **Accessibility:** Built-in WCAG compliance
4. **Maintainability:** Standard design tokens, easy updates
5. **Scalability:** Can easily add more PatternFly components
6. **Professional:** Enterprise-grade design system
7. **Documentation:** Extensive PatternFly docs available
8. **Future-proof:** Active development and Red Hat support

## PatternFly Components Ready to Use

The current styling aligns with these PatternFly components:
- ✅ Button
- ✅ Card
- ✅ Table
- ✅ Alert
- ✅ Nav (vertical)
- ✅ Form controls (input, select)
- ✅ Checkbox
- ✅ Label (status badges)
- ✅ Page header

## Next Steps (Optional Enhancements)

To further enhance PatternFly alignment:

1. **Install PatternFly React:**
   ```bash
   npm install @patternfly/react-core @patternfly/react-table
   ```

2. **Replace custom components with PatternFly React components:**
   - `<Button>` component
   - `<Table>` component
   - `<Nav>` component
   - `<Alert>` component

3. **Add PatternFly icons:**
   ```bash
   npm install @patternfly/react-icons
   ```

4. **Use PatternFly layouts:**
   - Page, PageSection
   - Sidebar, SidebarPanel
   - Stack, Split, Grid

## Visual Differences from Previous Design

| Aspect | Before | PatternFly |
|--------|--------|------------|
| Primary color | Red (#ee0000) | Blue (#06c) |
| Active nav | Red background | Blue left border |
| Button style | Modern rounded | Standard rectangular |
| Status badges | Gradient | Pill-shaped with border |
| Typography | Red Hat Text | RedHatText (official) |
| Shadows | 5 levels | 4 levels (PF standard) |
| Border radius | 4-12px | 3-6px (PF standard) |
| Focus outline | Red | Blue |

## Resources

- **PatternFly Website:** https://www.patternfly.org/
- **Components:** https://www.patternfly.org/components/
- **Design Tokens:** https://www.patternfly.org/tokens/
- **React Components:** https://www.patternfly.org/get-started/develop/
- **GitHub:** https://github.com/patternfly/patternfly
- **Figma Kit:** https://github.com/patternfly/patternfly-design-kit

## Testing Checklist

- [ ] Visual comparison with PatternFly showcase
- [ ] Test all interactive states (hover, focus, active)
- [ ] Verify color contrast meets WCAG AA
- [ ] Test keyboard navigation
- [ ] Test on mobile devices
- [ ] Verify responsive breakpoints
- [ ] Test with screen reader
- [ ] Check print styles

## Summary

This redesign brings the Storage Integration Dashboard into full alignment with PatternFly v5, Red Hat's enterprise design system. The application now uses PatternFly's design tokens, component patterns, and interaction models, ensuring consistency with the broader Red Hat product ecosystem while maintaining all existing functionality.
