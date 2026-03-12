import { BridgeEvent } from "@/db/schema";

// Events the client emits to the server
export interface DirectorClientToServerEvents {

}

// Events the server emits to the client
export interface DirectorServerToClientEvents {
  "event:created": (event: BridgeEvent) => void;
  "session:created": (sessionId: string) => void;
}
