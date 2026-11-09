/**
 * The EBU player directory the automated E2E suite runs against.
 *
 * The E2E data directory starts empty, so the player search the join flow uses
 * (`/api/players/search?q=<ebu>`) would find nobody. The prepare step loads this
 * fixed list instead, so tests that seat pairs through the real join UI can
 * search by EBU number deterministically, without depending on whatever EBU
 * download a developer's machine happens to hold.
 *
 * Shared by `e2e-prepare.ts` (writes them) and the Playwright fixtures (which
 * search for them), so the two can never drift.
 */
export interface E2EPlayer {
  ebuNumber: number;
  firstName: string;
  lastName: string;
}

export const E2E_PLAYERS: readonly E2EPlayer[] = [
  { ebuNumber: 477484, firstName: "Jacqueline", lastName: "Collier" },
  { ebuNumber: 404476, firstName: "David", lastName: "Collier" },
  { ebuNumber: 12269, firstName: "Celia", lastName: "Oram" },
  { ebuNumber: 16671, firstName: "Denis", lastName: "King" },
  { ebuNumber: 10008, firstName: "Nigel", lastName: "Freake" },
  { ebuNumber: 10009, firstName: "Bob", lastName: "Cooke" },
  { ebuNumber: 10021, firstName: "Sheila", lastName: "Spencer" },
  { ebuNumber: 10056, firstName: "Keith", lastName: "Ponsford" },
  { ebuNumber: 10077, firstName: "Alan", lastName: "Archer" },
  { ebuNumber: 10079, firstName: "Brenda", lastName: "Bishop" },
  { ebuNumber: 10096, firstName: "Colin", lastName: "Carter" },
  { ebuNumber: 10105, firstName: "Diane", lastName: "Dawson" },
  { ebuNumber: 10117, firstName: "Edward", lastName: "Ellis" },
  { ebuNumber: 10118, firstName: "Fiona", lastName: "Fletcher" },
  { ebuNumber: 10128, firstName: "Gordon", lastName: "Grant" },
  { ebuNumber: 10159, firstName: "Helen", lastName: "Hughes" },
  { ebuNumber: 10169, firstName: "Ian", lastName: "Irving" },
  { ebuNumber: 10183, firstName: "Joan", lastName: "Jarvis" },
  { ebuNumber: 10188, firstName: "Kevin", lastName: "Knight" },
  { ebuNumber: 10204, firstName: "Linda", lastName: "Lewis" },
  { ebuNumber: 10210, firstName: "Martin", lastName: "Moore" },
  { ebuNumber: 10215, firstName: "Nora", lastName: "Nash" },
  { ebuNumber: 10222, firstName: "Oliver", lastName: "Owen" },
  { ebuNumber: 10230, firstName: "Pauline", lastName: "Price" },
] as const;
