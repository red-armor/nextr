import { isFunction } from './utils';
import { Fn } from './types';

const isCoError = (error: Error) => {
  return /Co Exception/.test(error.message);
};

const buildCoError = (fn: Function, error: Error) => {
  const message = error.message;
  const functionName = fn.name || String(fn).slice(0, 10);
  const coErrorMessage = `[Co Exception ${functionName}]: ${message}`;
  error.message = coErrorMessage;
  return error;
};

class Runner {
  public fn: Function;
  public ancestor: null | Runner;
  public prevSibling: null | Runner;
  public nextSibling: null | Runner;

  public onError: undefined | Function;
  public onSuccess: undefined | Function;
  public onFinish: undefined | Function;

  constructor({
    fn,
    ancestor,
    onError,
    onSuccess,
    onFinish,
  }: {
    fn: Function;
    ancestor: null | Runner;
    onError?: Function;
    onSuccess?: Function;
    onFinish?: Function;
  }) {
    this.prevSibling = null;
    this.nextSibling = null;
    this.fn = fn;
    this.ancestor = ancestor;

    this.onError = onError;
    this.onSuccess = onSuccess;
    this.onFinish = onFinish;
  }

  run(options: any[]): void {
    const len = this.fn.length;
    let args = options.concat({
      abort: () => {
        if (isFunction(this.onError)) (this.onError as Function)();
        if (isFunction(this.onFinish)) (this.onFinish as Function)();
      },
      back: () => {
        if (this.prevSibling) this.prevSibling.run(options);
      },
      resume: () => {
        if (this.prevSibling) this.prevSibling.upstream(options);
      },
      next: () => {
        if (this.nextSibling) {
          this.nextSibling.run(options);
          return;
        }

        if (isFunction(this.onSuccess)) (this.onSuccess as Function)();
        if (isFunction(this.onFinish)) (this.onFinish as Function)();
      },
    });

    // If runner is in the middle, the last one should be `actions`,
    // so args is truncate from end..
    if (this.nextSibling) {
      args = args.slice(-len);
    } else {
      // if len is 1, arg will be context value.
      if (len === 1) args = args.slice(-2, -1);
    }

    try {
      this.fn.apply(this, args);
    } catch (err) {
      // console.log('err ', isCoError(err as Error), err)
      if (isCoError(err as Error)) {
        throw err;
      }
      throw buildCoError(this.fn, err as Error);
    }
  }

  setPrevSibling(runner: Runner) {
    this.prevSibling = runner;
  }

  setNextSibling(runner: Runner) {
    this.nextSibling = runner;
  }

  upstream(options: any[]): void {
    if (this.prevSibling) this.prevSibling.upstream(options);
    else this.run(options);
  }
}

class Co {
  public current: null | Runner;
  public ancestor: null | Runner;
  public ctx: object | Function;

  constructor(options?: { ctx: object }) {
    this.current = null;
    this.ancestor = null;
    this.ctx = options ? options.ctx : {};
  }

  useFn(fn: Function, ancestor: null | Runner) {
    const runner = new Runner({ fn, ancestor });
    if (!this.ancestor) {
      this.ancestor = runner;
    }

    if (this.current) {
      this.current.setNextSibling(runner);
      runner.setPrevSibling(this.current);
    }

    this.current = runner;
  }

  // private useOne<T1>(
  //   fn: (arg1: T1, ctx: object, actions: actions) => void
  // ): void;
  // private useOne<T1, T2>(
  //   fn: (arg1: T1, arg2: T2, ctx: object, actions: actions) => void
  // ): void;
  // private useOne<T1, T2, T3>(
  //   fn: (arg1: T1, arg2: T2, arg3: T3, ctx: object, actions: actions) => void
  // ): void;
  // private useOne<T1, T2, T3, T4>(
  //   fn: (
  //     arg1: T1,
  //     arg2: T2,
  //     arg3: T3,
  //     arg4: T4,
  //     ctx: object,
  //     actions: actions
  //   ) => void
  // ): void;
  /**
   *
   * @param fn copy middleware function if fn is a co object.
   */
  private useOne(fn: Fn | Co): void {
    if (fn instanceof Co) {
      let runner = fn.ancestor;
      while (runner) {
        this.useFn(runner.fn, this.ancestor);
        runner = runner.nextSibling;
      }
    } else if (typeof fn === 'function') {
      this.useFn(fn, this.ancestor);
    }
  }

  /**
   *
   * @param args could be array of function or Co object. When arg is a Co object,
   * its middleware functions will be copied to new Co object.
   */
  public use(...args: (Fn | Co)[]): Co {
    args.forEach(fn => this.useOne(fn));
    return this;
  }

  public start(...args: any[]): object {
    let contextArg = this.ctx;
    if (typeof contextArg === 'function')
      contextArg = (this.ctx as Function).call(null);

    if (this.ancestor) this.ancestor.run(args.concat(contextArg));
    return contextArg;
  }
}

export default Co;
