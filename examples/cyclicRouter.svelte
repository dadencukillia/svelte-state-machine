<script lang="ts">
  import { FiniteStateMachine, type StatesRouter } from "svelte-state-machine";

  const FSM = new FiniteStateMachine(
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth"
  );

  const cyclicRouter: StatesRouter = {
    stateFor(state) {
      switch (state) { // Map definition
        case FSM.enum.First: return FSM.enum.Second;
        case FSM.enum.Second: return FSM.enum.Third;
        case FSM.enum.Third: return FSM.enum.Fourth;
        case FSM.enum.Fourth: return FSM.enum.Fifth;
        case FSM.enum.Fifth: return FSM.enum.First; // Cycle back
        default: return state; // Stay in the current state if not mapped
      }
    }
  };
</script>

<h1>State: {FSM.match(
  [FSM.enum.First, () => "First"],
  [FSM.enum.Second, () => "Second"],
  [FSM.enum.Third, () => "Third"],
  [FSM.enum.Fourth, () => "Fourth"],
  [FSM.enum.Fifth, () => "Fifth"],
)}</h1>

<button onclick={ () => FSM.next(cyclicRouter) }>Next</button>
