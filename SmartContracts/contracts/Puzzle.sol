// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMiniGamesOnInk.sol";
import "./InkMiniGamesLibrary.sol";

contract Puzzle is IMiniGamesOnInk, Ownable, ReentrancyGuard {
    using InkMiniGamesLibrary for mapping(uint256 => InkMiniGamesLibrary.GameData);
    using InkMiniGamesLibrary for mapping(address => uint256[]);

    uint256 public gameFee = 0.0001 ether;

    mapping(address => uint256[]) public playerGames;
    mapping(uint256 => InkMiniGamesLibrary.GameData) private gameSessions;
    uint256 public gameIdCounter;

    address[] private allPlayers;
    mapping(address => bool) private hasPlayed;

    constructor() Ownable(msg.sender) {}

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

    function getActiveGame(address _player) external view returns (
        uint256 gameId,
        bytes memory gameData
    ) {
        return InkMiniGamesLibrary.getActiveGame(playerGames, gameSessions, _player);
    }

    function getGameSession(uint256 _gameId) external view returns (
        address player,
        uint256 startTime,
        uint256 endTime,
        uint256 finalScore,
        bytes memory moves,
        GameState state
    ) {
        InkMiniGamesLibrary.GameData storage game = gameSessions[_gameId];
        return (
            game.player,
            game.startTime,
            game.endTime,
            game.finalScore,
            game.moves,
            game.state
        );
    }

    function getGameSessionWithPuzzle(uint256 _gameId) external view returns (
        address player,
        bytes memory initialPuzzle,
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

    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

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

    function updateGameFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = gameFee;
        gameFee = _newFee;
        emit GameFeeUpdated(oldFee, _newFee);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FeesWithdrawn(owner(), balance);
    }

    function withdrawLostTokens(address _lostToken) external onlyOwner {
        require(_lostToken != address(0), "Invalid token address");

        IERC20 token = IERC20(_lostToken);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(token.transfer(owner(), balance), "Token transfer failed");
    }
}
