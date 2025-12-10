# Respira Typography System

## Current Problems
❌ 12 different font sizes including arbitrary values (7px, 9px, 10px, 11px, 13px)
❌ Inconsistent hierarchy - unclear when to use which size
❌ Poor accessibility - text as small as 7px
❌ Responsive scaling is inconsistent

## New Typography System (Tailwind Classes Only)

### **5-Level Hierarchy**

```
Level        Desktop (lg:)     Mobile/Tablet      Weight           Usage
─────────────────────────────────────────────────────────────────────────────────
Display      text-xl (20px)    text-lg (18px)     font-bold        App title, page headers
Heading      text-lg (18px)    text-base (16px)   font-semibold    Section titles, dialogs
Subheading   text-sm (14px)    text-sm (14px)     font-semibold    Card titles
Body         text-sm (14px)    text-sm (14px)     font-medium      Content, buttons
Label        text-xs (12px)    text-xs (12px)     font-medium      Metadata, helpers, tags
```

**Key Decisions:**
- ✅ **No custom pixel sizes** - only Tailwind standards
- ✅ **Minimum 12px** - text-xs (12px) is the smallest size (accessible)
- ✅ **Body = text-sm** - 14px is optimal for reading and touch targets
- ✅ **Consistent responsive** - most don't need breakpoints except Display/Heading

### **Font Weight System**
```
Display:     font-bold (700)      - Maximum emphasis
Heading:     font-semibold (600)  - Section headers
Subheading:  font-semibold (600)  - Card/component titles
Body:        font-medium (500)    - Interactive elements (buttons)
Body:        font-normal (400)    - Static text
Label:       font-medium (500)    - Small but important
Label:       font-normal (400)    - Decorative/secondary
```

---

## Component Mapping

### **App.tsx**
| Element | Old | New |
|---------|-----|-----|
| "Respira" title | text-lg | text-xl lg:text-xl (Display) |
| Serial number | text-sm | text-xs (Label) |
| "Not Connected" | text-sm | text-xs (Label) |
| Disconnect button | text-xs | text-sm (Body) |
| Status badge | text-xs | text-xs (Label) |
| Error message | text-sm | text-sm (Body) |
| "Pattern Preview" h2 | text-xl | text-lg lg:text-lg (Heading) |
| Empty state title | text-xl | text-lg (Heading) |
| Empty state body | text-sm | text-sm (Body) |
| Feature indicators | text-xs | text-xs (Label) |

### **FileUpload.tsx**
| Element | Old | New |
|---------|-----|-----|
| "Pattern File" title | text-sm | text-sm font-semibold (Subheading) |
| Filename | text-xs | text-xs (Label) |
| Stats labels | text-xs | text-xs (Label) |
| Button text | text-xs | text-sm (Body) |
| "Colors:" label | text-xs | text-xs (Label) |
| Error messages | text-xs | text-sm (Body) |
| Upload progress | text-xs | text-xs (Label) |
| **Remove:** text-[7px] badge → text-xs |

### **PatternCanvas.tsx**
| Element | Old | New |
|---------|-----|-----|
| "Pattern Preview" | text-sm | text-sm font-semibold (Subheading) |
| Dimensions | text-xs | text-xs (Label) |
| "Colors" header | text-[10px] sm:text-xs | text-xs (Label) |
| Color labels | text-[10px] sm:text-[11px] | text-xs (Label) |
| Thread metadata | text-[9px] | text-xs (Label) |
| "Pattern Position" | text-[10px] sm:text-[11px] | text-xs (Label) |
| "LOCKED" badge | text-[9px] sm:text-[10px] | text-xs (Label) |
| Coordinates (X/Y) | text-[11px] sm:text-[13px] | text-sm (Body) |
| Help text | text-[9px] sm:text-[10px] | text-xs (Label) |
| Zoom % | text-[11px] sm:text-[13px] | text-sm (Body) |

### **ProgressMonitor.tsx**
| Element | Old | New |
|---------|-----|-----|
| "Progress" title | text-sm | text-sm font-semibold (Subheading) |
| Block labels | text-xs | text-xs (Label) |
| Stitch counts | text-xs | text-xs (Label) |
| Button text | text-xs | text-sm (Body) |

### **WorkflowStepper.tsx**
| Element | Old | New |
|---------|-----|-----|
| Step numbers | text-[10px] lg:text-xs | text-xs (Label) |
| Step labels | text-[10px] lg:text-xs | text-xs (Label) |

### **NextStepGuide.tsx**
| Element | Old | New |
|---------|-----|-----|
| Step titles | text-lg | text-lg sm:text-base (Heading) |
| Instructions | text-sm | text-sm (Body) |
| Error codes | text-xs | text-xs font-mono (Label) |

### **PatternSummaryCard.tsx**
| Element | Old | New |
|---------|-----|-----|
| "Active Pattern" | text-sm | text-sm font-semibold (Subheading) |
| Filename | text-xs | text-xs (Label) |
| Stats | text-xs | text-xs (Label) |
| Button text | text-xs | text-sm (Body) |
| **Remove:** text-[7px] badge → text-xs |

### **MachineConnection.tsx**
| Element | Old | New |
|---------|-----|-----|
| Card titles | text-sm | text-sm font-semibold (Subheading) |
| Helper text | text-xs | text-xs (Label) |
| Button text | text-xs | text-sm (Body) |
| Error details | text-[10px] | text-xs (Label) |

### **ConfirmDialog.tsx**
| Element | Old | New |
|---------|-----|-----|
| Dialog title | text-xl | text-lg (Heading) |
| Button text | text-sm | text-sm (Body) |

### **BluetoothDevicePicker.tsx**
| Element | Old | New |
|---------|-----|-----|
| Dialog title | text-xl | text-lg (Heading) |
| Device names | text-sm | text-sm (Body) |
| Device IDs | text-xs | text-xs (Label) |
| Button text | text-sm | text-sm (Body) |

---

## Benefits

✅ **5 sizes only** - Down from 12 (much cleaner)
✅ **Standard Tailwind** - No custom pixel values
✅ **Accessible** - Minimum 12px (text-xs)
✅ **Touch-friendly** - Buttons use text-sm (14px)
✅ **Clear hierarchy** - Semantic naming (Display → Heading → Subheading → Body → Label)
✅ **Easy to maintain** - Standard classes everyone knows
✅ **Consistent responsive** - Only Display and Heading scale down

---

## Implementation Rules

### **When to use each level:**

**Display (text-xl/text-lg)** - Only for:
- Main app title ("Respira")
- Top-level page headers

**Heading (text-lg/text-base)** - For:
- Section headers ("Pattern Preview", "Step 1: Connect")
- Dialog titles
- Empty state titles
- Major workflow steps

**Subheading (text-sm semibold)** - For:
- Card component titles ("Pattern File", "Active Pattern", "Progress")
- Sub-section headers within cards

**Body (text-sm)** - For:
- Primary readable content
- Button labels (interactive!)
- Error messages
- Instructions and descriptions
- Input fields

**Label (text-xs)** - For:
- Metadata (filenames, dimensions, stitch counts)
- Field labels ("Size:", "Stitches:", "Colors:")
- Status badges
- Helper text
- Timestamps
- Tags and small indicators

---

## Responsive Strategy

**Most text doesn't need responsive variants:**
- Body (text-sm) stays the same
- Label (text-xs) stays the same
- Subheading (text-sm) stays the same

**Only top-level headers scale:**
- Display: `text-lg lg:text-xl` (18px → 20px)
- Heading: `text-base lg:text-lg` (16px → 18px)

This creates a subtle hierarchy shift on desktop without fragmenting the system.
