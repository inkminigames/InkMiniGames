// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMiniGamesOnInk
 * @dev Standard interface for all mini games on Ink
 * @notice This interface defines the core functions that all mini games must implement
 */
interface IMiniGamesOnInk {

    /// @dev Enum representing the state of a game session
    enum GameState { Active, Completed, Abandoned }

    /**
     * @dev Emitted when a new game is started
     * @param player The address of the player
     * @param gameId The unique identifier for the game session
     * @param gameData Game-specific initialization data (e.g., initial board state)
     */
    event GameStarted(address indexed player, uint256 indexed gameId, bytes gameData);

    /**
     * @dev Emitted when a game is completed
     * @param player The address of the player
     * @param gameId The unique identifier for the game session
     * @param finalScore The final score achieved
     * @param moveCount The number of moves made
     */
    event GameCompleted(address indexed player, uint256 indexed gameId, uint256 finalScore, uint256 moveCount);

    /**
     * @dev Emitted when a game is abandoned
     * @param player The address of the player
     * @param gameId The unique identifier for the game session
     */
    event GameAbandoned(address indexed player, uint256 indexed gameId);

    /**
     * @dev Emitted when the game fee is updated
     * @param oldFee The previous fee amount
     * @param newFee The new fee amount
     */
    event GameFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @dev Emitted when fees are withdrawn
     * @param owner The address receiving the fees
     * @param amount The amount withdrawn
     */
    event FeesWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Start a new game session
     * @param gameData Game-specific initialization data
     * @return gameId The unique identifier for the newly created game
     * @notice Requires payment of the game fee
     * @notice If player has an active game, it should be marked as abandoned
     */
    function startGame(bytes memory gameData) external payable returns (uint256 gameId);

    /**
     * @dev Submit the results of a completed game
     * @param gameId The unique identifier of the game session
     * @param finalScore The final score achieved by the player
     * @param moves Encoded move data for replay purposes
     * @notice Only the player who started the game can submit results
     * @notice Game must be in Active state
     */
    function submitGame(
        uint256 gameId,
        uint256 finalScore,
        bytes memory moves
    ) external;

    /**
     * @dev Get the current game fee
     * @return The fee amount in wei required to start a game
     */
    function gameFee() external view returns (uint256);

    /**
     * @dev Get details of a specific game session
     * @param gameId The unique identifier of the game session
     * @return player The address of the player
     * @return startTime When the game was started
     * @return endTime When the game ended (0 if still active)
     * @return finalScore The final score (0 if not completed)
     * @return moves Encoded move data
     * @return state Current state of the game
     */
    function getGameSession(uint256 gameId) external view returns (
        address player,
        uint256 startTime,
        uint256 endTime,
        uint256 finalScore,
        bytes memory moves,
        GameState state
    );

    /**
     * @dev Get all game IDs for a specific player
     * @param player The address of the player
     * @return An array of game IDs
     */
    function getPlayerGames(address player) external view returns (uint256[] memory);

    /**
     * @dev Get the player's active game (if any)
     * @param player The address of the player
     * @return gameId The active game ID (0 if no active game)
     * @return gameData Game-specific data for the active game
     */
    function getActiveGame(address player) external view returns (
        uint256 gameId,
        bytes memory gameData
    );

    /**
     * @dev Get paginated game history for a player
     * @param player The address of the player
     * @param limit Maximum number of games to return
     * @param offset Number of games to skip
     * @return gameIds Array of game IDs
     * @return scores Array of scores
     * @return timestamps Array of completion timestamps
     * @return states Array of game states
     */
    function getPlayerHistory(
        address player,
        uint256 limit,
        uint256 offset
    ) external view returns (
        uint256[] memory gameIds,
        uint256[] memory scores,
        uint256[] memory timestamps,
        GameState[] memory states
    );

    /**
     * @dev Update the game fee (owner only)
     * @param newFee The new fee amount in wei
     */
    function updateGameFee(uint256 newFee) external;

    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees() external;

    /**
     * @dev Withdraw lost tokens (owner only)
     */
    function withdrawLostTokens(address lostToken) external;
}
