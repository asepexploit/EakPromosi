import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

/** Shimmer placeholder — uses the global `.skeleton` utility from tailwind.css. */
export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={cn('skeleton', className)} aria-hidden />;
}
