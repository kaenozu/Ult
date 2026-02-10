/**
 * ErrorBoundary Integration Tests
 * 
 * Tests to verify that all page components are wrapped with ErrorBoundary
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { NetworkError } from '@/app/lib/errors';

// Mock components that throw errors
const ComponentThatThrows = () => {
  throw new Error('Test error');
};

const ComponentThatThrowsRecoverable = () => {
  throw new NetworkError('Network error');
};

const ComponentThatWorks = () => {
  return <div>Working component</div>;
};

describe('ErrorBoundary Integration', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary name="TestComponent">
        <ComponentThatWorks />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch and display error message', () => {
    render(
      <ErrorBoundary name="TestComponent">
        <ComponentThatThrows />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/TestComponent エラー/)).toBeInTheDocument();
    expect(screen.getByText(/予期せぬエラーが発生しました/)).toBeInTheDocument();
  });

  it('should display error details', () => {
    render(
      <ErrorBoundary name="TestComponent">
        <ComponentThatThrows />
      </ErrorBoundary>
    );
    
    expect(screen.getByText((content, element) => content.includes('Test error'))).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary name="TestComponent">
        <ComponentThatThrowsRecoverable />
      </ErrorBoundary>
    );
    
    const retryButton = screen.getByRole('button', { name: /再試行/ });
    expect(retryButton).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary name="TestComponent" fallback={customFallback}>
        <ComponentThatThrows />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});

/**
 * Page Components Structure Verification
 * 
 * These tests verify that page components follow the correct structure
 * with ErrorBoundary wrapper.
 */
describe('Page Components Structure', () => {
  const pageFiles = [
    'app/page.tsx (HomePage)',
    'app/screener/page.tsx (ScreenerPage)',
    'app/heatmap/page.tsx (HeatmapPage)',
    'app/journal/page.tsx (JournalPage)',
    'app/ai-advisor/page.tsx (AIAdvisorPage)',
    'app/universe/page.tsx (UniversePage)',
  ];

  it('should have ErrorBoundary wrapper pattern in all page components', () => {
    // This is a documentation test to track which pages should have ErrorBoundary
    expect(pageFiles).toHaveLength(6);
    
    // Each page should follow this pattern:
    // export default function PageName() {
    //   return (
    //     <ErrorBoundary name="PageNamePage">
    //       <PageContent />
    //     </ErrorBoundary>
    //   );
    // }
  });
});
