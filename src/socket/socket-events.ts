export const SocketEvents = {
  // Client initiated - Global
  CREATE_GAME: "create-game",
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PAIR: "game:createPair",
  SELECT_SEAT: "game:selectSeat",
  SELECT_MOVEMENT: "game:selectMovement",
  LEAVE_GAME: "game:leave",

  // Server initiated - Global
  JOINABLE_GAMES: "joinable-games",

  // Server initiated - Game specific
  STARTING_POSITIONS: "game:startingPositions",
} as const;
