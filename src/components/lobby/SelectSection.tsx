import { Section } from "@/model/section";

interface SelectSectionProps {
  sections: Section[];
  selectSection: (sectionId: string) => void;
}

export default function SelectSection({
  sections,
  selectSection,
}: SelectSectionProps) {
  return (
    <>
      {/*    <button onClick={() => setSelectedEvent(null)}>*/}
      {/*    ← Back to Events*/}
      {/*</button>*/}

      <h2>Sections</h2>

      {sections.length === 0 ? (
        <p>No sections available.</p>
      ) : (
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <button onClick={() => selectSection(section.id)}>
                {section.section_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
