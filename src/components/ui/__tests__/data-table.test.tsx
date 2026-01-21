import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataTable } from '@/components/ui/data-table';
import { logger } from '@/lib/logger';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

interface TestItem {
  id: string;
  name: string;
  value: number;
  status: 'active' | 'inactive';
}

const mockData: TestItem[] = [
  { id: '1', name: 'Item 1', value: 100, status: 'active' },
  { id: '2', name: 'Item 2', value: 200, status: 'inactive' },
  { id: '3', name: 'Item 3', value: 300, status: 'active' },
];

const mockColumns = [
  { key: 'name', header: 'Name', width: 150 },
  { key: 'value', header: 'Value', width: 100 },
  {
    key: 'status',
    header: 'Status',
    width: 100,
    render: (value: string) => (
      <span className={value === 'active' ? 'text-green-500' : 'text-red-500'}>
        {value}
      </span>
    ),
  },
];

describe('DataTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with data', () => {
    render(<DataTable data={mockData} columns={mockColumns} keyField='id' />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders custom cell content', () => {
    render(<DataTable data={mockData} columns={mockColumns} keyField='id' />);

    const activeStatus = screen.getByText('active');
    expect(activeStatus).toHaveClass('text-green-500');
  });

  it('shows empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyField='id'
        emptyMessage='No items found'
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const mockOnRowClick = jest.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyField='id'
        onRowClick={mockOnRowClick}
      />
    );

    const firstRow = screen.getByText('Item 1').closest('div');
    fireEvent.click(firstRow!);

    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('uses virtualization for large datasets', () => {
    const largeData = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i * 10,
      status: i % 2 === 0 ? ('active' as const) : ('inactive' as const),
    }));

    render(
      <DataTable
        data={largeData}
        columns={mockColumns}
        keyField='id'
        virtualize={true}
      />
    );

    // Should render virtualized list
    expect(logger.debug).toHaveBeenCalledWith(
      'DataTable render',
      expect.objectContaining({
        dataLength: 50,
        shouldVirtualize: true,
      })
    );
  });

  it('falls back to regular rendering for small datasets', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyField='id'
        virtualize={true}
      />
    );

    expect(logger.debug).toHaveBeenCalledWith(
      'DataTable render',
      expect.objectContaining({
        dataLength: 3,
        shouldVirtualize: false,
      })
    );
  });

  it('disables virtualization when virtualize is false', () => {
    const largeData = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i * 10,
      status: i % 2 === 0 ? ('active' as const) : ('inactive' as const),
    }));

    render(
      <DataTable
        data={largeData}
        columns={mockColumns}
        keyField='id'
        virtualize={false}
      />
    );

    expect(logger.debug).toHaveBeenCalledWith(
      'DataTable render',
      expect.objectContaining({
        shouldVirtualize: false,
      })
    );
  });
});
