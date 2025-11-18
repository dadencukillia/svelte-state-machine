<script lang="ts">
  import { FiniteStateMachine, LinearIncreaseStateRouter } from "svelte-state-machine";

  let title: string = $state("");

  const FSM = new FiniteStateMachine(
    "FetchingData",
    "ProcessingData",
    "DisplayResults",
    "FatalError"
  );

  fetch("https://jsonplaceholder.typicode.com/todos/1")
    .then(response => {
      FSM.next(LinearIncreaseStateRouter);
      return response.json();
    })
    .then(json => {
      title = json.title;
      
      FSM.next(LinearIncreaseStateRouter); // FSM.state is now DisplayResults
    })
    .catch(error => {
      console.error(error);
      
      FSM.state = FSM.enum.FatalError;
    });
</script>

<h1>{FSM.match(
  [FSM.enum.FetchingData, () => "Fetching..."],
  [FSM.enum.ProcessingData, () => "Processing..."],
  [FSM.enum.DisplayResults, () => title],
  [FSM.enum.FatalError, () => "Something went wrong..."],
)}</h1>
