import { Sparkles } from 'lucide-react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { cn } from '@/lib/utils';

/** Every lucide icon name (kebab-case). Icons themselves load lazily, one small chunk each. */
export const ALL_ICON_NAMES: readonly IconName[] = iconNames;
const NAME_SET = new Set<string>(iconNames);

/** "BookOpen" / "book_open" / " book-open " → "book-open" */
export function normalizeIconName(name: string | null | undefined): IconName | null {
  if (!name) return null;
  const kebab = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  return NAME_SET.has(kebab) ? (kebab as IconName) : null;
}

/** Renders an amenity's stored lucide name (e.g. "wifi"), falling back to Sparkles. */
export function AmenityIcon({ icon, className, strokeWidth }: { icon: string | null | undefined; className?: string; strokeWidth?: number }) {
  const name = normalizeIconName(icon);
  if (!name) return <Sparkles className={className} strokeWidth={strokeWidth} aria-hidden />;
  return (
    <DynamicIcon
      name={name}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden
      fallback={() => <span className={cn('inline-block', className)} aria-hidden />}
    />
  );
}

/** Curated icons offered first in the picker; any lucide name can still be searched. */
export const SUGGESTED_AMENITY_ICONS: IconName[] = (
  [
    'wifi',
    'snowflake',
    'fan',
    'plug',
    'battery-charging',
    'lock',
    'coffee',
    'utensils',
    'droplets',
    'car',
    'bike',
    'book-open',
    'library',
    'newspaper',
    'printer',
    'lamp-desk',
    'lightbulb',
    'armchair',
    'sofa',
    'cctv',
    'shield-check',
    'bath',
    'accessibility',
    'volume-x',
    'clock',
    'tv',
    'monitor',
    'headphones',
    'heart-pulse',
    'trees',
  ] as string[]
).filter((n): n is IconName => NAME_SET.has(n));
