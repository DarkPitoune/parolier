import type { MergeDeep } from "type-fest";
import type { Database as DatabaseGenerated } from "./database-generated.types";
import type { Strophe } from "@/assets/types";
export type { Json } from "./database-generated.types";

// Override the type for a specific column in a view:
export type Database = MergeDeep<
  DatabaseGenerated,
  {
    public: {
      Tables: {
        songs: {
          Row: {
            strophes: Strophe[]
            type: 'song' | 'refrain' | 'ordinaire'
          }
        }
      };
    };
  }
>;
