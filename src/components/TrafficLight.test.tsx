import { render, screen } from '@testing-library/react';
import { TrafficLight } from './TrafficLight';

describe('TrafficLight', () => {
  it('renders safe level correctly', () => {
    render(<TrafficLight safetyLevel='safe' />);
    expect(screen.getByText('safe System')).toBeInTheDocument();
  });

  it('renders caution level correctly', () => {
    render(<TrafficLight safetyLevel='caution' />);
    expect(screen.getByText('caution System')).toBeInTheDocument();
  });

  it('renders danger level correctly', () => {
    render(<TrafficLight safetyLevel='danger' />);
    expect(screen.getByText('danger System')).toBeInTheDocument();
  });
});
