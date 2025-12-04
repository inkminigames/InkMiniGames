// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMiniGamesOnInk.sol";
import "./InkMiniGamesLibrary.sol";

/**
 * @title Tetris
 * @dev Smart contract for managing Tetris game sessions on Ink
 */
contract Tetris is IMiniGamesOnInk, Ownable, ReentrancyGuard {
    using InkMiniGamesLibrary for mapping(uint256 => InkMiniGamesLibrary.GameData);
    using InkMiniGamesLibrary for mapping(address => uint256[]);

    uint256 public gameFee = 0.0001 ether;

    mapping(address => uint256[]) public playerGames;
    mapping(uint256 => InkMiniGamesLibrary.GameData) private gameSessions;
    uint256 public gameIdCounter;

    address[] private allPlayers;
    mapping(address => bool) private hasPlayed;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Initialize a new game session
     * @param gameData Initial game state (seed for piece generation)
     * @return gameId The unique identifier for this game session
     */
    function startGame(bytes memory gameData) external payable nonReentrant returns (uint256) {
        require(msg.value >= gameFee, "Insufficient game fee");

        (bool abandoned, uint256 abandonedGameId) = InkMiniGamesLibrary.handleActiveGame(
            playerGames,
            gameSessions,
            msg.sender
        );

        if (abandoned) {
            emit GameAbandoned(msg.sender, abandonedGameId);
        }

        gameIdCounter++;
        uint256 newGameId = gameIdCounter;

        InkMiniGamesLibrary.createGameSession(
            gameSessions,
            playerGames,
            newGameId,
            msg.sender,
            gameData
        );

        InkMiniGamesLibrary.trackPlayer(allPlayers, hasPlayed, msg.sender);

        emit GameStarted(msg.sender, newGameId, gameData);

        InkMiniGamesLibrary.handleRefund(gameFee);

        return newGameId;
    }

    /**
     * @dev Submit game results
     * @param _gameId The game session ID
     * @param _finalScore The final score achieved
     * @param _moves Compressed move data
     */
    function submitGame(
        uint256 _gameId,
        uint256 _finalScore,
        bytes memory _moves
    ) external nonReentrant {
        InkMiniGamesLibrary.GameData storage game = gameSessions[_gameId];

        require(game.player == msg.sender, "Not your game");
        require(game.state == GameState.Active, "Game not active");

        InkMiniGamesLibrary.completeGame(game, _finalScore, _moves);

        emit GameCompleted(msg.sender, _gameId, _finalScore, _moves.length);
    }

    /**
     * @dev Get player's active game (if any)
     * @param _player The player address
     * @return gameId The active game ID (0 if no active game)
     * @return gameData The initial game state
     */
    function getActiveGame(address _player) external view returns (
        uint256 gameId,
        bytes memory gameData
    ) {
        return InkMiniGamesLibrary.getActiveGame(playerGames, gameSessions, _player);
    }

    /**
     * @dev Get game session details
     * @param _gameId The game session ID
     */
    function getGameSession(uint256 _gameId) external view returns (
        address player,
        uint256 startTime,
        uint256 endTime,
        uint256 finalScore,
        bytes memory moves,
        GameState state
    ) {
        return InkMiniGamesLibrary.getGameSession(gameSessions, _gameId);
    }

    /**
     * @dev Get game session details with initial state (for Tetris-specific use)
     * @param _gameId The game session ID
     */
    function getGameSessionWithState(uint256 _gameId) external view returns (
        address player,
        bytes memory initialState,
        uint256 startTime,
        uint256 endTime,
        uint256 finalScore,
        bytes memory moves,
        GameState state
    ) {
        InkMiniGamesLibrary.GameData storage game = gameSessions[_gameId];
        return (
            game.player,
            game.initialState,
            game.startTime,
            game.endTime,
            game.finalScore,
            game.moves,
            game.state
        );
    }

    /**
     * @dev Get all game IDs for a player
     * @param _player The player address
     */
    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

    /**
     * @dev Get player's game history with scores
     * @param _player The player address
     * @param _limit Maximum number of games to return
     * @param _offset Offset for pagination
     */
    function getPlayerHistory(
        address _player,
        uint256 _limit,
        uint256 _offset
    ) external view returns (
        uint256[] memory gameIds,
        uint256[] memory scores,
        uint256[] memory timestamps,
        GameState[] memory states
    ) {
        return InkMiniGamesLibrary.getPlayerHistory(
            playerGames,
            gameSessions,
            _player,
            _limit,
            _offset
        );
    }

    /**
     * @dev Update game fee (owner only)
     * @param _newFee New fee in wei
     */
    function updateGameFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = gameFee;
        gameFee = _newFee;
        emit GameFeeUpdated(oldFee, _newFee);
    }

    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool status,) = payable(owner()).call{value: balance}("");
        require(status, "Withdrawal failed");
        emit FeesWithdrawn(owner(), balance);
    }

    /**
     * @dev Withdraw ERC20 tokens accidentally sent to the contract (owner only)
     * @param tokenAddress The address of the ERC20 token to withdraw
     */
    function withdrawLostTokens(address tokenAddress) external onlyOwner nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(token.transfer(owner(), balance), "Token transfer failed");
    }
}
