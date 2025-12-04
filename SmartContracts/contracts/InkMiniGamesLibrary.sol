// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IMiniGamesOnInk.sol";

/**
 * @title InkMiniGamesLibrary
 * @dev Library containing common functionality for all mini games on Ink
 */
library InkMiniGamesLibrary {

    struct GameData {
        address player;
        uint256 gameId;
        bytes initialState;
        uint256 startTime;
        uint256 endTime;
        uint256 finalScore;
        bytes moves;
        IMiniGamesOnInk.GameState state;
    }

    struct PlayerData {
        mapping(address => uint256[]) playerGames;
        address[] allPlayers;
        mapping(address => bool) hasPlayed;
    }

    /**
     * @dev Handle abandoning active game if exists
     * @param playerGames Mapping of player to their game IDs
     * @param gameSessions Mapping of game ID to game session
     * @param player The player address
     */
    function handleActiveGame(
        mapping(address => uint256[]) storage playerGames,
        mapping(uint256 => GameData) storage gameSessions,
        address player
    ) internal returns (bool abandoned, uint256 abandonedGameId) {
        uint256[] storage playerGameIds = playerGames[player];

        if (playerGameIds.length > 0) {
            uint256 lastGameId = playerGameIds[playerGameIds.length - 1];
            GameData storage lastGame = gameSessions[lastGameId];

            if (lastGame.state == IMiniGamesOnInk.GameState.Active) {
                lastGame.state = IMiniGamesOnInk.GameState.Abandoned;
                lastGame.endTime = block.timestamp;
                return (true, lastGameId);
            }
        }

        return (false, 0);
    }

    /**
     * @dev Track unique player
     * @param allPlayers Array of all player addresses
     * @param hasPlayed Mapping to check if player has played
     * @param player The player address
     */
    function trackPlayer(
        address[] storage allPlayers,
        mapping(address => bool) storage hasPlayed,
        address player
    ) internal {
        if (!hasPlayed[player]) {
            allPlayers.push(player);
            hasPlayed[player] = true;
        }
    }

    /**
     * @dev Create new game session
     * @param gameSessions Mapping of game ID to game session
     * @param playerGames Mapping of player to their game IDs
     * @param gameId The new game ID
     * @param player The player address
     * @param initialState The initial game state
     */
    function createGameSession(
        mapping(uint256 => GameData) storage gameSessions,
        mapping(address => uint256[]) storage playerGames,
        uint256 gameId,
        address player,
        bytes memory initialState
    ) internal {
        GameData storage newGame = gameSessions[gameId];
        newGame.player = player;
        newGame.gameId = gameId;
        newGame.initialState = initialState;
        newGame.startTime = block.timestamp;
        newGame.state = IMiniGamesOnInk.GameState.Active;

        playerGames[player].push(gameId);
    }

    /**
     * @dev Handle refund if overpayment
     * @param gameFee The required game fee
     */
    function handleRefund(uint256 gameFee) internal {
        if (msg.value > gameFee) {
            (bool status,) = payable(msg.sender).call{value: msg.value - gameFee}("");
            require(status, "Refund failed");
        }
    }

    /**
     * @dev Complete a game session
     * @param game The game session to complete
     * @param finalScore The final score achieved
     * @param moves The encoded move data
     */
    function completeGame(
        GameData storage game,
        uint256 finalScore,
        bytes memory moves
    ) internal {
        game.finalScore = finalScore;
        game.moves = moves;
        game.endTime = block.timestamp;
        game.state = IMiniGamesOnInk.GameState.Completed;
    }

    /**
     * @dev Get player's active game
     * @param playerGames Mapping of player to their game IDs
     * @param gameSessions Mapping of game ID to game session
     * @param player The player address
     */
    function getActiveGame(
        mapping(address => uint256[]) storage playerGames,
        mapping(uint256 => GameData) storage gameSessions,
        address player
    ) internal view returns (uint256 gameId, bytes memory gameData) {
        uint256[] storage playerGameIds = playerGames[player];

        if (playerGameIds.length == 0) {
            return (0, gameData);
        }

        uint256 lastGameId = playerGameIds[playerGameIds.length - 1];
        GameData storage lastGame = gameSessions[lastGameId];

        if (lastGame.state == IMiniGamesOnInk.GameState.Active) {
            return (lastGameId, lastGame.initialState);
        }

        return (0, gameData);
    }

    /**
     * @dev Get game session details
     * @param gameSessions Mapping of game ID to game session
     * @param gameId The game session ID
     */
    function getGameSession(
        mapping(uint256 => GameData) storage gameSessions,
        uint256 gameId
    ) internal view returns (
        address player,
        uint256 startTime,
        uint256 endTime,
        uint256 finalScore,
        bytes memory moves,
        IMiniGamesOnInk.GameState state
    ) {
        GameData storage game = gameSessions[gameId];
        return (
            game.player,
            game.startTime,
            game.endTime,
            game.finalScore,
            game.moves,
            game.state
        );
    }

    /**
     * @dev Get player's game history
     * @param playerGames Mapping of player to their game IDs
     * @param gameSessions Mapping of game ID to game session
     * @param player The player address
     * @param limit Maximum number of games to return
     * @param offset Offset for pagination
     */
    function getPlayerHistory(
        mapping(address => uint256[]) storage playerGames,
        mapping(uint256 => GameData) storage gameSessions,
        address player,
        uint256 limit,
        uint256 offset
    ) internal view returns (
        uint256[] memory gameIds,
        uint256[] memory scores,
        uint256[] memory timestamps,
        IMiniGamesOnInk.GameState[] memory states
    ) {
        uint256[] storage allGames = playerGames[player];
        uint256 totalGames = allGames.length;

        if (offset >= totalGames) {
            return (
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new IMiniGamesOnInk.GameState[](0)
            );
        }

        uint256 remaining = totalGames - offset;
        uint256 resultSize = remaining < limit ? remaining : limit;

        gameIds = new uint256[](resultSize);
        scores = new uint256[](resultSize);
        timestamps = new uint256[](resultSize);
        states = new IMiniGamesOnInk.GameState[](resultSize);

        for (uint256 i = 0; i < resultSize; i++) {
            uint256 gameId = allGames[totalGames - 1 - offset - i]; // Most recent first
            GameData storage game = gameSessions[gameId];

            gameIds[i] = gameId;
            scores[i] = game.finalScore;
            timestamps[i] = game.endTime > 0 ? game.endTime : game.startTime;
            states[i] = game.state;
        }

        return (gameIds, scores, timestamps, states);
    }
}
