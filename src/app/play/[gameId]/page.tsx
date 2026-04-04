import { RoundInfoPage } from "@/components/pages/play/RoundInfoPage";

export default function PlayGame() {
  return <RoundInfoPage round={2} table={3} boards={[1,2,3]} players={{
      N: {
          firstName: 'Jacqui',
          lastName: 'Collier'
      },
      S: {
          firstName: 'David',
          lastName: 'Collier'
      },
      W: {
          firstName: 'Peter',
          lastName: 'Collier'
  },
      E: {
          firstName: 'Nye',
          lastName: 'Collier'
  }
  }} onEnterRound={() => {}} />;
}
