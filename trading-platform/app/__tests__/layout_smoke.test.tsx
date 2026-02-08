
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';
import { useTranslations } from 'next-intl';

// Mock child components to isolate layout testing
jest.mock('../components/Header', () => ({
  Header: () => <div data-testid="mock-header">Header</div>
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-font' }),
  JetBrains_Mono: () => ({ className: 'jetbrains-mono-font' })
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigation' }]),
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(),
  },
  writable: true
});

describe('RootLayout', () => {
  beforeEach(() => {
    (useTranslations as jest.Mock).mockReturnValue((key: string) => key);
  });

  it('renders required layout elements', async () => {
    render(
      <RootLayout params={{ locale: 'en' }}>
        <div data-testid="child-content">Child Content</div>
      </RootLayout>
    );

    // Verify main structure
    // RootLayout now only provides context, doesn't render Header/Sidebar directly
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
