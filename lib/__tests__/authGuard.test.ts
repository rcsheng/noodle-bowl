import { act, renderHook } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useAuthGate } from '../authGuard';

describe('useAuthGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls action immediately when user is not anonymous', () => {
    mockUseAuth.mockReturnValue({ isAnonymous: false });
    const { result } = renderHook(() => useAuthGate());
    const action = jest.fn();

    act(() => { result.current.requireAuth(action); });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.authGateVisible).toBe(false);
  });

  it('does not call action when user is anonymous', () => {
    mockUseAuth.mockReturnValue({ isAnonymous: true });
    const { result } = renderHook(() => useAuthGate());
    const action = jest.fn();

    act(() => { result.current.requireAuth(action); });

    expect(action).not.toHaveBeenCalled();
  });

  it('shows the auth gate modal when user is anonymous', () => {
    mockUseAuth.mockReturnValue({ isAnonymous: true });
    const { result } = renderHook(() => useAuthGate());

    expect(result.current.authGateVisible).toBe(false);
    act(() => { result.current.requireAuth(jest.fn()); });
    expect(result.current.authGateVisible).toBe(true);
  });

  it('dismisses the modal when dismissAuthGate is called', () => {
    mockUseAuth.mockReturnValue({ isAnonymous: true });
    const { result } = renderHook(() => useAuthGate());

    act(() => { result.current.requireAuth(jest.fn()); });
    expect(result.current.authGateVisible).toBe(true);

    act(() => { result.current.dismissAuthGate(); });
    expect(result.current.authGateVisible).toBe(false);
  });

  it('does not show modal when user is not anonymous', () => {
    mockUseAuth.mockReturnValue({ isAnonymous: false });
    const { result } = renderHook(() => useAuthGate());

    act(() => { result.current.requireAuth(jest.fn()); });

    expect(result.current.authGateVisible).toBe(false);
  });
});
