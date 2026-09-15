import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenChild(): null {
  throw new Error('Render failed');
}

describe('AppErrorBoundary', () => {
  it('shows application fallback when a child throws during render', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <BrokenChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /Asset 360 couldn't load/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload application/i })).toBeInTheDocument();
    expect(screen.queryByText('Render failed')).toBeNull();

    consoleError.mockRestore();
  });

  it('exposes a recovery reload action', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reload },
    });

    render(
      <AppErrorBoundary>
        <BrokenChild />
      </AppErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Reload application/i }));
    expect(reload).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
