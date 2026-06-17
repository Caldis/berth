/**
 * berth shared UI layer (GH-105).
 *
 * THE single import surface for design-system primitives. Pages and domain
 * composites import from `@/components/ui` — never from `@heroui/react`
 * directly — so component behavior/styling stays centralized and swappable
 * (user requirement: a consistent shared component directory, not per-page
 * one-offs). HeroUI primitives are re-exported here; berth-specific composites
 * (semantic Chip, motion tokens, …) live alongside them.
 */

// ── HeroUI primitives (re-exported as berth's canonical primitives) ──
export {
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Select,
  SelectItem,
  SelectSection,
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection,
  Tabs,
  Tab,
  Switch,
  Slider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  Badge,
  Avatar,
  AvatarGroup,
  Accordion,
  AccordionItem,
  Skeleton,
  Spinner,
  Progress,
  Listbox,
  ListboxItem,
  ListboxSection,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Kbd,
  Alert,
  Divider,
  ScrollShadow
} from '@heroui/react'

// ── berth composites & tokens ──
export { Button } from './button'
export type { ButtonProps } from './button'
export { Chip } from './chip'
export type { ChipTone, ChipUIProps } from './chip'
export { FilterSelect } from './filter-select'
export type { FilterSelectProps } from './filter-select'
export { MOTION, TRANSITION, fadeRise, ACCORDION_MOTION_PROPS } from './motion'
export { Collapsible, CollapsibleChevron } from './collapsible'
export type { CollapsibleProps } from './collapsible'
