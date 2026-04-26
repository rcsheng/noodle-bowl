import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ChallengeModal, PredictOption } from '../ChallengeModal';

const mockBuildChallengeUrl = jest.fn().mockReturnValue('https://noodlebowl.app/c/testtoken');

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  correct: true,
  predictLabel: 'What do you think they will guess?',
  buildChallengeUrl: mockBuildChallengeUrl,
  onSent: jest.fn(),
};

const OPTIONS: PredictOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

/** Advance past the name step (press Next without entering a name). */
async function advancePastNameStep(utils: ReturnType<typeof render>) {
  await act(async () => {
    fireEvent.press(utils.getByTestId('challenge-name-next-btn'));
  });
}

/** Advance from name step through predict step to share step. */
async function advanceToShareStep(utils: ReturnType<typeof render>, text = '42') {
  await advancePastNameStep(utils);
  await waitFor(() => utils.getByText(defaultProps.predictLabel));
  await act(async () => {
    fireEvent.changeText(utils.getByPlaceholderText('Your estimate…'), text);
  });
  await act(async () => {
    fireEvent.press(utils.getByTestId('challenge-next-btn'));
  });
  await waitFor(() => utils.getByText('Share with a Friend'));
}

describe('ChallengeModal', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
  });

  afterEach(async () => {
    await act(async () => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------
  test('when visible=false, modal is not shown', () => {
    const { queryByText } = render(
      <ChallengeModal {...defaultProps} visible={false} />
    );
    expect(queryByText('Who are you challenging?')).toBeNull();
  });

  test('when visible=true, shows name step first', () => {
    const { getByText } = render(<ChallengeModal {...defaultProps} />);
    expect(getByText('Who are you challenging?')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Name step content
  // -------------------------------------------------------------------------
  test('name step shows optional first name input', () => {
    const { getByPlaceholderText } = render(<ChallengeModal {...defaultProps} />);
    expect(getByPlaceholderText('First name (optional)')).toBeTruthy();
  });

  test('name-next button is always enabled (name is optional)', () => {
    const { getByTestId } = render(<ChallengeModal {...defaultProps} />);
    expect(getByTestId('challenge-name-next-btn')).not.toBeDisabled();
  });

  test('pressing name-next advances to predict step', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advancePastNameStep(utils);
    await waitFor(() => {
      expect(utils.getByText(defaultProps.predictLabel)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Predict step content
  // -------------------------------------------------------------------------
  test('shows the preheader "Before you send it —" in predict step', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advancePastNameStep(utils);
    await waitFor(() => {
      expect(utils.getByText('Before you send it —')).toBeTruthy();
    });
  });

  test('with predictOptions, renders a button for each option', async () => {
    const utils = render(<ChallengeModal {...defaultProps} predictOptions={OPTIONS} />);
    await advancePastNameStep(utils);
    await waitFor(() => {
      expect(utils.getByText('Yes')).toBeTruthy();
      expect(utils.getByText('No')).toBeTruthy();
    });
  });

  test('without predictOptions, renders a numeric TextInput in predict step', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advancePastNameStep(utils);
    await waitFor(() => {
      expect(utils.getByPlaceholderText('Your estimate…')).toBeTruthy();
    });
  });

  test('Next button is disabled when no prediction selected', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advancePastNameStep(utils);
    await waitFor(() => {
      expect(utils.getByTestId('challenge-next-btn')).toBeDisabled();
    });
  });

  test('selecting an option enables Next button', async () => {
    const utils = render(<ChallengeModal {...defaultProps} predictOptions={OPTIONS} />);
    await advancePastNameStep(utils);
    await act(async () => {
      fireEvent.press(utils.getByText('Yes'));
    });
    expect(utils.getByTestId('challenge-next-btn')).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Share step
  // -------------------------------------------------------------------------
  test('pressing Next advances to share step showing the URL', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    expect(utils.getByText('https://noodlebowl.app/c/testtoken')).toBeTruthy();
  });

  test('buildChallengeUrl is called with friendName and prediction', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils, '99');
    expect(mockBuildChallengeUrl).toHaveBeenCalledWith('A Friend', '99');
  });

  test('pressing the URL box calls Clipboard.setStringAsync', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    const urlElement = utils.getByText('https://noodlebowl.app/c/testtoken');
    await act(async () => {
      fireEvent.press(urlElement);
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalled();
  });

  test('pressing "Share with a Friend" calls Share.share', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    await act(async () => {
      fireEvent.press(utils.getByText('Share with a Friend'));
    });
    expect(shareSpy).toHaveBeenCalled();
  });

  test('onSent is called with prediction and friendName', async () => {
    const onSent = jest.fn();
    const utils = render(<ChallengeModal {...defaultProps} onSent={onSent} />);
    await advanceToShareStep(utils, '99');
    await act(async () => {
      fireEvent.press(utils.getByText('Share with a Friend'));
    });
    await waitFor(() => {
      expect(onSent).toHaveBeenCalledWith('99', 'A Friend');
    });
  });

  // -------------------------------------------------------------------------
  // Cancel / Close
  // -------------------------------------------------------------------------
  test('pressing Cancel on name step calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ChallengeModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('after closing and reopening, shows name step again (state reset)', async () => {
    const { getByText, getByTestId, rerender } = render(
      <ChallengeModal {...defaultProps} />
    );

    // Navigate past name step
    await act(async () => {
      fireEvent.press(getByTestId('challenge-name-next-btn'));
    });
    await waitFor(() => getByText('Before you send it —'));

    // Close the modal
    await act(async () => {
      fireEvent.press(getByText('Cancel'));
    });

    // Reopen
    await act(async () => {
      rerender(<ChallengeModal {...defaultProps} visible={false} />);
    });
    await act(async () => {
      rerender(<ChallengeModal {...defaultProps} visible={true} />);
    });

    // Should be back on name step
    await waitFor(() => {
      expect(getByText('Who are you challenging?')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // correct prop drives share-step title
  // -------------------------------------------------------------------------
  test('correct=true shows "Think A Friend would get this right?"', async () => {
    const utils = render(<ChallengeModal {...defaultProps} correct={true} />);
    await advanceToShareStep(utils);
    expect(utils.getByText('Think A Friend would get this right?')).toBeTruthy();
  });

  test('correct=false shows "Think A Friend would do better?"', async () => {
    const utils = render(<ChallengeModal {...defaultProps} correct={false} />);
    await advanceToShareStep(utils);
    expect(utils.getByText('Think A Friend would do better?')).toBeTruthy();
  });
});
