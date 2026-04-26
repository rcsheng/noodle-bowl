import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { CopiedToast } from '../CopiedToast';

describe('CopiedToast', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders without crashing', () => {
    expect(() => render(<CopiedToast visible={false} />)).not.toThrow();
  });

  test('when visible=false, does not trigger Animated.sequence', () => {
    const sequenceSpy = jest.spyOn(Animated, 'sequence');
    render(<CopiedToast visible={false} />);
    expect(sequenceSpy).not.toHaveBeenCalled();
  });

  test('when visible=true, triggers Animated.sequence', () => {
    const sequenceSpy = jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);
    render(<CopiedToast visible={true} />);
    expect(sequenceSpy).toHaveBeenCalledTimes(1);
  });

  test('the Animated.View has pointerEvents="none"', () => {
    const { UNSAFE_getByType } = render(<CopiedToast visible={false} />);
    const animatedView = UNSAFE_getByType(Animated.View);
    expect(animatedView.props.pointerEvents).toBe('none');
  });
});
