import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../components/Navigation';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Navigation Smoke Test', () => {
  it('should have a valid link for AI Analysis', () => {
    render(<Navigation />);
    const analysisLink = screen.getByRole('link', { name: /AI分析/i });
    expect(analysisLink).toHaveAttribute('href', '/analysis');
  });

  it('should have a valid link for Portfolio Analysis', () => {
    render(<Navigation />);
    const portfolioLink = screen.getByRole('link', { name: /ポートフォリオ分析/i });
    expect(portfolioLink).toHaveAttribute('href', '/portfolio-analysis');
  });
});
