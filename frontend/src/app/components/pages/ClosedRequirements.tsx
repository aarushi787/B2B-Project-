import { RequirementsList } from "../marketplace/RequirementsList";

export function ClosedRequirements() {
  return (
    <RequirementsList
      title="Closed requirements"
      subtitle="Requirements that were awarded to a company or closed without one."
      statuses={["awarded", "closed", "cancelled"]}
      emptyTitle="Nothing closed yet"
      emptyDesc="Requirements move here once you accept a proposal or close them."
    />
  );
}
