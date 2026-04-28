/**
 * Logger module — minimal test harness.
 *
 * jest-expo defines `__DEV__ = true`, so the dev branch is exercised.
 * The prod branch is tested by reloading the module with `__DEV__` swapped.
 */

describe('logger', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.resetModules();
  });

  describe('in dev (__DEV__ = true)', () => {
    test('info forwards to console.log with [INFO] prefix', () => {
      const { logger } = require('../logger') as typeof import('../logger');
      logger.info('hello', 1);
      expect(logSpy).toHaveBeenCalledWith('[INFO]', 'hello', 1);
    });

    test('warn forwards to console.warn with [WARN] prefix', () => {
      const { logger } = require('../logger') as typeof import('../logger');
      logger.warn('careful');
      expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'careful');
    });

    test('error forwards to console.error with [ERROR] prefix', () => {
      const { logger } = require('../logger') as typeof import('../logger');
      const err = new Error('boom');
      logger.error('failed', err);
      expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'failed', err);
    });
  });

  describe('in prod (__DEV__ = false)', () => {
    let originalDev: boolean;

    beforeEach(() => {
      originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    test('info is a no-op (does not call console.log)', () => {
      jest.isolateModules(() => {
        const { logger } = require('../logger') as typeof import('../logger');
        logger.info('hello');
        expect(logSpy).not.toHaveBeenCalled();
      });
    });

    test('warn is a no-op', () => {
      jest.isolateModules(() => {
        const { logger } = require('../logger') as typeof import('../logger');
        logger.warn('hey');
        expect(warnSpy).not.toHaveBeenCalled();
      });
    });

    test('error is a no-op', () => {
      jest.isolateModules(() => {
        const { logger } = require('../logger') as typeof import('../logger');
        logger.error('boom');
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });
  });
});
