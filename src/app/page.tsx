'use client'

import EventLobby from '@/components/EventLobby'

export default function PlayerLobbyPage() {
    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <h1 style={{ fontFamily: 'sans-serif', marginBottom: 20 }}>Player Lobby</h1>
            <EventLobby />
        </div>
    )
}
