
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';
import { useTranslations } from 'next-intl';

// Mock child components to isolate layout testing
jest.mock('../components/Header', () => ({
  Header: () => <div data-testid="mock-header">Header</div>
}));

jest.mock('../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>
}));

jest.mock('../components/ui/sonner', () => ({
  Toaster: () => <div data-testid="mock-toaster">Toaster</div>
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
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-toaster')).toBeInTheDocument();
  });

  it('applies correct font classes', () => {
    const { container } = render(
      <RootLayout params={{ locale: 'en' }}>
        <div>Content</div>
      </RootLayout>
    );

    // Check if body has font classes (mocked return values)
    const body = container.querySelector('body');
    expect(body).toHaveClass('inter-font');
    expect(body).toHaveClass('jetbrains-mono-font');
  });
});
