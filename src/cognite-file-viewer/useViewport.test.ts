import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { computeBaseWidth, useViewport } from './useViewport';

/**
 * The viewport attaches its wheel and touch handlers imperatively with `{ passive: false }`, so the
 * only way to exercise them is to dispatch real events at the node. happy-dom has no `Touch`
 * constructor, so touch lists are supplied as plain objects carrying the fields the hook reads.
 */
function makeMeasuredNode(width = 400, height = 300): HTMLDivElement {
  const node = document.createElement('div');
  Object.defineProperty(node, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(node, 'clientHeight', { value: height, configurable: true });
  node.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
  return node;
}

function makeWheelEvent(props: {
  ctrlKey?: boolean;
  metaKey?: boolean;
  deltaX?: number;
  deltaY?: number;
  clientX?: number;
  clientY?: number;
}): Event {
  return Object.assign(new Event('wheel', { cancelable: true }), {
    ctrlKey: false,
    metaKey: false,
    deltaX: 0,
    deltaY: 0,
    clientX: 0,
    clientY: 0,
    ...props,
  });
}

function makeTouchEvent(type: string, points: Array<[number, number]>): Event {
  return Object.assign(new Event(type, { cancelable: true }), {
    touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
  });
}

function makeMouseEvent(button: number, clientX = 0, clientY = 0): React.MouseEvent {
  return {
    button,
    clientX,
    clientY,
    preventDefault: () => undefined,
  } as React.MouseEvent;
}

describe('computeBaseWidth', () => {
  it('returns explicit width when fit mode is disabled', () => {
    expect(
      computeBaseWidth(undefined, 400, { width: 800, height: 600 }, { width: 100, height: 200 }),
    ).toBe(400);
  });

  it('fits to container width', () => {
    expect(
      computeBaseWidth('width', undefined, { width: 640, height: 480 }, { width: 100, height: 200 }),
    ).toBe(640);
  });

  it('fits entire page when container is wider than content aspect ratio', () => {
    expect(
      computeBaseWidth('page', undefined, { width: 1000, height: 500 }, { width: 200, height: 400 }),
    ).toBe(250);
  });

  it('fits entire page when container is taller than content aspect ratio', () => {
    expect(
      computeBaseWidth('page', undefined, { width: 400, height: 800 }, { width: 200, height: 400 }),
    ).toBe(400);
  });

  it('falls back to the explicit width before the container has been measured', () => {
    expect(
      computeBaseWidth('width', 400, { width: 0, height: 0 }, { width: 100, height: 200 }),
    ).toBe(400);
    expect(computeBaseWidth('page', 400, { width: 0, height: 600 }, null)).toBe(400);
  });

  it('falls back to the explicit width when page fit has no usable natural size', () => {
    expect(computeBaseWidth('page', 400, { width: 800, height: 600 }, null)).toBe(400);
    expect(
      computeBaseWidth('page', 400, { width: 800, height: 600 }, { width: 200, height: 0 }),
    ).toBe(400);
    expect(
      computeBaseWidth('page', 400, { width: 800, height: 0 }, { width: 200, height: 400 }),
    ).toBe(400);
  });
});

describe(useViewport.name, () => {
  it('uses controlled zoom and pan values', () => {
    const onZoomChange = vi.fn();
    const onPanChange = vi.fn();

    const { result } = renderHook(() =>
      useViewport({
        zoom: 2,
        onZoomChange,
        panOffset: { x: 10, y: 20 },
        onPanChange,
      }),
    );

    expect(result.current.currentZoom).toBe(2);
    expect(result.current.effectivePan).toEqual({ x: 10, y: 20 });
    expect(result.current.cursor).toBe('grab');
  });

  it('resets pan when zoom is at or below 100%', () => {
    const { result } = renderHook(() =>
      useViewport({ panOffset: { x: 30, y: 40 } }),
    );

    expect(result.current.effectivePan).toEqual({ x: 0, y: 0 });
  });

  it('updates zoom through handleZoomChange', () => {
    const onZoomChange = vi.fn();
    const { result } = renderHook(() => useViewport({ onZoomChange, maxZoom: 3 }));

    act(() => {
      result.current.handleZoomChange(2.5);
    });

    expect(result.current.currentZoom).toBe(2.5);
    expect(onZoomChange).toHaveBeenCalledWith(2.5);
  });

  it('measures container dimensions when viewport ref is attached', () => {
    const { result } = renderHook(() => useViewport({}));

    const node = document.createElement('div');
    Object.defineProperty(node, 'clientWidth', { value: 320, configurable: true });
    Object.defineProperty(node, 'clientHeight', { value: 240, configurable: true });

    act(() => {
      result.current.viewportRef(node);
    });

    expect(result.current.containerDims).toEqual({ width: 320, height: 240 });
  });

  it('clamps zoom to the configured bounds', () => {
    const { result } = renderHook(() => useViewport({ minZoom: 0.5, maxZoom: 2 }));

    act(() => result.current.handleZoomChange(10));
    expect(result.current.currentZoom).toBe(2);

    act(() => result.current.handleZoomChange(0.1));
    expect(result.current.currentZoom).toBe(0.5);
  });

  it('tracks pan in uncontrolled mode once zoomed in', () => {
    const onPanChange = vi.fn();
    const { result } = renderHook(() => useViewport({ onPanChange }));

    act(() => result.current.handleZoomChange(2));
    act(() => result.current.handlePanChange({ x: 5, y: 6 }));

    expect(onPanChange).toHaveBeenCalledWith({ x: 5, y: 6 });
    expect(result.current.effectivePan).toEqual({ x: 5, y: 6 });
  });

  describe('wheel and touch gestures', () => {
    function attachNode(result: { current: ReturnType<typeof useViewport> }) {
      const node = makeMeasuredNode();
      act(() => {
        result.current.viewportRef(node);
      });
      return node;
    }

    it('zooms toward the cursor on ctrl+wheel and compensates the pan', () => {
      const onZoomChange = vi.fn();
      const onPanChange = vi.fn();
      const { result } = renderHook(() => useViewport({ onZoomChange, onPanChange }));
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeWheelEvent({ ctrlKey: true, deltaY: -1, clientX: 100, clientY: 50 }));
      });

      // 1 * 1.1 zoom-in factor, anchored so the point under the cursor stays put.
      expect(onZoomChange).toHaveBeenCalledWith(1.1);
      expect(onPanChange).toHaveBeenCalledWith({
        x: 100 - 100 * 1.1,
        y: 50 - 50 * 1.1,
      });
    });

    it('zooms out on ctrl+wheel scrolled down', () => {
      const onZoomChange = vi.fn();
      const { result } = renderHook(() => useViewport({ zoom: 2, onZoomChange }));
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeWheelEvent({ metaKey: true, deltaY: 10, clientX: 0, clientY: 0 }));
      });

      expect(onZoomChange).toHaveBeenCalledWith(2 * 0.9);
    });

    it('does nothing when ctrl+wheel would exceed the zoom bound', () => {
      const onZoomChange = vi.fn();
      const onPanChange = vi.fn();
      const { result } = renderHook(() =>
        useViewport({ zoom: 2, maxZoom: 2, minZoom: 2, onZoomChange, onPanChange }),
      );
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeWheelEvent({ ctrlKey: true, deltaY: -1, clientX: 0, clientY: 0 }));
      });

      expect(onZoomChange).not.toHaveBeenCalled();
      expect(onPanChange).not.toHaveBeenCalled();
    });

    it('pans on a plain wheel only while zoomed in', () => {
      const onPanChange = vi.fn();
      const { result } = renderHook(() =>
        useViewport({ zoom: 2, panOffset: { x: 10, y: 10 }, onPanChange }),
      );
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeWheelEvent({ deltaX: 4, deltaY: 6 }));
      });

      expect(onPanChange).toHaveBeenCalledWith({ x: 6, y: 4 });
    });

    it('ignores a plain wheel at or below 100% zoom so the page keeps scrolling', () => {
      const onPanChange = vi.fn();
      const { result } = renderHook(() => useViewport({ zoom: 1, onPanChange }));
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeWheelEvent({ deltaX: 4, deltaY: 6 }));
      });

      expect(onPanChange).not.toHaveBeenCalled();
    });

    it('pinches to zoom and pans toward the pinch centre', () => {
      const onZoomChange = vi.fn();
      const onPanChange = vi.fn();
      const { result } = renderHook(() => useViewport({ onZoomChange, onPanChange }));
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeTouchEvent('touchstart', [[0, 0], [100, 0]]));
      });
      act(() => {
        node.dispatchEvent(makeTouchEvent('touchmove', [[0, 0], [200, 0]]));
      });

      // Distance doubled, so zoom doubles from the initial 1.
      expect(onZoomChange).toHaveBeenCalledWith(2);
      expect(onPanChange).toHaveBeenCalledTimes(1);

      act(() => {
        node.dispatchEvent(makeTouchEvent('touchend', []));
      });
      onZoomChange.mockClear();

      // After touchend the gesture state is gone, so a stray move must be ignored.
      act(() => {
        node.dispatchEvent(makeTouchEvent('touchmove', [[0, 0], [400, 0]]));
      });
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it('ignores single-finger touches', () => {
      const onZoomChange = vi.fn();
      const { result } = renderHook(() => useViewport({ onZoomChange }));
      const node = attachNode(result);

      act(() => {
        node.dispatchEvent(makeTouchEvent('touchstart', [[0, 0]]));
        node.dispatchEvent(makeTouchEvent('touchmove', [[10, 0]]));
      });

      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it('detaches listeners when the viewport node is replaced or removed', () => {
      const onPanChange = vi.fn();
      const { result } = renderHook(() => useViewport({ zoom: 2, onPanChange }));
      const node = attachNode(result);

      act(() => {
        result.current.viewportRef(null);
      });

      act(() => {
        node.dispatchEvent(makeWheelEvent({ deltaX: 4, deltaY: 6 }));
      });

      expect(onPanChange).not.toHaveBeenCalled();
    });
  });

  describe('middle-click drag to pan', () => {
    it('starts dragging only on middle-click while zoomed in', () => {
      const { result } = renderHook(() => useViewport({ zoom: 2 }));

      act(() => result.current.handleMouseDown(makeMouseEvent(0)));
      expect(result.current.cursor).toBe('grab');

      act(() => result.current.handleMouseDown(makeMouseEvent(1)));
      expect(result.current.cursor).toBe('grabbing');
    });

    it('does not start dragging at or below 100% zoom', () => {
      const { result } = renderHook(() => useViewport({ zoom: 1 }));

      act(() => result.current.handleMouseDown(makeMouseEvent(1)));

      expect(result.current.cursor).toBe('default');
    });

    it('pans while dragging and stops on mouse up', () => {
      const onPanChange = vi.fn();
      const { result } = renderHook(() =>
        useViewport({ zoom: 2, panOffset: { x: 10, y: 10 }, onPanChange }),
      );

      act(() => result.current.handleMouseDown(makeMouseEvent(1, 100, 100)));

      act(() => {
        window.dispatchEvent(
          Object.assign(new Event('mousemove'), { clientX: 130, clientY: 90 }),
        );
      });

      expect(onPanChange).toHaveBeenCalledWith({ x: 40, y: 0 });

      act(() => {
        window.dispatchEvent(new Event('mouseup'));
      });
      expect(result.current.cursor).toBe('grab');

      onPanChange.mockClear();
      act(() => {
        window.dispatchEvent(
          Object.assign(new Event('mousemove'), { clientX: 200, clientY: 200 }),
        );
      });
      expect(onPanChange).not.toHaveBeenCalled();
    });
  });
});
