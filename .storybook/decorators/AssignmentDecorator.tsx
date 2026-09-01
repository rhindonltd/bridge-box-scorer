import React from "react";
import { AssignmentContext } from "@/context/AssignmentContext";
import { Assignment } from "@/model/participants";

export const withAssignment = (assignment: Assignment) => {
  function AssignmentDecorator({ children }: { children: React.ReactNode }) {
    return (
      <AssignmentContext.Provider value={{ assignment, isLoading: false }}>
        {children}
      </AssignmentContext.Provider>
    );
  }
  AssignmentDecorator.displayName = "AssignmentDecorator";

  return function StoryWrapper(Story: React.ComponentType) {
    return (
      <AssignmentDecorator>
        <Story />
      </AssignmentDecorator>
    );
  };
};
