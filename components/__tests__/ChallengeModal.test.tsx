import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ChallengeModal, PredictOption } from '../ChallengeModal';

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  correct: true,
  predictLabel: 'What do you think they will guess?',
  onSent: jest.fn(),
};

const OPTIONS: PredictOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

/** Navigate the modal from predict step to share step via a text input. */
async function advanceToShareStep(utils: ReturnType<typeof render>, text = '42') {
  const { getByPlaceholderText, getByText } = utils;
  await act(async () => {
    fireEvent.changeText(getByPlaceholderText('Your estimate…'), text);
  });
  await act(async () => {
    fireEvent.press(getByText('Next →'));
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
    expect(queryByText(defaultProps.predictLabel)).toBeNull();
  });

  test('when visible=true, shows predictLabel text', () => {
    const { getByText } = render(<ChallengeModal {...defaultProps} />);
    expect(getByText(defaultProps.predictLabel)).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Predict step content
  // -------------------------------------------------------------------------
  test('shows the preheader "Before you send it —" in predict step', () => {
    const { getByText } = render(<ChallengeModal {...defaultProps} />);
    expect(getByText('Before you send it —')).toBeTruthy();
  });

  test('with predictOptions, renders a button for each option', () => {
    const { getByText } = render(
      <ChallengeModal {...defaultProps} predictOptions={OPTIONS} />
    );
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
  });

  test('without predictOptions, renders a numeric TextInput', () => {
    const { getByPlaceholderText } = render(<ChallengeModal {...defaultProps} />);
    expect(getByPlaceholderText('Your estimate…')).toBeTruthy();
  });

  test('Next button is disabled when no prediction selected', () => {
    const { getByTestId } = render(<ChallengeModal {...defaultProps} />);
    expect(getByTestId('challenge-next-btn')).toBeDisabled();
  });

  test('selecting an option enables Next button', async () => {
    const { getByText, getByTestId } = render(
      <ChallengeModal {...defaultProps} predictOptions={OPTIONS} />
    );
    await act(async () => {
      fireEvent.press(getByText('Yes'));
    });
    expect(getByTestId('challenge-next-btn')).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Share step
  // -------------------------------------------------------------------------
  test('pressing Next advances to share step showing the URL', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    expect(utils.getByText(/https:\/\/noodlebowl\.app\/c\//)).toBeTruthy();
  });

  test('URL matches the expected format', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    const urlElement = utils.getByText(/https:\/\/noodlebowl\.app\/c\//);
    const urlText = urlElement.children[0] as string;
    expect(urlText).toMatch(/^https:\/\/noodlebowl\.app\/c\/[A-Z0-9]{8}$/);
  });

  test('pressing the URL box calls Clipboard.setStringAsync', async () => {
    const utils = render(<ChallengeModal {...defaultProps} />);
    await advanceToShareStep(utils);
    const urlElement = utils.getByText(/https:\/\/noodlebowl\.app\/c\//);
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

  test('onSent is called with the prediction value', async () => {
    const onSent = jest.fn();
    const utils = render(<ChallengeModal {...defaultProps} onSent={onSent} />);
    const { getByPlaceholderText, getByText } = utils;

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Your estimate…'), '99');
    });
    await act(async () => {
      fireEvent.press(getByText('Next →'));
    });
    await waitFor(() => utils.getByText('Share with a Friend'));
    await act(async () => {
      fireEvent.press(utils.getByText('Share with a Friend'));
    });
    await waitFor(() => {
      expect(onSent).toHaveBeenCalledWith('99');
    });
  });

  // -------------------------------------------------------------------------
  // Cancel / Close
  // -------------------------------------------------------------------------
  test('pressing Cancel calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ChallengeModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('after closing and reopening, shows predict step again (state reset)', async () => {
    const { getByText, getByPlaceholderText, rerender } = render(
      <ChallengeModal {...defaultProps} />
    );

    // Navigate to share step
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Your estimate…'), '42');
    });
    await act(async () => {
      fireEvent.press(getByText('Next →'));
    });
    await waitFor(() => getByText('Share with a Friend'));

    // Close the modal — handleClose resets internal state
    await act(async () => {
      fireEvent.press(getByText('Cancel'));
    });

    // Reopen the modal
    await act(async () => {
      rerender(<ChallengeModal {...defaultProps} visible={false} />);
    });
    await act(async () => {
      rerender(<ChallengeModal {...defaultProps} visible={true} />);
    });

    // Should be back on predict step
    await waitFor(() => {
      expect(getByText('Before you send it —')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // correct prop drives share-step title
  // -------------------------------------------------------------------------
  test('correct=true shows "Think your friend would get this right?"', async () => {
    const utils = render(<ChallengeModal {...defaultProps} correct={true} />);
    await advanceToShareStep(utils);
    expect(utils.getByText('Think your friend would get this right?')).toBeTruthy();
  });

  test('correct=false shows "Think your friend would do better?"', async () => {
    const utils = render(<ChallengeModal {...defaultProps} correct={false} />);
    await advanceToShareStep(utils);
    expect(utils.getByText('Think your friend would do better?')).toBeTruthy();
  });
});
