import { ActionSchema, dispatch, type ActionResult, type GameState } from '@scryglass/core';

export function dispatchLocalAgentMessage(state: GameState, message: string): ActionResult | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }

  const action = ActionSchema.safeParse(parsed);
  if (!action.success) {
    return null;
  }

  return dispatch(state, action.data);
}
