import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';

import { ShieldEarnedToast } from '../ShieldEarnedToast';

describe('ShieldEarnedToast', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders without crashing when not visible', () => {
    expect(() => render(<ShieldEarnedToast visible={false} />)).not.toThrow();
  });

  test('renders the shield-earned label text when visible', () => {
    const { getByText } = render(<ShieldEarnedToast visible={true} />);
    // Emoji replaced by ShieldIcon SVG; text node now reads 'Shield earned'
    expect(getByText('Shield earned')).toBeTruthy();
  });

  test('when visible=false, does not trigger Animated.sequence', () => {
    const spy = jest.spyOn(Animated, 'sequence');
    render(<ShieldEarnedToast visible={false} />);
    expect(spy).not.toHaveBeenCalled();
  });

  test('when visible=true, triggers Animated.sequence', () => {
    const spy = jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);
    render(<ShieldEarnedToast visible={true} />);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('the Animated.View has pointerEvents="none"', () => {
    const { UNSAFE_getByType } = render(<ShieldEarnedToast visible={false} />);
    const animatedView = UNSAFE_getByType(Animated.View);
    expect(animatedView.props.pointerEvents).toBe('none');
  });
});
