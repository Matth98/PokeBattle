import React from 'react';
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
