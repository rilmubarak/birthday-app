import { delay } from "../utils/helper";

jest.useFakeTimers();

describe("delay function", () => {
  it("delays the execution by a specified amount of time", () => {
    const ms = 1000; // Set the delay time in milliseconds (1000ms = 1 second)
    const mockFn = jest.fn();

    delay(ms).then(mockFn); // Call the delay function, which will resolve after the specified delay

    // At this point in time, the promise should not have resolved yet, 
    // so mockFn should not have been called
    expect(mockFn).not.toHaveBeenCalled();

    // Simulate the passage of time by advancing the timers by `ms` milliseconds
    jest.advanceTimersByTime(ms);

    // Now the promise should resolve and call mockFn
    return Promise.resolve().then(() => {
      expect(mockFn).toHaveBeenCalled();
    });
  });
});
