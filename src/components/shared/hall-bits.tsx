import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { HallImage, OperatingHours } from '@/lib/api/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

export function sortImages(images: HallImage[] | null | undefined) {
  return [...(images ?? [])].sort((a, b) => Number(b.cover) - Number(a.cover) || a.displayOrder - b.displayOrder);
}

export function CoverImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/10 text-muted-foreground', className)}>
        <ImageOff className="size-6 opacity-60" aria-hidden />
        <span className="sr-only">No image</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
}

export function ImageGallery({ images, name }: { images: HallImage[] | null | undefined; name: string }) {
  const sorted = sortImages(images);
  const [open, setOpen] = useState<number | null>(null);
  if (!sorted.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
        <ImageOff className="size-5" aria-hidden />
        No photos uploaded
      </div>
    );
  }
  const current = open !== null ? sorted[open] : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sorted.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            className={cn(
              'group relative cursor-pointer overflow-hidden rounded-xl border focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
              i === 0 && 'col-span-2 row-span-2',
            )}
          >
            <CoverImage src={img.url} alt={img.caption ?? `${name} photo ${i + 1}`} className="aspect-[4/3] size-full transition-transform duration-300 group-hover:scale-[1.03]" />
            {img.cover && <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>}
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl gap-3 p-3">
          <DialogTitle className="sr-only">{name} photos</DialogTitle>
          {current && (
            <>
              <div className="relative overflow-hidden rounded-xl bg-black">
                <img src={current.url} alt={current.caption ?? name} className="mx-auto max-h-[70dvh] object-contain" />
                {sorted.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => setOpen((o) => (o === null ? 0 : (o - 1 + sorted.length) % sorted.length))}
                      className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => setOpen((o) => (o === null ? 0 : (o + 1) % sorted.length))}
                      className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
                <span>{current.caption ?? ' '}</span>
                <span className="tabular">
                  {(open ?? 0) + 1} / {sorted.length}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const DAYS: OperatingHours['dayOfWeek'][] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function HoursTable({ hours }: { hours: OperatingHours[] | null | undefined }) {
  if (!hours?.length) return <p className="text-sm text-muted-foreground">Operating hours have not been set.</p>;
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Operating hours</caption>
      <tbody>
        {DAYS.map((d) => {
          const h = byDay.get(d);
          const closed = !h || h.closed;
          return (
            <tr key={d} className="border-b last:border-0">
              <th scope="row" className="py-2 text-left font-medium">
                {d.charAt(0) + d.slice(1, 3).toLowerCase()}
              </th>
              <td className={cn('py-2 text-right tabular', closed && 'text-destructive')}>
                {closed ? 'Closed' : `${formatClock(h!.openTime)} – ${formatClock(h!.closeTime)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** OpenStreetMap embed — only rendered when the hall has real coordinates. */
export function HallMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const d = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div className="overflow-hidden rounded-xl border">
      <iframe title={`Map of ${label}`} src={src} loading="lazy" className="h-64 w-full border-0" referrerPolicy="no-referrer" />
      <div className="flex items-center justify-between border-t bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="font-mono tabular">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <a
          className="text-primary hover:underline"
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open larger map
        </a>
      </div>
    </div>
  );
}
