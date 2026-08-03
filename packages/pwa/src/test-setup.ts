import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/preact';
import { toHaveNoViolations } from 'vitest-axe/matchers';

expect.extend({ toHaveNoViolations });

// Mock @dnd-kit/core for all tests
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: unknown }) => children,
  KeyboardSensor: class KeyboardSensor {},
  PointerSensor: class PointerSensor {},
  KeyboardCode: {
    Space: 'Space',
    Down: 'ArrowDown',
    Right: 'ArrowRight',
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Esc: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
  },
  closestCenter: () => null,
  defaultKeyboardCoordinateGetter: () => ({ x: 0, y: 0 }),
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
  CSS: {
    Translate: {
      toString: () => '',
    },
  },
}));

// Mock matchMedia for all tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
});
