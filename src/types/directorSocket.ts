export interface OptimisticDirectorEvent extends DirectorEvent {
    clientId?: string
    pending?: boolean
    error?: string
}

// Full DirectorEvent type from the server
export interface DirectorEvent {
    id: string
    event_name: string
    director: string
    scoring_type: string
}

// Events the client emits to the server
export interface DirectorClientToServerEvents {
    "director:createEvent": (
        event: Omit<DirectorEvent, "id">,
        callback: (response: { success: boolean; error?: string }) => void
    ) => void
}

// Events the server emits to the client
export interface DirectorServerToClientEvents {
    "event:created": (event: DirectorEvent & { clientId?: string }) => void
}
