import type { ReactNode } from 'react';

type WorkspaceSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  headingLevel?: 'h1' | 'h2';
  isLast?: boolean;
  'aria-label'?: string;
};

export function WorkspaceSection({
  title,
  description,
  actions,
  children,
  headingLevel = 'h2',
  isLast = false,
  'aria-label': ariaLabel,
}: WorkspaceSectionProps) {
  const Heading = headingLevel;

  return (
    <section
      className={`px-4 py-5 sm:px-6 sm:py-6 ${isLast ? '' : 'border-b border-border'}`}
      aria-label={ariaLabel}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Heading className="text-base font-semibold tracking-tight">{title}</Heading>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
