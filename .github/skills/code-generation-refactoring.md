# Code Generation & Refactoring Agent

## Purpose
コード生成、リファクタリング、アーキテクチャ改善を専門とするエージェント。

## Capabilities
- 自動コード生成とパターン適用
- リファクタリング戦略の実行
- アーキテクチャの改善と最適化
- コード品質の自動改善
- テストコードの自動生成

## Code Generation Patterns

### Component Generation
```typescript
// scripts/generate-component.ts
interface ComponentTemplate {
  name: string;
  type: 'page' | 'component' | 'hook' | 'service';
  features: string[];
  props?: ComponentProp[];
}

class ComponentGenerator {
  generateComponent(template: ComponentTemplate): string {
    const { name, type, features, props } = template;
    
    let component = '';
    
    // インポート生成
    component += this.generateImports(features);
    
    // 型定義生成
    component += this.generateTypes(props);
    
    // コンポーネント本体生成
    component += this.generateComponentBody(name, type, props);
    
    // スタイル生成
    component += this.generateStyles(name);
    
    return component;
  }

  private generateImports(features: string[]): string {
    const imports: string[] = ['React'];
    
    if (features.includes('zustand')) imports.push('useStore');
    if (features.includes('chart')) imports.push('Chart');
    if (features.includes('form')) imports.push('useForm');
    if (features.includes('api')) imports.push('useApi');
    
    return imports.map(imp => `import { ${imp} } from '${this.getImportPath(imp)}';`).join('\n') + '\n\n';
  }

  private generateComponentBody(name: string, type: string, props?: ComponentProp[]): string {
    const componentName = this.formatName(name, type);
    const hasProps = props && props.length > 0;
    
    return `
export ${type === 'hook' ? 'function' : 'const'} ${componentName}${hasProps ? '({ ' + props?.map(p => p.name).join(', ') + ' })' : ''} {
  ${this.generateComponentLogic(type, name)}
  
  return (
    ${this.generateComponentMarkup(type, name)}
  );
}

${type === 'component' ? `export default ${componentName};` : ''}
    `.trim();
  }

  private generateComponentLogic(type: string, name: string): string {
    switch (type) {
      case 'page':
        return this.generatePageLogic(name);
      case 'component':
        return this.generateComponentLogic(name);
      case 'hook':
        return this.generateHookLogic(name);
      case 'service':
        return this.generateServiceLogic(name);
      default:
        return '';
    }
  }
}
```

### API Route Generation
```typescript
// scripts/generate-api-route.ts
interface ApiRouteSpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  parameters?: Parameter[];
  responses?: ResponseDefinition[];
  middleware?: string[];
  features?: string[];
}

class ApiRouteGenerator {
  generateRoute(spec: ApiRouteSpec): string {
    const { path, method, description, parameters, middleware, features } = spec;
    
    let route = '';
    
    // ドキュメントコメント
    route += this.generateDocumentation(path, method, description, parameters);
    
    // インポート
    route += this.generateRouteImports(features);
    
    // ミドルウェア
    route += this.generateMiddleware(middleware);
    
    // ハンドラ本体
    route += this.generateHandler(method, parameters, features);
    
    // エラーハンドリング
    route += this.generateErrorHandling();
    
    return route;
  }

  private generateDocumentation(path: string, method: string, description: string, parameters?: Parameter[]): string {
    const params = parameters ? parameters.map(p => ` *   @param {${p.type}} ${p.name} ${p.description}`).join('\n') : '';
    
    return `/**
 * ${method} ${path}
 * 
 * ${description}
 *${params}
 * @returns {Promise<{success: boolean; data?: any; error?: string}>}
 */`;
  }

  private generateHandler(method: string, parameters?: Parameter[], features?: string[]): string {
    const hasValidation = features?.includes('validation');
    const hasDatabase = features?.includes('database');
    const hasCache = features?.includes('cache');
    const hasAuth = features?.includes('auth');
    
    let handler = '';
    
    if (method === 'GET') {
      handler = `
export async function GET(request: NextRequest) {
  ${hasAuth ? 'const session = await getSession(request);\n  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n' : ''}
  ${hasValidation ? 'const { searchParams } = new URL(request.url);\n  const validated = validateSearchParams(searchParams);\n  if (!validated) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });\n' : ''}
  ${hasCache ? 'const cached = await cache.get(JSON.stringify(searchParams));\n  if (cached) return NextResponse.json({ success: true, data: cached });\n' : ''}
  ${hasDatabase ? 'const data = await fetchData(validated || searchParams);\n' : 'const data = { message: "Data fetched" };\n'}
  ${hasCache ? 'await cache.set(JSON.stringify(searchParams), data, { ttl: 300 });\n' : ''}
  
  return NextResponse.json({ success: true, data });
}`;
    }
    
    if (method === 'POST') {
      handler = `
export async function POST(request: NextRequest) {
  ${hasAuth ? 'const session = await getSession(request);\n  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n' : ''}
  
  const body = await request.json();
  ${hasValidation ? 'const validated = validateInput(body);\n  if (!validated) return NextResponse.json({ error: "Invalid input" }, { status: 400 });\n' : ''}
  
  ${hasDatabase ? 'const result = await createData(validated || body);\n' : 'const result = { id: generateId(), ...body };\n'}
  
  return NextResponse.json({ success: true, data: result });
}`;
    }
    
    return handler;
  }
}
```

### Service Layer Generation
```typescript
// scripts/generate-service.ts
interface ServiceSpec {
  name: string;
  type: 'singleton' | 'class';
  methods: MethodDefinition[];
  dependencies?: string[];
  features?: string[];
}

class ServiceGenerator {
  generateService(spec: ServiceSpec): string {
    const { name, type, methods, dependencies, features } = spec;
    
    let service = '';
    
    // ドキュメント
    service += this.generateServiceDoc(name);
    
    // インポート
    service += this.generateServiceImports(dependencies, features);
    
    // クラス/サービス定義
    service += this.generateServiceBody(name, type, methods, features);
    
    // インスタンスエクスポート
    if (type === 'singleton') {
      service += `\nexport const ${this.toCamelCase(name)} = new ${name}();`;
    }
    
    return service;
  }

  private generateServiceBody(name: string, type: string, methods: MethodDefinition[], features?: string[]): string {
    const hasErrorHandling = features?.includes('error-handling');
    const hasLogging = features?.includes('logging');
    const hasCaching = features?.includes('caching');
    const hasValidation = features?.includes('validation');
    
    const classBody = methods.map(method => {
      const methodCode = this.generateMethod(method, features);
      return this.wrapWithErrorHandling(methodCode, method, hasErrorHandling, hasLogging, hasValidation);
    }).join('\n\n');

    return `
export ${type === 'singleton' ? 'class' : 'abstract class'} ${name} {
  ${hasCaching ? 'private cache: Map<string, any> = new Map();\n' : ''}
  ${hasLogging ? 'private logger = new Logger("' + name + '");\n' : ''}
  
  ${classBody}
}`;
  }

  private generateMethod(method: MethodDefinition, features?: string[]): string {
    const hasCaching = features?.includes('caching');
    const params = method.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
    const cacheKey = this.generateCacheKey(method.name, method.parameters);

    let methodCode = `
  ${method.isAsync ? 'async ' : ''}${method.name}(${params})${method.returnType ? `: ${method.returnType}` : ''} {`;
    
    if (hasCaching && method.name.startsWith('get')) {
      methodCode += `
    const cacheKey = '${cacheKey}';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;`;
    }
    
    methodCode += this.generateMethodBody(method);
    
    if (hasCaching && method.name.startsWith('get')) {
      methodCode += `
    this.cache.set(cacheKey, result);`;
    }
    
    if (method.returnType !== 'void') {
      methodCode += '\n    return result;';
    }
    
    methodCode += '\n  }';
    
    return methodCode;
  }
}
```

## Refactoring Strategies

### Extract Method
```typescript
// scripts/refactoring/extract-method.ts
class ExtractMethodRefactoring {
  extractMethod(code: string, startLine: number, endLine: number, methodName: string): RefactoringResult {
    const lines = code.split('\n');
    const extractedLines = lines.slice(startLine - 1, endLine);
    const extractedCode = extractedLines.join('\n');
    
    // メソッド抽出
    const newMethod = this.generateMethod(extractedCode, methodName);
    
    // 元のコードを修正
    const methodCall = this.generateMethodCall(methodName, extractedLines);
    lines.splice(startLine - 1, endLine - startLine + 1, methodCall);
    
    return {
      modifiedCode: lines.join('\n'),
      extractedMethod: newMethod,
      applied: true
    };
  }

  private generateMethod(code: string, methodName: string): string {
    const params = this.detectParameters(code);
    const returnType = this.detectReturnType(code);
    
    return `private ${methodName}(${params})${returnType} {
  ${code}
}`;
  }
}
```

### Convert to TypeScript
```typescript
// scripts/refactoring/typescript-converter.ts
class TypeScriptConverter {
  convertJavaScript(jsCode: string): string {
    // 型注釈の追加
    const typedCode = this.addTypeAnnotations(jsCode);
    
    // インターフェース抽出
    const interfaces = this.extractInterfaces(typedCode);
    
    // プロパティ型定義
    const typedProps = this.addPropTypes(typedCode);
    
    return `${interfaces}\n\n${typedProps}`;
  }

  private addTypeAnnotations(code: string): string {
    // 関数パラメータに型を追加
    code = code.replace(/function (\w+)\(([^)]*)\)/g, (match, name, params) => {
      const typedParams = this.typeParameters(params);
      return `function ${name}(${typedParams})`;
    });
    
    // 変数宣言に型を追加
    code = code.replace(/const (\w+) = (.+?)(?:;|,)/g, (match, name, value) => {
      const type = this.inferType(value);
      return `const ${name}: ${type} = ${value};`;
    });
    
    return code;
  }

  private inferType(value: string): string {
    // 基本的な型推論
    if (value.includes('=>') || value.includes('function')) return 'Function';
    if (value.includes('[') && value.includes(']')) return 'any[]';
    if (value.includes('new Date()')) return 'Date';
    if (value.includes('true') || value.includes('false')) return 'boolean';
    if (value.includes('\'') || value.includes('"')) return 'string';
    if (!isNaN(parseFloat(value))) return 'number';
    return 'any';
  }
}
```

### Component Refactoring
```typescript
// scripts/refactoring/component-refactor.ts
class ComponentRefactoring {
  refactorLargeComponent(componentCode: string): RefactoringResult {
    const issues = this.analyzeComponent(componentCode);
    const refactorings: string[] = [];
    
    // コンポーネント分割
    if (issues.includes('too-many-lines')) {
      const splitComponents = this.extractSubComponents(componentCode);
      refactorings.push(...splitComponents);
    }
    
    // カスタムフック抽出
    if (issues.includes('complex-logic')) {
      const hooks = this.extractHooks(componentCode);
      refactorings.push(...hooks);
    }
    
    // Propsの型定義
    if (issues.includes('untyped-props')) {
      const types = this.generatePropTypes(componentCode);
      refactorings.push(types);
    }
    
    return {
      issues,
      refactorings,
      improvedCode: this.applyRefactorings(componentCode, refactorings)
    };
  }

  private extractSubComponents(code: string): string[] {
    const components: string[] = [];
    
    // 大きなJSXブロックを検出して抽出
    const jsxBlocks = this.findJSXBlocks(code);
    jsxBlocks.forEach((block, index) => {
      const componentName = `SubComponent${index + 1}`;
      const props = this.extractProps(block);
      const component = this.createComponent(componentName, props, block);
      components.push(component);
    });
    
    return components;
  }

  private extractHooks(code: string): string[] {
    const hooks: string[] = [];
    
    // useEffectの複雑なロジックを抽出
    const complexEffects = this.findComplexEffects(code);
    complexEffects.forEach((effect, index) => {
      const hookName = `useEffectLogic${index + 1}`;
      const hook = this.createCustomHook(hookName, effect);
      hooks.push(hook);
    });
    
    return hooks;
  }
}
```

## Architecture Improvement

### Clean Architecture Implementation
```typescript
// scripts/architecture/clean-architecture.ts
class CleanArchitectureGenerator {
  generateLayer(layer: LayerType, entities: Entity[]): string {
    switch (layer) {
      case 'domain':
        return this.generateDomainLayer(entities);
      case 'application':
        return this.generateApplicationLayer(entities);
      case 'infrastructure':
        return this.generateInfrastructureLayer(entities);
      case 'presentation':
        return this.generatePresentationLayer(entities);
      default:
        return '';
    }
  }

  private generateDomainLayer(entities: Entity[]): string {
    return entities.map(entity => {
      // エンティティ生成
      const entityCode = this.generateEntity(entity);
      
      // リポジトリインターフェース生成
      const repositoryCode = this.generateRepositoryInterface(entity);
      
      // ドメインサービス生成
      const serviceCode = this.generateDomainService(entity);
      
      return `${entityCode}\n\n${repositoryCode}\n\n${serviceCode}`;
    }).join('\n\n');
  }

  private generateEntity(entity: Entity): string {
    const properties = entity.properties.map(prop => 
      `  ${prop.name}: ${prop.type}${prop.optional ? '?' : ''};`
    ).join('\n');
    
    return `
export interface ${entity.name} {
${properties}

  // ドメインロジック
  isValid(): boolean;
  calculateRisk(): number;
  updateValidation(): void;
}

export class ${entity.name}Entity implements ${entity.name} {
  constructor(
${entity.properties.map(prop => `    private _${prop.name}: ${prop.type}${prop.optional ? '?' : ''}`).join(',\n')}
  ) {}

  ${entity.properties.map(prop => `
  get ${prop.name}(): ${prop.type}${prop.optional ? ' | undefined' : ''} {
    return this._${prop.name};
  }
  
  set ${prop.name}(value: ${prop.type}${prop.optional ? ' | undefined' : ''}) {
    this._${prop.name} = value;
    this.updateValidation();
  }`).join('\n')}

  isValid(): boolean {
    // バリデーションロジック
    return true;
  }

  calculateRisk(): number {
    // リスク計算ロジック
    return 0;
  }

  updateValidation(): void {
    // 検証ロジック
  }
}`;
  }
}
```

### Microservice Architecture
```typescript
// scripts/architecture/microservice.ts
class MicroserviceGenerator {
  generateMicroservice(spec: MicroserviceSpec): MicroserviceResult {
    const { name, domain, endpoints, database, dependencies } = spec;
    
    return {
      apiGateway: this.generateApiGateway(name, endpoints),
      service: this.generateService(name, domain, endpoints),
      database: this.generateDatabaseSchema(name, database),
      docker: this.generateDockerConfig(name),
      kubernetes: this.generateKubernetesConfig(name),
      monitoring: this.generateMonitoringSetup(name)
    };
  }

  private generateService(name: string, domain: string, endpoints: Endpoint[]): string {
    return `
// ${name} Microservice

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

${endpoints.map(endpoint => this.generateEndpoint(endpoint)).join('\n\n')}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: '${name}', timestamp: new Date().toISOString() });
});

export default app;
    `.trim();
  }

  private generateDockerConfig(name: string): string {
    return `
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
    `.trim();
  }
}
```

## Automated Testing Generation

### Test Generation
```typescript
// scripts/testing/test-generator.ts
class TestGenerator {
  generateTests(code: string, type: 'unit' | 'integration' | 'e2e'): string {
    switch (type) {
      case 'unit':
        return this.generateUnitTests(code);
      case 'integration':
        return this.generateIntegrationTests(code);
      case 'e2e':
        return this.generateE2ETests(code);
      default:
        return '';
    }
  }

  private generateUnitTests(code: string): string {
    const functions = this.extractFunctions(code);
    const classes = this.extractClasses(code);
    
    const functionTests = functions.map(func => this.generateFunctionTest(func));
    const classTests = classes.map(cls => this.generateClassTest(cls));
    
    return `
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

${functionTests.join('\n\n')}

${classTests.join('\n\n')}
    `.trim();
  }

  private generateFunctionTest(func: FunctionDefinition): string {
    const testCases = this.generateTestCases(func);
    
    return `
describe('${func.name}', () => {
  ${testCases.map(test => `
  it('${test.description}', () => {
    // Arrange
    ${test.arrange}
    
    // Act
    const result = ${func.name}(${test.call});
    
    // Assert
    ${test.assert}
  });`).join('\n')}
});
    `.trim();
  }

  private generateE2ETests(code: string): string {
    const pages = this.extractPageComponents(code);
    
    return `
import { test, expect } from '@playwright/test';

${pages.map(page => `
test.describe('${page.name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${page.url}');
  });

  test('should load successfully', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  ${page.elements.map(element => `
  test('should display ${element.description}', async ({ page }) => {
    await expect(page.locator('${element.selector}')).toBeVisible();
  }`).join('\n')});
});
`).join('\n')}
    `.trim();
  }
}
```

このエージェントはコード生成、リファクタリング、アーキテクチャ改善を自動化し、開発効率とコード品質を向上させます。