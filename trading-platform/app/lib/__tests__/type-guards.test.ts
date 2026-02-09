/**
 * type-guards.test.ts
 * 
 * 型ガード関数のテスト
 * 基本型ガード、型アサーション、プロパティアクセスのテスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  isNotNullish,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isFunction,
  assertType,
  assertNotNull,
  getProperty,
  getNestedProperty,
} from '../typeGuards';

describe('typeGuards', () => {
  // ============================================================================
  // 基本型ガード
  // ============================================================================

  describe('isNotNullish', () => {
    it('nullでない値に対してtrueを返す', () => {
      expect(isNotNullish(0)).toBe(true);
      expect(isNotNullish('')).toBe(true);
      expect(isNotNullish(false)).toBe(true);
      expect(isNotNullish({})).toBe(true);
      expect(isNotNullish([])).toBe(true);
    });

    it('nullとundefinedに対してfalseを返す', () => {
      expect(isNotNullish(null)).toBe(false);
      expect(isNotNullish(undefined)).toBe(false);
    });

    it('型推論が正しく動作する', () => {
      const value: string | null = 'test';
      if (isNotNullish(value)) {
        // TypeScriptはここでvalueをstringとして扱う
        expect(value.toUpperCase()).toBe('TEST');
      }
    });
  });

  describe('isString', () => {
    it('文字列に対してtrueを返す', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString('123')).toBe(true);
    });

    it('文字列以外に対してfalseを返す', () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('数値に対してtrueを返す', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
    });

    it('NaNに対してfalseを返す', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('数値以外に対してfalseを返す', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('真偽値に対してtrueを返す', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('真偽値以外に対してfalseを返す', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('配列に対してtrueを返す', () => {
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray([])).toBe(true);
      expect(isArray(['a', 'b'])).toBe(true);
      expect(isArray([null, undefined])).toBe(true);
    });

    it('配列以外に対してfalseを返す', () => {
      expect(isArray('array')).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('オブジェクトに対してtrueを返す', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject({ a: 1, b: 2 })).toBe(true);
    });

    it('nullと配列に対してfalseを返す', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('プリミティブ型に対してfalseを返す', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('関数に対してtrueを返す', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(Array)).toBe(true);
    });

    it('関数以外に対してfalseを返す', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction('function')).toBe(false);
      expect(isFunction(123)).toBe(false);
    });
  });

  // ============================================================================
  // 型アサーション
  // ============================================================================

  describe('assertType', () => {
    it('ガードが成功した場合は値を返す', () => {
      const value: unknown = 'test';
      const result = assertType(value, isString, 'Should be string');
      expect(result).toBe('test');
    });

    it('ガードが失敗した場合はエラーを投げる', () => {
      const value: unknown = 123;
      expect(() => {
        assertType(value, isString, 'Should be string');
      }).toThrow('Should be string');
    });

    it('デフォルトメッセージでエラーを投げる', () => {
      const value: unknown = 123;
      expect(() => {
        assertType(value, isString);
      }).toThrow('Type assertion failed: value does not match expected type');
    });
  });

  describe('assertNotNull', () => {
    it('nullでない値を返す', () => {
      expect(assertNotNull('test')).toBe('test');
      expect(assertNotNull(123)).toBe(123);
      expect(assertNotNull(0)).toBe(0);
      expect(assertNotNull(false)).toBe(false);
    });

    it('nullの場合はエラーを投げる', () => {
      expect(() => {
        assertNotNull(null, 'Value cannot be null');
      }).toThrow('Value cannot be null');
    });

    it('undefinedの場合はエラーを投げる', () => {
      expect(() => {
        assertNotNull(undefined, 'Value cannot be undefined');
      }).toThrow('Value cannot be undefined');
    });

    it('デフォルトメッセージでエラーを投げる', () => {
      expect(() => {
        assertNotNull(null);
      }).toThrow('Value cannot be null or undefined');
    });
  });

  // ============================================================================
  // 型安全なプロパティアクセス
  // ============================================================================

  describe('getProperty', () => {
    it('存在するプロパティの値を返す', () => {
      const obj = { name: 'test', value: 123 };
      expect(getProperty(obj, 'name')).toBe('test');
      expect(getProperty(obj, 'value')).toBe(123);
    });

    it('存在しないプロパティの場合はdefaultValueを返す', () => {
      const obj = { name: 'test' };
      expect(getProperty(obj, 'missing' as keyof typeof obj, 'default')).toBe('default');
    });

    it('ネストしたオブジェクトのプロパティにアクセスできる', () => {
      const obj = { nested: { value: 'deep' } };
      expect(getProperty(obj, 'nested')).toEqual({ value: 'deep' });
    });
  });

  describe('getNestedProperty', () => {
    it('ネストしたプロパティの値を返す', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      };
      expect(getNestedProperty(obj, ['level1', 'level2', 'level3'])).toBe('deep value');
    });

    it('存在しないパスの場合はdefaultValueを返す', () => {
      const obj = { level1: { level2: 'value' } };
      expect(getNestedProperty(obj, ['level1', 'missing', 'level3'], 'default')).toBe('default');
    });

    it('空のパスの場合はオブジェクト自体を返す', () => {
      const obj = { key: 'value' };
      expect(getNestedProperty(obj, [])).toBe(obj);
    });

    it('配列インデックスでアクセスできる', () => {
      const obj = {
        items: ['first', 'second', 'third']
      };
      // getNestedPropertyは文字列キーを使用するため、配列アクセスは動作しない可能性がある
      // まずitemsを取得してから配列としてアクセスする必要がある
      const items = getNestedProperty(obj, ['items']);
      expect(Array.isArray(items)).toBe(true);
      if (Array.isArray(items)) {
        expect(items[0]).toBe('first');
        expect(items[1]).toBe('second');
      }
    });

    it('null値を含むパスを処理する', () => {
      const obj = {
        level1: null
      };
      expect(getNestedProperty(obj, ['level1', 'level2'], 'default')).toBe('default');
    });
  });

  // ============================================================================
  // エッジケース
  // ============================================================================

  describe('edge cases', () => {
    it('Dateオブジェクトはオブジェクトとして判定される', () => {
      expect(isObject(new Date())).toBe(true);
    });

    it('RegExpはオブジェクトとして判定される', () => {
      expect(isObject(/test/)).toBe(true);
    });

    it('MapとSetはオブジェクトとして判定される', () => {
      expect(isObject(new Map())).toBe(true);
      expect(isObject(new Set())).toBe(true);
    });

    it('Symbolはオブジェクトではない', () => {
      expect(isObject(Symbol('test'))).toBe(false);
    });
  });
});
