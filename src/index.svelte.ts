type stateChangeListener<T extends readonly string[]> = (fsm: FiniteStateMachine<T>, previousState: number, newState: number) => void;

/**
 * Interface for the Strategy Pattern, defining the rules for state transitions within the Finite State Machine (FSM).
 * * This interface is used as an argument for the FiniteStateMachine.next method.
 * 
 * @example
 * Defines a router that changes FSM states in a cycle: "First" -> "Second" -> "Third" -> "Fourth" -> "Fifth" -> "First" -> and all again
 * ```ts
 * const FSM = new FiniteStateMachine(
 *  "First",
 *  "Second",
 *  "Third",
 *  "Fourth",
 *  "Fifth"
 * );
 *
 * const cyclicRouter: StatesRouter = {
 *  stateFor(state) {
 *    switch (state) { // Map definition
 *      case FSM.enum.First: return FSM.enum.Second;
 *      case FSM.enum.Second: return FSM.enum.Third;
 *      case FSM.enum.Third: return FSM.enum.Fourth;
 *      case FSM.enum.Fourth: return FSM.enum.Fifth;
 *      case FSM.enum.Fifth: return FSM.enum.First; // Cycle back
 *      default: return state; // Stay in the current state if not mapped
 *    }
 *  }
 * };
 *
 * console.log(FSM.state === FSM.enum.First); // Output: true
 * FSM.next(cyclicRouter);
 * console.log(FSM.state === FSM.enum.Second); // Output: true
 * ```
 */
export interface StatesRouter {
  /**
    * Calculates the next state based on the current state.
    * * Implement this method to define custom transition rules (e.g., linear progression, skipping states, or cycling back after an error).
    *
    * @param {number} state The current state.
    * @returns The calculated next state. 
    */
  stateFor(state: number): number;
}

/**
 * A built-in StatesRouter that implements a simple linear forward transition.
 * * This router always moves the FSM to the next consecutive state.
 * * Note: Boundary checks (preventing overflow beyond the last state) are handled by the FSM class, not the router itself.
 */
export const LinearIncreaseStateRouter: StatesRouter = {
  stateFor(state) {
      return state + 1;
  },
};

/**
 * A built-in StatesRouter that implements a simple linear backward transition.
 * * This router always moves the FSM to the previous consecutive state.
 * * Note: Boundary checks (preventing underflow beyond the first state) are handled by the FSM class, not the router itself.
 */
export const LinearDecreaseStateRouter: StatesRouter = {
  stateFor(state) {
      return state - 1;
  },
};

/**
 * A generic implementation of a Finite State Machine (FSM) that manages state transitions and notifies listeners upon state changes.
 * * It uses Svelte Runes ($state) to ensure reactivity within Svelte components.
 *
 * @template TStates A tuple of string literals representing all possible states of the FSM.
 *
 * @example
 * Simple svelte application
 * ```svelte
 * <script lang="ts">
 *  // ...
 *  
 *  const FSM = new FiniteStateMachine(
 *    "First",
 *    "Second",
 *    "Third"
 *  );
 *
 *  const next = () => {
 *    FSM.next(LinearIncreaseStateRouter);
 *  };
 *
 *  const previous = () => {
 *    FSM.next(LinearDecreaseStateRouter);
 *  }
 * </script>
 *
 * <h1>{FSM.match(
 *  [FSM.enum.First, () => "First state"],
 *  [FSM.enum.Second, () => "Second state"],
 *  [FSM.enum.Third, () => "Third state"],
 *  [null, () => "Unknown state"],
 * )}</h1>
 *
 * <button onclick={ previous }>{ "<<" }</button>
 * <button onclick={ next }>{ ">>" }</button>
 * ```
 */
export class FiniteStateMachine<
  TStates extends readonly string[]
> {
  private _states: TStates; // Stores the array of state names passed during initialization.
  private _enum: { [K in TStates[number]]: number }; // A mapping object (like an enum) where state names (strings) are mapped to their index (number).
  private _currentState: number = $state(0); // The current state of the FSM, stored as a numerical index.
  private _listenersIdAutoincrease = 0; // Autoincrementing counter used to assign unique IDs to state change listeners.
  private _stateChangeListeners: Record<number, stateChangeListener<TStates>> = {}; // A record holding all subscribed state change listeners, keyed by their unique ID.


  /* --------------- *
   * Private methods *
   * --------------- */

  /**
    * Notifies all registered listeners about a state transition.
    * @param {number} previousState The state before the change.
    * @param {number} newState The state after the change.
    */
  private _notifyStateChangeListeners(previousState: number, newState: number) {
    Object.values(this._stateChangeListeners).forEach((listener, _) => {
      listener(this, previousState, newState);
    });
  }

  /* -------------- *
   * Public methods *
   * -------------- */

  /**
    * Initializes the Finite State Machine.
    * @param states The list of unique state names as string literals.
    * @throws FSMInitializationError if the states array is empty.
    */
  public constructor(...states: TStates) {
    if (states.length === 0) {
      throw "FSMInitializationError: State array cannot be empty.";
    }

    this._states = states;
    this._enum = Object.fromEntries(
      states.map((s, i) => [s, i])
    ) as any;
  }

  /**
    * Subscribes a listener function to be called whenever the FSM state changes.
    * @param listener The function to execute on state change.
    * @returns The unique ID for the listener, which can be used for unsubscribing.
    *
    * @example
    * Subscribes on the FSM
    * ```ts
    * FSM.subscribeStateChanges((_fsm, _prevState, _newState) => {
    *   console.log(`State updated!`);
    * });
    * ```
    */
  public subscribeStateChanges(listener: stateChangeListener<TStates>): number {
    const id = this._listenersIdAutoincrease++;
    this._stateChangeListeners[id] = listener;

    return id;
  }

  /**
    * Removes a listener from the subscription list using its ID.
    * @param id The unique ID returned by subscribeStateChanges.
    *
    * @example
    * Unsubscribes from the FSM
    * ```ts
    * // Subscribe first to unsubscribe
    * const listenerId = FSM.subscribeStateChanges((_fsm, _prevState, _newState) => {
    *   console.log(`State updated!`);
    * });
    *
    * // Now we can unsubscribe the listener
    * FSM.unsubscribeStateChanges(listenerId);
    * ```
    */
  public unsubscribeStateChanges(id: number) {
    delete this._stateChangeListeners[id];
  }

  /**
    * Sets the FSM to a new state index.
    * Handles boundary checks (clamping to min/max state index).
    * Triggers notification to listeners only if the state has actually changed.
    *
    * @throws InvalidStateError if the new state is not an integer.
    */
  public set state(newState: number) {
    if (newState >= this._states.length) {
      this.state = this._states.length - 1;
      return;
    }

    if (newState < 0) {
      this.state = 0;
      return;
    }

    if (Math.round(newState) !== newState) {
      throw new Error("InvalidStateError");
    }

    const previousState = this._currentState;
    this._currentState = newState;

    if (previousState !== newState) {
      this._notifyStateChangeListeners(previousState, newState);
    }
  }

  /**
    * Gets the current state of the FSM.
    * @returns The current state.
    *
    * @example
    * It can be used for comparison
    * ```ts
    * FSM.state === FSM.enum.MyState
    * ```
    */
  public get state(): number {
    return this._currentState;
  }

  /**
    * Calculates and transitions the FSM to the next state using a provided StatesRouter.
    * @param router The strategy object defining the transition rule (defaults to LinearIncreaseStateRouter).
    */
  public next(router: StatesRouter = LinearIncreaseStateRouter) {
    this.state = router.stateFor(this._currentState);
  }

  /**
    * Gets the enum-like object mapping state names to their indices.
    * @returns The enumeration of states.
    */
  public get enum(): { [K in TStates[number]]: number } {
    return this._enum;
  }

  /**
    * Matches the current FSM state to a handler function and returns the result.
    * * This provides a clean way to execute logic or render components based on the current state,
    * similar to a switch statement or a pattern match.
    * * Note: It's inspired by Rust's built-in statement.
    *
    * @template T The expected return type of the handler functions.
    *
    * @param handles An array of tuples, where each tuple is [stateIndex | null, handlerFunction].
    * A null index acts as a default 'else' handler.
    *
    * @returns The result of the matching handler function, or null if no match and no 'else' handler exists.
    *
    * @example
    * Example of use
    * ```ts
    * const matchResult = FSM.match(
    *  [FSM.enum.First, () => "First state"],
    *  [FSM.enum.Second, () => "Second state"],
    *  [FSM.enum.Third, () => "Third state"],
    *  [null, () => "Unknown state"],
    * );
    *
    * console.log(typeof matchResult); // Output: "string"
    * ```
    */
  public match<T>(...handles: Array<[number|null, () => T]>): T|null {
    const state = this._currentState;
    let elseHandler: (() => T)|null = null;

    for (const handle of handles) {
      if (handle[0] === state) {
        return handle[1]();
      } else if (handle[0] === null) {
        elseHandler = handle[1];
      }
    }

    if (elseHandler) return elseHandler();

    return null;
  }
}
