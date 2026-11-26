/**
 * interchange, pure entry (docs/design/modules.md §11).
 *
 * The file formats the app writes and reads. This entry holds PBN deal files
 * (writing, and parsing for deal import) and is browser-safe. The USEBIO 1.2
 * results writer is the `@/modules/interchange/usebio` entry, because its XML
 * library is server-side only.
 *
 * The module lays results out and computes none of them: every score,
 * ranking and Victory Point it writes is passed in by the caller. No framework
 * or I/O.
 */

// PBN.
export { generatePbn, formatPbnDate, type PbnData } from "./pbn/generate-pbn";
export {
  parsePbnFile,
  type ParsedPbnBoard,
  type ParsedPbnFile,
  type PbnFileError,
} from "./pbn/pbn-file";
