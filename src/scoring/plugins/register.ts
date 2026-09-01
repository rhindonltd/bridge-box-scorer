/**
 * Importing this module guarantees every scoring plugin has registered itself
 * with the registry. Consumers that resolve plugins via `getPerBoardPlugin` /
 * `getOverallPlugin` / `getCombination` should import this module first.
 *
 * Each plugin module registers itself as an import side effect, so listing it
 * here is all that is required. Plugins are added in subsequent tasks.
 */

// Per-board plugins
import "./per-board/mp";
import "./per-board/x-imp";
import "./per-board/imp";

// Overall plugins
import "./overall/mp";
import "./overall/x-imp";
import "./overall/imp";

export {};
