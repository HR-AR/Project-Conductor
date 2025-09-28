/**
 * PATTERN: Service Factory with Dependency Injection
 * USE WHEN: Managing service instances, implementing dependency injection, enabling easy testing
 * KEY CONCEPTS: Factory pattern, singleton management, dependency injection, mock service switching
 */

import { EventEmitter } from 'events';

/**
 * Service Configuration Interface
 */
interface ServiceConfig {
  useMocks?: boolean;
  mockData?: any;
  cacheEnabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Base Service Interface
 */
interface IService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getName(): string;
}

/**
 * Service Registry Entry
 */
interface ServiceEntry {
  instance: IService;
  initialized: boolean;
  dependencies: string[];
}

/**
 * Service Factory Class
 *
 * Key patterns:
 * - Centralized service management
 * - Lazy initialization
 * - Dependency resolution
 * - Mock service switching for testing
 * - Event-driven lifecycle management
 */
class ServiceFactory extends EventEmitter {
  private static instance: ServiceFactory;
  private services: Map<string, ServiceEntry> = new Map();
  private config: ServiceConfig = {};
  private initializationOrder: string[] = [];

  private constructor() {
    super();
    this.setupProcessHandlers();
  }

  /**
   * Get singleton instance
   *
   * Key patterns:
   * - Singleton pattern
   * - Lazy instantiation
   */
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Configure the service factory
   *
   * Key patterns:
   * - Global configuration
   * - Environment-based settings
   */
  public configure(config: ServiceConfig): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Apply configuration to existing services
    if (config.useMocks !== undefined) {
      this.switchToMocks(config.useMocks);
    }
  }

  /**
   * Register a service
   *
   * Key patterns:
   * - Service registration
   * - Dependency tracking
   * - Circular dependency detection
   */
  public registerService<T extends IService>(
    name: string,
    serviceClass: new (...args: any[]) => T,
    dependencies: string[] = [],
    ...constructorArgs: any[]
  ): T {
    // Check for circular dependencies
    if (this.hasCircularDependency(name, dependencies)) {
      throw new Error(`Circular dependency detected for service: ${name}`);
    }

    // Create service instance
    const instance = new serviceClass(...constructorArgs);

    // Store service entry
    this.services.set(name, {
      instance,
      initialized: false,
      dependencies,
    });

    // Update initialization order
    this.updateInitializationOrder();

    console.log(`Service registered: ${name}`);
    this.emit('service:registered', { name, dependencies });

    return instance;
  }

  /**
   * Get a service by name
   *
   * Key patterns:
   * - Lazy initialization
   * - Type-safe retrieval
   * - Automatic dependency initialization
   */
  public async getService<T extends IService>(name: string): Promise<T> {
    const entry = this.services.get(name);

    if (!entry) {
      throw new Error(`Service not found: ${name}`);
    }

    // Initialize if needed
    if (!entry.initialized) {
      await this.initializeService(name);
    }

    return entry.instance as T;
  }

  /**
   * Get service synchronously (must be initialized)
   *
   * Key patterns:
   * - Synchronous access for initialized services
   * - Runtime validation
   */
  public getServiceSync<T extends IService>(name: string): T {
    const entry = this.services.get(name);

    if (!entry) {
      throw new Error(`Service not found: ${name}`);
    }

    if (!entry.initialized) {
      throw new Error(`Service not initialized: ${name}. Use getService() for async initialization.`);
    }

    return entry.instance as T;
  }

  /**
   * Initialize a service and its dependencies
   *
   * Key patterns:
   * - Recursive dependency initialization
   * - Initialization tracking
   * - Error handling and rollback
   */
  private async initializeService(name: string): Promise<void> {
    const entry = this.services.get(name);

    if (!entry) {
      throw new Error(`Service not found: ${name}`);
    }

    if (entry.initialized) {
      return;
    }

    console.log(`Initializing service: ${name}`);

    try {
      // Initialize dependencies first
      for (const depName of entry.dependencies) {
        await this.initializeService(depName);
      }

      // Initialize the service
      await entry.instance.initialize();
      entry.initialized = true;

      console.log(`Service initialized: ${name}`);
      this.emit('service:initialized', { name });
    } catch (error) {
      console.error(`Failed to initialize service ${name}:`, error);
      this.emit('service:error', { name, error });
      throw error;
    }
  }

  /**
   * Initialize all registered services
   *
   * Key patterns:
   * - Bulk initialization
   * - Ordered initialization based on dependencies
   */
  public async initializeAll(): Promise<void> {
    console.log('Initializing all services...');

    for (const name of this.initializationOrder) {
      await this.initializeService(name);
    }

    console.log('All services initialized');
    this.emit('factory:initialized');
  }

  /**
   * Shutdown all services
   *
   * Key patterns:
   * - Graceful shutdown
   * - Reverse order shutdown
   * - Error tolerance
   */
  public async shutdownAll(): Promise<void> {
    console.log('Shutting down all services...');

    // Shutdown in reverse order
    const shutdownOrder = [...this.initializationOrder].reverse();

    for (const name of shutdownOrder) {
      const entry = this.services.get(name);

      if (entry && entry.initialized) {
        try {
          await entry.instance.shutdown();
          entry.initialized = false;
          console.log(`Service shutdown: ${name}`);
          this.emit('service:shutdown', { name });
        } catch (error) {
          console.error(`Error shutting down service ${name}:`, error);
        }
      }
    }

    console.log('All services shutdown');
    this.emit('factory:shutdown');
  }

  /**
   * Switch between real and mock services
   *
   * Key patterns:
   * - Testing support
   * - Runtime service switching
   * - State preservation
   */
  private switchToMocks(useMocks: boolean): void {
    console.log(`Switching to ${useMocks ? 'mock' : 'real'} services`);

    // This would typically involve re-registering services
    // with mock implementations
    this.emit('factory:mode-change', { useMocks });
  }

  /**
   * Check for circular dependencies
   *
   * Key patterns:
   * - Dependency graph validation
   * - Recursive cycle detection
   */
  private hasCircularDependency(
    serviceName: string,
    dependencies: string[],
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(serviceName)) {
      return true;
    }

    visited.add(serviceName);

    for (const dep of dependencies) {
      const depEntry = this.services.get(dep);

      if (depEntry) {
        if (this.hasCircularDependency(dep, depEntry.dependencies, new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update initialization order based on dependencies
   *
   * Key patterns:
   * - Topological sorting
   * - Dependency resolution order
   */
  private updateInitializationOrder(): void {
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;

      const entry = this.services.get(name);
      if (!entry) return;

      // Visit dependencies first
      entry.dependencies.forEach(dep => visit(dep));

      visited.add(name);
      order.push(name);
    };

    // Visit all services
    this.services.forEach((_, name) => visit(name));

    this.initializationOrder = order;
  }

  /**
   * Setup process event handlers
   *
   * Key patterns:
   * - Graceful shutdown on process termination
   * - Signal handling
   */
  private setupProcessHandlers(): void {
    const shutdown = async () => {
      console.log('Process termination signal received');
      await this.shutdownAll();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Get service statistics
   *
   * Key patterns:
   * - Monitoring and debugging
   * - Runtime introspection
   */
  public getStats(): any {
    const services = Array.from(this.services.entries()).map(([name, entry]) => ({
      name,
      initialized: entry.initialized,
      dependencies: entry.dependencies,
    }));

    return {
      totalServices: this.services.size,
      initializedCount: services.filter(s => s.initialized).length,
      services,
      initializationOrder: this.initializationOrder,
      config: this.config,
    };
  }

  /**
   * Clear all services (useful for testing)
   *
   * Key patterns:
   * - Test isolation
   * - Clean state reset
   */
  public async reset(): Promise<void> {
    await this.shutdownAll();
    this.services.clear();
    this.initializationOrder = [];
    this.removeAllListeners();
    console.log('Service factory reset');
  }
}

/**
 * Example Service Implementations
 */

class DatabaseService implements IService {
  private connection: any;

  async initialize(): Promise<void> {
    console.log('Connecting to database...');
    // this.connection = await connectToDatabase();
  }

  async shutdown(): Promise<void> {
    console.log('Closing database connection...');
    // await this.connection.close();
  }

  getName(): string {
    return 'DatabaseService';
  }

  async query(sql: string): Promise<any> {
    // return this.connection.query(sql);
  }
}

class CacheService implements IService {
  private client: any;

  async initialize(): Promise<void> {
    console.log('Connecting to cache...');
    // this.client = await connectToRedis();
  }

  async shutdown(): Promise<void> {
    console.log('Closing cache connection...');
    // await this.client.quit();
  }

  getName(): string {
    return 'CacheService';
  }

  async get(key: string): Promise<any> {
    // return this.client.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // await this.client.set(key, value, ttl);
  }
}

class EntityService implements IService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService
  ) {}

  async initialize(): Promise<void> {
    console.log('Initializing entity service...');
    // Service-specific initialization
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down entity service...');
    // Cleanup
  }

  getName(): string {
    return 'EntityService';
  }

  async findById(id: string): Promise<any> {
    // Check cache first
    // const cached = await this.cache.get(`entity:${id}`);
    // if (cached) return cached;

    // Query database
    // const entity = await this.db.query(`SELECT * FROM entities WHERE id = ?`, [id]);
    // await this.cache.set(`entity:${id}`, entity, 3600);
    // return entity;
  }
}

/**
 * Usage Example
 */
async function setupServices(): Promise<void> {
  const factory = ServiceFactory.getInstance();

  // Configure factory
  factory.configure({
    useMocks: process.env.NODE_ENV === 'test',
    cacheEnabled: true,
    logLevel: 'info',
  });

  // Register services with dependencies
  const dbService = factory.registerService('database', DatabaseService);
  const cacheService = factory.registerService('cache', CacheService);

  // Register service with dependencies
  factory.registerService(
    'entity',
    EntityService,
    ['database', 'cache'],
    dbService,
    cacheService
  );

  // Initialize all services
  await factory.initializeAll();

  // Get services when needed
  const entityService = await factory.getService<EntityService>('entity');
}

// Export singleton instance and types
export const serviceFactory = ServiceFactory.getInstance();
export { ServiceFactory, IService, ServiceConfig };
export default ServiceFactory;