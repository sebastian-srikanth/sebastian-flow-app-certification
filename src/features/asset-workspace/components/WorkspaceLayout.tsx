import type { ReactNode } from 'react';

type WorkspaceShellProps = {
  children: ReactNode;
};

type WorkspaceContainerProps = {
  children: ReactNode;
};

type WorkspaceSurfaceProps = {
  children: ReactNode;
  'aria-label'?: string;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return <main className="min-h-screen bg-muted/50 text-foreground">{children}</main>;
}

export function WorkspaceContainer({ children }: WorkspaceContainerProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
  );
}

export function WorkspaceSurface({ children, 'aria-label': ariaLabel }: WorkspaceSurfaceProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
