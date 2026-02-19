import { render, screen, fireEvent } from '@testing-library/react';
import { AlertConditionManager } from '../AlertConditionManager';
import { useAlertNotificationStore } from '@/app/store/alertNotificationStore';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('@/app/store/alertNotificationStore', () => ({
  useAlertNotificationStore: jest.fn(),
}));

describe('AlertConditionManager Accessibility', () => {
  const mockStore = {
    conditions: [],
    alerts: [],
    channels: new Map(),
    initialize: jest.fn(),
    addCondition: jest.fn(),
    removeCondition: jest.fn(),
    toggleCondition: jest.fn(),
    acknowledgeAlert: jest.fn(),
    clearAcknowledgedAlerts: jest.fn(),
    toggleChannel: jest.fn(),
  };

  beforeEach(() => {
    (useAlertNotificationStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('has accessible modal, tabs, and inputs', () => {
    render(<AlertConditionManager />);

    // 1. Open the modal
    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    // 2. Check Modal Accessibility
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'alert-manager-title');

    const title = screen.getByText('Alert Management');
    expect(title).toHaveAttribute('id', 'alert-manager-title');

    const closeButton = screen.getByLabelText('Close alert manager');
    expect(closeButton).toBeInTheDocument();

    // 3. Check Tabs Accessibility
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Conditions');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true'); // Default active
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

    // 4. Check Form Accessibility (Switch to "Add New Condition" if needed)
    // The "Add New Condition" button is initially visible in the "conditions" tab
    const addButton = screen.getByText('Add New Condition');
    fireEvent.click(addButton);

    // Now inputs should be visible
    const nameInput = screen.getByLabelText('Condition Name');
    expect(nameInput).toBeInTheDocument();

    const typeSelect = screen.getByLabelText('Condition Type');
    expect(typeSelect).toBeInTheDocument();

    const symbolInput = screen.getByLabelText('Symbol');
    expect(symbolInput).toBeInTheDocument();

    const conditionInput = screen.getByLabelText('Condition Logic');
    expect(conditionInput).toBeInTheDocument();

    const thresholdInput = screen.getByLabelText('Threshold Value');
    expect(thresholdInput).toBeInTheDocument();

    // 5. Verify other tabs
    fireEvent.click(tabs[1]); // Alerts tab
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    const alertsPanel = screen.getByRole('tabpanel');
    expect(alertsPanel).toHaveAttribute('id', 'panel-alerts');

    fireEvent.click(tabs[2]); // Channels tab
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    const channelsPanel = screen.getByRole('tabpanel');
    expect(channelsPanel).toHaveAttribute('id', 'panel-channels');
  });
});
