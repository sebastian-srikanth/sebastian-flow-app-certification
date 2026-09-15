import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentAnnotationOverlay } from './DocumentAnnotationOverlay';
import type { DocumentAnnotation } from './types';

const annotation: DocumentAnnotation = {
  id: 'ann-1',
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.4,
  page: 1,
  resourceType: 'asset',
  text: 'Pump',
  annotationType: 'diagrams.AssetLink',
};

describe(DocumentAnnotationOverlay.name, () => {
  it('renders nothing when there are no annotations', () => {
    const { container } = render(
      <DocumentAnnotationOverlay
        annotations={[]}
        containerWidth={400}
        containerHeight={300}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders annotation rectangles and handles interaction', () => {
    const onAnnotationClick = vi.fn();
    const onAnnotationHover = vi.fn();

    render(
      <DocumentAnnotationOverlay
        annotations={[annotation]}
        containerWidth={400}
        containerHeight={300}
        onAnnotationClick={onAnnotationClick}
        onAnnotationHover={onAnnotationHover}
      />,
    );

    const rect = document.querySelector('rect');
    if (!rect) {
      throw new Error('Expected annotation rect to render');
    }
    fireEvent.mouseEnter(rect);
    expect(onAnnotationHover).toHaveBeenCalledWith(annotation);

    fireEvent.click(rect);
    expect(onAnnotationClick).toHaveBeenCalledWith(annotation);

    fireEvent.mouseLeave(rect);
    expect(onAnnotationHover).toHaveBeenLastCalledWith(null);
  });

  it('renders a custom tooltip for hovered annotations', () => {
    render(
      <DocumentAnnotationOverlay
        annotations={[annotation]}
        containerWidth={400}
        containerHeight={300}
        renderAnnotationTooltip={(item) => <div>Tooltip: {item.text}</div>}
      />,
    );

    const rect = document.querySelector('rect');
    if (!rect) {
      throw new Error('Expected annotation rect to render');
    }
    fireEvent.mouseEnter(rect);
    expect(screen.getByText('Tooltip: Pump')).toBeInTheDocument();
  });
});
