// package com.rhindon.bridgebe.model.movement
//
// import com.rhindon.bridgebe.model.common.*
// import com.rhindon.bridgebe.model.player.Contestants
// import com.rhindon.bridgebe.model.player.IndividualContestants
// import com.rhindon.bridgebe.model.player.PairContestants
// import com.rhindon.bridgebe.model.player.TeamContestants
// import kotlinx.serialization.SerialName
// import kotlinx.serialization.Serializable
//
// @Serializable
// sealed class Movement<T : Round> : MovementSpecification {
//
//     abstract val id: String
//     abstract val boards: Int
//     abstract val numberOfRounds: Int
//     abstract val tables: List<Table<T>>
//
//     companion object {
//         val DUMMY_MOVEMENT = Mitchell("DUMMY", "DUMMY", 0, 0, 0, 0, listOf())
//     }
//
//     val maximumTimesBoardPlayed: Int by lazy {
//         if (tables.isEmpty()) 0 else tables.flatMap { it.rounds.flatMap { it.boards } }.groupingBy { it }.eachCount().maxOf { it.value }
//     }
//
// protected fun getRound(tableNumber: Int, roundNumber: Int) : T? {
//         return tables.firstOrNull{ it.tableNumber == tableNumber }?.rounds?.getOrNull(roundNumber - 1)
// }
//
//     fun getBoardNumbersForTableAndRound(tableNumber: Int, roundNumber: Int): List<Int> {
//         return getRound(tableNumber, roundNumber)?.boards ?: emptyList()
//     }
//
//     abstract fun getPlayersForTableAndRound(tableNumber: Int, roundNumber: Int): Players?
//
//         abstract fun findContestantInRound(roundNumber: Int, contestant: ContestantId): ContestantPosition?
//
//         abstract fun getContestantId(tableNumber: Int, roundNumber: Int, direction: ContestantDirection): ContestantId?
//
//         abstract fun createContestants(): Contestants
//
//     fun maximumSetNumber() : Int {
//         return tables.map { table -> table.rounds.map { it.set }.maxOrNull() ?: 0 }.maxOrNull() ?: 0
//     }
//
//     fun getContestantsForTableAndRound(tableNumber: Int, roundNumber: Int) : TableAndRoundContestants {
//         return TableAndRoundContestants(
//             Pair(
//                 Partnership(Pair(
//                     getContestantId(tableNumber, roundNumber, Direction.NORTH),
//                     getContestantId(tableNumber, roundNumber, Direction.SOUTH),
//                 )),
//                 Partnership(Pair(
//                     getContestantId(tableNumber, roundNumber, Direction.EAST),
//                     getContestantId(tableNumber, roundNumber, Direction.WEST),
//                 ))
//             )
//         )
//     }
//
//     fun getNumberOfResults() : Int {
//         return tables.sumOf { table -> table.rounds.sumOf { round -> round.boards.size } }
//     }
//
//     fun getNumberOfResultsForBoard(board: Int) : Int {
//         return tables.sumOf { table -> table.rounds.sumOf { round -> round.boards.filter { it == board }.size } }
//     }
// }
//
// @Serializable
// sealed class IndividualMovement : Movement<IndividualRound>() {
//
//     abstract val players: Int
//     abstract val playersChangeDirection: Boolean
//
//     override fun getPlayersForTableAndRound(tableNumber: Int, roundNumber: Int): IndividualPlayers? {
//         return getRound(tableNumber, roundNumber)?.let { IndividualPlayers(it.n, it.s, it.e, it.w) }
// }
//
//     override fun findContestantInRound(roundNumber: Int, contestant: ContestantId): ContestantPosition? {
//         if (playersChangeDirection) {
//             tables.forEach{ table ->
//                 val round = table.rounds[roundNumber - 1]
//                 if (round.n == contestant.number)
//                     return ContestantPosition(table.tableNumber, Direction.NORTH)
//                 if (round.s == contestant.number)
//                     return ContestantPosition(table.tableNumber, Direction.SOUTH)
//                 if (round.e == contestant.number)
//                     return ContestantPosition(table.tableNumber, Direction.EAST)
//                 if (round.w == contestant.number)
//                     return ContestantPosition(table.tableNumber, Direction.WEST)
//             }
//             return null
//         } else {
//             val direction = contestant.direction as Direction
//             return tables.firstOrNull{
//         it.rounds[roundNumber - 1].getPlayerNumber(direction) == contestant.number
//     }?.let { ContestantPosition(it.tableNumber, direction) }
// }
// }
//
//     override fun getContestantId(tableNumber: Int, roundNumber: Int, direction: ContestantDirection): ContestantId? {
//         if (direction !is Direction)
//     throw RuntimeException("ContestantDirection must be an individual direction for an individual movement")
//     return getRound(tableNumber, roundNumber)?.let{
//         ContestantId(
//             it.getPlayerNumber(direction),
//         if (playersChangeDirection) direction else null
//     )
//     }
// }
//
//     fun createTables(boardsPerRound: Int) : List<Table<IndividualRound>> {
//         return tables.map { table ->
//         Table(table.tableNumber, table.rounds.map { round ->
//         IndividualRound(
//             Boards.boardNumbersForSet(
//                 round.set,
//                 boardsPerRound
//             ), round.n, round.s, round.e, round.w, round.set
//         )
//     })
//     }
// }
//
//     override fun createContestants(): Contestants {
//         return IndividualContestants()
//     }
// }
//
// @Serializable
// sealed class PairMovement : Movement<PairRound>() {
//
//     abstract val missingPair: Int?
//         abstract val playersChangeDirection: Boolean
//
//     override fun getPlayersForTableAndRound(tableNumber: Int, roundNumber: Int): PairPlayers? {
//         return getRound(tableNumber, roundNumber)?.let { PairPlayers(it.ns, it.ew) }
// }
//
//     override fun findContestantInRound(roundNumber: Int, contestant: ContestantId): ContestantPosition? {
//         if (playersChangeDirection) {
//             tables.forEach { table ->
//                 if (table.rounds[roundNumber - 1].ns == contestant.number)
//                     return ContestantPosition(table.tableNumber, PairDirection.NS)
//                 if (table.rounds[roundNumber - 1].ew == contestant.number)
//                     return ContestantPosition(table.tableNumber, PairDirection.EW)
//             }
//             return null
//         } else {
//             val direction = contestant.direction as PairDirection
//             return tables.firstOrNull {
//         it.rounds[roundNumber - 1].getPairNumber(direction) == contestant.number
//     }?.let { ContestantPosition(it.tableNumber, direction) }
// }
// }
//
//     override fun getContestantId(tableNumber: Int, roundNumber: Int, direction: ContestantDirection): ContestantId? {
//         val pairDirection = when (direction) {
//         is PairDirection -> direction
//         is Direction -> direction.pairDirection
//         else -> throw RuntimeException("Unexpected ContestantDirection type")
// }
//     return getRound(tableNumber, roundNumber)?.let {
//         ContestantId(
//             it.getPairNumber(pairDirection),
//         if (playersChangeDirection) null else pairDirection
//     )
//     }
// }
//
//     fun createTables(boardsPerRound: Int) : List<Table<PairRound>> {
//         return tables.map { table ->
//         Table(table.tableNumber, table.rounds.map { round ->
//         PairRound(
//             Boards.boardNumbersForSet(
//                 round.set,
//                 boardsPerRound
//             ), round.ns, round.ew, round.set
//         )
//     })
//     }
// }
//
//     override fun createContestants(): Contestants {
//         return PairContestants()
//     }
// }
//
// @Serializable
// sealed class TeamMovement : Movement<PairRound>() {
//
//     override fun getPlayersForTableAndRound(tableNumber: Int, roundNumber: Int): PairPlayers? {
//         return getRound(tableNumber, roundNumber)?.let { PairPlayers(it.ns, it.ew) }
// }
//
//     override fun findContestantInRound(roundNumber: Int, contestant: ContestantId): ContestantPosition? {
//         val direction = contestant.direction as PairDirection
//         return tables.firstOrNull {
//         it.rounds[roundNumber - 1].getPairNumber(direction) == contestant.number
//     }?.let { ContestantPosition(it.tableNumber, direction) }
// }
//
//     override fun getContestantId(tableNumber: Int, roundNumber: Int, direction: ContestantDirection): ContestantId? {
//         val pairDirection = when (direction) {
//         is PairDirection -> direction
//         is Direction -> direction.pairDirection
//         else -> throw RuntimeException("Unexpected ContestantDirection type")
// }
//     return getRound(tableNumber, roundNumber)?.let {
//         ContestantId(
//             it.getPairNumber(pairDirection),
//             pairDirection
//         )
//     }
// }
//
//     fun createTables(boardsPerRound: Int) : List<Table<PairRound>> {
//         return tables.map { table ->
//         Table(table.tableNumber, table.rounds.map { round ->
//         PairRound(
//             Boards.boardNumbersForSet(
//                 round.set,
//                 boardsPerRound
//             ), round.ns, round.ew, round.set
//         )
//     })
//     }
// }
//
//     override fun createContestants(): Contestants {
//         return TeamContestants()
//     }
// }
//
// @Serializable
// @SerialName("ONE_WINNER")
// data class OneWinner(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<IndividualRound>>,
//     override val players: Int,
//     override val playersChangeDirection: Boolean = true
// ) : IndividualMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return OneWinner(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound), players, playersChangeDirection)
//     }
// }
//
// @Serializable
// @SerialName("FOUR_WINNER")
// data class FourWinner(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<IndividualRound>>,
//     override val players: Int,
//     override val playersChangeDirection: Boolean = false
// ) : IndividualMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return FourWinner(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound), players, playersChangeDirection)
//     }
// }
//
// @Serializable
// @SerialName("MITCHELL")
// data class Mitchell(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<PairRound>>,
//     override val missingPair: Int? = null,
//     override val playersChangeDirection: Boolean = false
// ) : PairMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return Mitchell(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound), missingPair, playersChangeDirection)
//     }
// }
//
// @Serializable
// @SerialName("HOWELL")
// data class Howell(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<PairRound>>,
//     override val missingPair: Int? = null,
//     override val playersChangeDirection: Boolean = true
// ) : PairMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return Howell(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound), missingPair, playersChangeDirection)
//     }
// }
//
// @Serializable
// @SerialName("SWITCHED_MITCHELL")
// data class SwitchedMitchell(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<PairRound>>,
//     override val missingPair: Int? = null,
//     override val playersChangeDirection: Boolean = true
// ) : PairMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return SwitchedMitchell(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound), missingPair, playersChangeDirection)
//     }
// }
//
// @Serializable
// @SerialName("AMERICAN_WHIST")
// data class AmericanWhist(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<PairRound>>
// ): TeamMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return AmericanWhist(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound))
//     }
// }
//
// @Serializable
// @SerialName("SCORE_BREAK")
// data class ScoreBreak(
//     override val id: String,
//     override val name: String,
//     override val numberOfTables: Int,
//     override val boards: Int,
//     override val boardsPerRound: Int,
//     override val numberOfRounds: Int,
//     override val tables: List<Table<PairRound>>
// ): TeamMovement() {
//
//     override fun createMovement(boardsPerRound: Int): Movement<*> {
//         return ScoreBreak(id, name, numberOfTables, maximumSetNumber() * boardsPerRound, boardsPerRound,
//             numberOfRounds, createTables(boardsPerRound))
//     }
// }
