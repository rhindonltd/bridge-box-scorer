"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type StepDef<State> = {
  canEnter?: (state: State) => boolean;
};

export type FlowDefinition<State> = Record<string, StepDef<State>>;

export function createFlow<State>(
  steps: FlowDefinition<State>,
  order: readonly (keyof typeof steps & string)[],
) {
  type Step = (typeof order)[number];

  return {
    steps,
    order,

    getDefaultStep(): Step {
      return order[0];
    },

    canEnter(step: Step, state: State) {
      const def = steps[step];
      return def?.canEnter ? def.canEnter(state) : true;
    },
  };
}

type AnyFlow<TState> = {
  steps: Record<string, { canEnter?: (state: TState) => boolean }>;
  order: readonly string[];
  getDefaultStep: () => string;
  canEnter: (step: string, state: TState) => boolean;
};

export function useFlow<TState, TFlow extends AnyFlow<TState>>(
  flow: TFlow,
  state: TState,
  basePath: string,
) {
  const router = useRouter();
  const params = useSearchParams();

  type Step = TFlow["order"][number];

  const rawStep = (params.get("step") as Step) ?? flow.getDefaultStep();

  const step = useMemo(() => {
    if (!flow.canEnter(rawStep, state)) {
      return flow.getDefaultStep() as Step;
    }
    return rawStep;
  }, [rawStep, state, flow]);

  function goTo(next: Step) {
    if (!flow.canEnter(next, state)) return;
    router.push(`${basePath}?step=${next}`);
  }

  function next() {
    const index = flow.order.indexOf(step);
    const nextStep = flow.order[index + 1];
    if (nextStep) goTo(nextStep as Step);
  }

  function back() {
    const index = flow.order.indexOf(step);
    const prevStep = flow.order[index - 1];
    if (prevStep) goTo(prevStep as Step);
  }

  return {
    step,
    goTo,
    next,
    back,
  };
}
