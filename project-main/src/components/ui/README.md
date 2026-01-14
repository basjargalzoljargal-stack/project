# UI Component Library

A comprehensive, fully-typed UI component library built with React, TypeScript, and Tailwind CSS.

## Components

### Button

A versatile button component with multiple variants, sizes, and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `loading`: boolean (default: false)
- `fullWidth`: boolean (default: false)
- `disabled`: boolean

**Example:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>
```

### Input

A feature-rich input component with label, error states, icons, and validation.

**Props:**
- `label`: string (optional)
- `error`: string (optional)
- `success`: boolean (default: false)
- `leftIcon`: ReactNode (optional)
- `rightIcon`: ReactNode (optional)
- `helperText`: string (optional)
- `type`: 'text' | 'email' | 'password' | 'number' | 'date' (default: 'text')

**Example:**
```tsx
import { Input } from '@/components/ui';
import { Mail } from 'lucide-react';

<Input
  label="Email"
  type="email"
  leftIcon={<Mail className="h-5 w-5" />}
  error="Invalid email address"
  helperText="We'll never share your email"
/>
```

### Modal

A flexible modal dialog with backdrop blur, keyboard controls, and animations.

**Props:**
- `isOpen`: boolean (required)
- `onClose`: () => void (required)
- `title`: string (optional)
- `children`: ReactNode (required)
- `footer`: ReactNode (optional)
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `closeOnBackdrop`: boolean (default: true)
- `closeOnEscape`: boolean (default: true)
- `showCloseButton`: boolean (default: true)

**Example:**
```tsx
import { Modal, Button } from '@/components/ui';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmation"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### Card

A container component with optional header, footer, and various styling options.

**Props:**
- `header`: ReactNode (optional)
- `footer`: ReactNode (optional)
- `children`: ReactNode (required)
- `shadow`: 'none' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `border`: 'none' | 'light' | 'medium' | 'heavy' (default: 'light')
- `padding`: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
- `hoverable`: boolean (default: false)

**Example:**
```tsx
import { Card, Button } from '@/components/ui';

<Card
  header={<h3 className="text-lg font-semibold">Card Title</h3>}
  footer={<Button fullWidth>Action</Button>}
  shadow="lg"
  hoverable
>
  <p>Card content goes here</p>
</Card>
```

### Badge

A small status indicator or label component with multiple colors and sizes.

**Props:**
- `color`: 'green' | 'yellow' | 'red' | 'blue' | 'gray' (default: 'gray')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `dot`: boolean (default: false)
- `children`: ReactNode (required)

**Example:**
```tsx
import { Badge } from '@/components/ui';

<Badge color="green" dot>Active</Badge>
<Badge color="yellow" size="lg">Warning</Badge>
<Badge color="red">Error</Badge>
```

## Usage

Import components individually or all at once:

```tsx
// Individual imports
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Import from index
import { Button, Input, Modal, Card, Badge } from '@/components/ui';
```

## Features

- **Fully Typed**: All components include comprehensive TypeScript interfaces
- **Accessible**: Built with ARIA attributes and keyboard navigation support
- **Customizable**: Extensive prop options for styling and behavior
- **Responsive**: Mobile-first design with Tailwind CSS
- **Modern**: Uses React hooks and forwardRef for ref forwarding
- **Animations**: Smooth transitions and hover effects

## Accessibility

All components follow accessibility best practices:
- Proper ARIA attributes
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management
- Screen reader support
- Semantic HTML

## Dependencies

- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- lucide-react (for icons in Modal component)
