import { AssignmentContext } from "@/context/AssignmentContext";
import { Assignment } from "@/model/participants";

export const withAssignment = (assignment: Assignment) => (Story: any) => (
  <AssignmentContext.Provider
    value={{
      assignment,
    }}
  >
    <Story />
  </AssignmentContext.Provider>
);
