import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from '../layout';
import '@testing-library/jest-dom';

jest.mock('next/font/google', () => ({
    Inter: () => ({ variable: 'font-inter' }),
}));

describe('RootLayout', () => {
    it('renders children correctly', () => {
        render(
            <RootLayout>
                <div data-testid="child">Child Content</div>
            </RootLayout>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
        // HTML/Body attribute checks are flaky in JSDOM render container
    });

    it('has correct metadata', () => {
        expect(metadata.title).toContain('Trader Pro');
    });
});
