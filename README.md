# ⚛️ Svelte Rune-Powered Finite State Machine (FSM)

This is a **strongly typed** and **highly reactive** implementation of a Finite State Machine designed for **Svelte 5+** using **Runes (`$state`)**.

It leverages the **Strategy Pattern** via the `StatesRouter` interface to decouple transition logic from the core FSM class, improving maintainability and testability.

## 📦 Installation
This project is published on [npm](https://www.npmjs.com/package/svelte-state-machine), so you can use it with this command:
```bash
npm i svelte-state-machine
```

## ✨ Key Features

* **Svelte Reactivity:** Uses `$state` principles to ensure state changes automatically update Svelte components.
* **Strong Typing:** States are defined as string literals, providing auto-completion and compile-time safety.
* **Strategy Pattern (`StatesRouter`):** Allows defining complex, reusable transition logic (e.g., linear, cyclic, error handling jumps) outside the FSM core.
* **Pattern Matching:** The `match<T>()` utility simplifies rendering logic by mapping state indices to return values (a TypeScript equivalent of a switch-case).

## 🚀 Usage Example

```typescript
<script lang="ts">
  // 1. Imports: Bring in the FSM class and the default linear router strategy.
  import { FiniteStateMachine, LinearIncreaseStateRouter } from "$lib/finiteStateMachine.svelte";

  // 2. Reactive State: Declare a reactive Svelte state using the $state rune.
  // This variable will hold the data fetched from the API.
  let title: string = $state("");

  // 3. FSM Initialization: Create a new FSM instance.
  // The states define the lifecycle of the data fetching process.
  const FSM = new FiniteStateMachine(
    "FetchingData",
    "ProcessingData",
    "DisplayResults",
    "FatalError"
  );

  // Initial check: The FSM starts at the first declared state (index 0).
  console.log(FSM.state === FSM.enum.FetchingData); // Output: true

  // 4. State-Driven Async Logic: Start the API request.
  fetch("https://jsonplaceholder.typicode.com/todos/1")
    .then(response => {
      // State Transition 1: Data received, now processing.
      // Use the router strategy to move to the next sequential state (index + 1).
      FSM.next(LinearIncreaseStateRouter);
      return response.json();
    })
    .then(json => {
      // Update the reactive variable 'title' with the fetched data.
      title = json.title;
      
      // State Transition 2: Processing complete, ready to display results.
      FSM.next(LinearIncreaseStateRouter); // FSM.state is now DisplayResults
    })
    .catch(error => {
      // Error Handling: If any promise fails, transition immediately to the error state.
      console.error(error);
      
      // Direct state assignment (bypassing the router) to jump to the error state.
      FSM.state = FSM.enum.FatalError;
    });
</script>

<h1>{FSM.match(
  // Match 1: If FetchingData, display loading message.
  [FSM.enum.FetchingData, () => "Fetching..."],
  
  // Match 2: If ProcessingData, display processing message.
  [FSM.enum.ProcessingData, () => "Processing..."],
  
  // Match 3: If DisplayResults, render the reactive 'title' variable.
  [FSM.enum.DisplayResults, () => title],
  
  // Match 4: If FatalError, display the error message.
  [FSM.enum.FatalError, () => "Something went wrong..."],
  
  // Note: FSM.match automatically handles the current FSM.state, 
  // ensuring the UI always reflects the correct stage of the async operation.
)}</h1>
