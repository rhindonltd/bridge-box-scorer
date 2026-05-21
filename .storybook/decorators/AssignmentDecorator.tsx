import {
  AssignmentContext,
  AssignmentSelection,
} from "@/context/AssignmentContext";

export const withAssignment =
  (assignmentSelection: AssignmentSelection) => (Story: any) => (
    <AssignmentContext.Provider
      value={{
        assignmentSelection,
        selectAssignment: () => {},
        clearAssignment: () => {},
      }}
    >
      <Story />
    </AssignmentContext.Provider>
  );
