import React, { useRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useEdgeSwipeBack } from './useEdgeSwipeBack';

jest.useFakeTimers();

function TestPage({ onBack, enabled }) {
  const ref = useEdgeSwipeBack({ onBack, enabled });
  return <div ref={ref} data-testid="page" />;
}

function swipe(startX, startY, endX, endY) {
  act(() => {
    fireEvent.touchStart(document, {
      touches: [{ identifier: 1, clientX: startX, clientY: startY }],
    });
    fireEvent.touchMove(document, {
      touches: [{ identifier: 1, clientX: endX, clientY: endY }],
    });
    fireEvent.touchEnd(document, {
      changedTouches: [{ identifier: 1, clientX: endX, clientY: endY }],
    });
    jest.runAllTimers();
  });
}

test('appelle onBack quand swipe depuis le bord gauche dépasse 80px', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 100, 200); // dx=90 ≥ 80, dy=0
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('ne appelle pas onBack si le swipe est trop court', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 50, 200); // dx=40 < 80
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack si le geste démarre hors de la zone de bord (x ≥ 22)', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(30, 200, 130, 200); // startX=30 ≥ 22
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack si enabled=false', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled={false} />);
  swipe(10, 200, 100, 200);
  expect(onBack).not.toHaveBeenCalled();
});

test('ne appelle pas onBack sur un swipe majoritairement vertical', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  swipe(10, 200, 15, 310); // dx=5, dy=110 → vertical
  expect(onBack).not.toHaveBeenCalled();
});

// ─── Tests avec bgRef ───────────────────────────────────────────────

function TestPageWithBg({ onBack, enabled }) {
  const bgRef = React.useRef(null);
  const pageRef = useEdgeSwipeBack({ onBack, enabled, bgRef });
  return (
    <>
      <div ref={pageRef} data-testid="page" />
      <div ref={bgRef} data-testid="bg" />
    </>
  );
}

test('bgRef reçoit un translateX pendant le drag horizontal', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithBg onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 60, clientY: 200 }] }); // dx=50
  });
  expect(getByTestId('bg').style.transform).toContain('translateX(');
});

test('bgRef ne cause pas d\'erreur quand null (paramètre omis)', () => {
  const onBack = jest.fn();
  render(<TestPage onBack={onBack} enabled />);
  expect(() => swipe(10, 200, 100, 200)).not.toThrow();
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('bgRef revient en position après spring-back', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithBg onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 40, clientY: 200 }] }); // dx=30 < 80
    fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 40, clientY: 200 }] });
    jest.runAllTimers();
  });
  expect(getByTestId('bg').style.transform).toContain('translateX(');
  expect(onBack).not.toHaveBeenCalled();
});

// ─── Tests avec fgOverlayRef ─────────────────────────────────────────

function TestPageWithFgOverlay({ onBack, enabled }) {
  const fgOverlayRef = useRef(null);
  const ref = useEdgeSwipeBack({ onBack, enabled, fgOverlayRef });
  return (
    <div ref={ref} data-testid="page">
      <div ref={fgOverlayRef} data-testid="fg-overlay" />
    </div>
  );
}

test('fgOverlayRef reçoit une opacité > 0 pendant le drag', () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithFgOverlay onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 90, clientY: 200 }] }); // dx=80
  });
  expect(parseFloat(getByTestId('fg-overlay').style.opacity)).toBeGreaterThan(0);
});

test('fgOverlayRef revient à opacity 0 après spring-back', () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPageWithFgOverlay onBack={onBack} enabled />);
  act(() => {
    fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
    fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 50, clientY: 200 }] }); // dx=40 < 80
    fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 50, clientY: 200 }] });
    jest.runAllTimers();
  });
  expect(getByTestId('fg-overlay').style.opacity).toBe('0');
});

test('null fgOverlayRef (non fourni) ne provoque pas de crash pendant le swipe', () => {
  const onBack = jest.fn();
  const { getByTestId } = render(<TestPage onBack={onBack} enabled />);
  expect(() => {
    act(() => {
      fireEvent.touchStart(document, { touches: [{ identifier: 1, clientX: 10, clientY: 200 }] });
      fireEvent.touchMove(document, { touches: [{ identifier: 1, clientX: 90, clientY: 200 }] });
      fireEvent.touchEnd(document, { changedTouches: [{ identifier: 1, clientX: 90, clientY: 200 }] });
      jest.runAllTimers();
    });
  }).not.toThrow();
});
