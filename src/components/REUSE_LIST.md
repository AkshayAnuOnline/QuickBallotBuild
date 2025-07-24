# QuickBallot Reusable UI Components & Patterns

This document lists all reusable UI components and patterns created for QuickBallot. Use these for consistency and efficiency in all future pages and features.

---

## 1. PageBG
**Purpose:**
- Provides the default background and foreground for every page.
- Ensures all pages have a consistent look.

**Usage:**
```tsx
import PageBG from './PageBG';

<PageBG>
  {/* Your page content here */}
</PageBG>
```

---

## 2. GradientButton1
**Purpose:**
- Reusable premium gradient button (used for "Create Organization" in Home).
- Use for any primary action that needs to stand out.

**Usage:**
```tsx
import GradientButton1 from './GradientButton1';

<GradientButton1 onClick={...}>
  <span className="btn-icon material-icons">add</span>
  <span className="btn-text">Create New Organization</span>
</GradientButton1>
```

---

## 3. Button1
**Purpose:**
- Reusable button for actions like "Select Organizations" in Home.
- Use for secondary or outline actions.

**Usage:**
```tsx
import Button1 from './Button1';

<Button1 onClick={...}>
  Select Organizations
</Button1>
```

---

## 4. OrgCardContainer
**Purpose:**
- Reusable container for organization cards (applies the correct card style).
- Use to wrap organization-related content or grids.

**Usage:**
```tsx
import OrgCardContainer from './OrgCardContainer';

<OrgCardContainer>
  {/* Organization grid or content here */}
</OrgCardContainer>
```

---

## 5. CardWithCheckbox
**Purpose:**
- Reusable individual organization card with all features: selection mode, checkbox, logo, name, stats, and click-to-select.
- Use for each organization in a grid or list.

**Props:**
- `name: string` — Organization name
- `logo?: File | string` — Logo file or URL
- `electionCount: number` — Number of elections
- `selected: boolean` — Whether the card is selected
- `selectionMode: boolean` — Whether selection mode is active
- `onSelect: () => void` — Handler for selection toggle

**Usage:**
```tsx
import CardWithCheckbox from './CardWithCheckbox';

<CardWithCheckbox
  name="St. Mary's School"
  logo={logoFileOrUrl}
  electionCount={3}
  selected={true}
  selectionMode={true}
  onSelect={() => ...}
/>
```

---

## 6. PopupContainer
**Purpose:**
- Reusable container for premium modal/popup content (matches AddOrganizationModal style).
- Use to wrap popup/modal content for consistent look.

**Usage:**
```tsx
import PopupContainer from './PopupContainer';

<PopupContainer>
  {/* Modal or popup content here */}
</PopupContainer>
```

---

## How to Add More
- When you create a new reusable component or pattern, add it to this list with a description and usage example.
- Always use these components in new features/pages for consistency.

---

**Tip:**
Keep this file up to date as your design system grows! 