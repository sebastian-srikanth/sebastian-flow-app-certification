import { Button } from '@cognite/aura/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cognite/aura/components/card';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Asset 360 application error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-muted/50 text-foreground">
          <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4 sm:p-8">
            <Card aria-label="Application error">
              <CardHeader>
                <CardTitle as="h1">Asset 360 couldn&apos;t load</CardTitle>
                <CardDescription>
                  Something went wrong while rendering the application. Reload to try again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={this.handleReload}>
                  Reload application
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
