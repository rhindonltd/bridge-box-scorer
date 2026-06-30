export const SocketEvents = {
  // Client initiated - Global
  CREATE_GAME: "create-game",
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PARTICIPANT: "game:createParticipant",
  SELECT_MOVEMENT: "game:selectMovement",
  LEAVE_GAME: "game:leave",

  // Server initiated - Global
  JOINABLE_GAMES: "joinable-games",

  // Server initiated - Game specific
  STARTING_POSITIONS: "game:startingPositions",

  // Server initiated - Timer specific
  CREATE_TIMER: "timer:create",
  START_TIMER: "timer:start",
  PAUSE_TIMER: "timer:pause",
  NEXT_ROUND_TIMER: "timer:nextRound",
  UPDATE_CONFIG_TIMER: "timer:updateConfig",
} as const;
