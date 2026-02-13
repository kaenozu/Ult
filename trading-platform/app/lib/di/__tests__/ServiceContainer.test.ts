import { ServiceContainer } from '../ServiceContainer';

interface ITestService {
  getData(): string;
}

class RealTestService implements ITestService {
  getData() { return 'real'; }
}

class MockTestService implements ITestService {
  getData() { return 'mock'; }
}

describe('ServiceContainer', () => {
  beforeEach(() => {
    ServiceContainer.reset();
  });

  it('should register and resolve a service', () => {
    ServiceContainer.register<ITestService>('TestService', new RealTestService());
    const service = ServiceContainer.resolve<ITestService>('TestService');
    expect(service.getData()).toBe('real');
  });

  it('should allow overriding a service (for mocking)', () => {
    ServiceContainer.register<ITestService>('TestService', new RealTestService());
    // Override with mock
    ServiceContainer.register<ITestService>('TestService', new MockTestService());
    
    const service = ServiceContainer.resolve<ITestService>('TestService');
    expect(service.getData()).toBe('mock');
  });

  it('should throw error if service is not found', () => {
    expect(() => {
      ServiceContainer.resolve('NonExistent');
    }).toThrow(/not found/);
  });
});
