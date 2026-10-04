import { RequirementsList } from "../marketplace/RequirementsList";

export function ActiveRequirements() {
  return (
    <RequirementsList
      title="Active requirements"
      subtitle="Work you have posted that is still open for proposals."
      statuses={["open"]}
      emptyTitle="You have no open requirements"
      emptyDesc="Describe what you need and companies can send you proposals to compare."
      showPostButton
    />
  );
}
