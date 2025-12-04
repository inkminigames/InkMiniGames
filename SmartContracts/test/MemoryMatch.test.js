const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MemoryMatch", function () {
  let memoryMatch;
  let owner;
  let player1;
  let player2;

  const GAME_FEE = ethers.parseEther("0.0001");

  // Create initial game data (grid configuration for memory match)
  const createInitialGrid = () => {
    // Simulate a 5x5 grid (25 cards) with pairs
    return ethers.toUtf8Bytes("GRID_SEED_MM123");
  };

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const MemoryMatch = await ethers.getContractFactory("MemoryMatch");
    memoryMatch = await MemoryMatch.deploy();
    await memoryMatch.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await memoryMatch.owner()).to.equal(owner.address);
    });

    it("Should set the default game fee", async function () {
      expect(await memoryMatch.gameFee()).to.equal(GAME_FEE);
    });

    it("Should initialize game counter at 0", async function () {
      expect(await memoryMatch.gameIdCounter()).to.equal(0);
    });

    it("Should set correct grid size constant", async function () {
      expect(await memoryMatch.GRID_SIZE()).to.equal(25);
    });

    it("Should set correct max attempts constant", async function () {
      expect(await memoryMatch.MAX_ATTEMPTS()).to.equal(50);
    });
  });

  describe("Starting a game", function () {
    it("Should start a new game with correct fee", async function () {
      const initialGrid = createInitialGrid();

      const tx = await memoryMatch.connect(player1).startGame(initialGrid, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(memoryMatch, "GameStarted")
        .withArgs(player1.address, 1, initialGrid);

      expect(await memoryMatch.gameIdCounter()).to.equal(1);
    });

    it("Should revert if insufficient fee is sent", async function () {
      const initialGrid = createInitialGrid();

      await expect(
        memoryMatch.connect(player1).startGame(initialGrid, {
          value: ethers.parseEther("0.00005"),
        })
      ).to.be.revertedWith("Insufficient game fee");
    });

    it("Should refund excess payment", async function () {
      const initialGrid = createInitialGrid();
      const excessFee = ethers.parseEther("0.001");

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await memoryMatch.connect(player1).startGame(initialGrid, {
        value: excessFee,
      });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(player1.address);

      const expectedDecrease = GAME_FEE + gasUsed;
      const actualDecrease = balanceBefore - balanceAfter;

      expect(actualDecrease).to.be.closeTo(expectedDecrease, ethers.parseEther("0.00001"));
    });

    it("Should abandon previous active game when starting a new one", async function () {
      const initialGrid1 = createInitialGrid();
      const initialGrid2 = ethers.toUtf8Bytes("GRID_SEED_MM456");

      await memoryMatch.connect(player1).startGame(initialGrid1, {
        value: GAME_FEE,
      });

      const tx = await memoryMatch.connect(player1).startGame(initialGrid2, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(memoryMatch, "GameAbandoned")
        .withArgs(player1.address, 1);

      await expect(tx)
        .to.emit(memoryMatch, "GameStarted")
        .withArgs(player1.address, 2, initialGrid2);

      const game1 = await memoryMatch.getGameSession(1);
      expect(game1.state).to.equal(2); // GameState.Abandoned
    });

    it("Should track player games correctly", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const playerGames = await memoryMatch.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(2);
      expect(playerGames[0]).to.equal(1);
      expect(playerGames[1]).to.equal(2);
    });

    it("Should accept exact game fee", async function () {
      const initialGrid = createInitialGrid();

      await expect(
        memoryMatch.connect(player1).startGame(initialGrid, {
          value: GAME_FEE,
        })
      ).to.not.be.reverted;
    });
  });

  describe("Getting active game", function () {
    it("Should return active game if exists", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, {
        value: GAME_FEE,
      });

      const [gameId, returnedGrid] = await memoryMatch.getActiveGame(player1.address);

      expect(gameId).to.equal(1);
      expect(returnedGrid).to.equal(ethers.hexlify(initialGrid));
    });

    it("Should return 0 if no active game", async function () {
      const [gameId] = await memoryMatch.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is completed", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, {
        value: GAME_FEE,
      });

      const moves = ethers.toUtf8Bytes("0,1;2,3;4,5");
      await memoryMatch.connect(player1).submitGame(1, 1000, moves);

      const [gameId] = await memoryMatch.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is abandoned", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const [gameId] = await memoryMatch.getActiveGame(player1.address);
      expect(gameId).to.equal(2);
    });
  });

  describe("Submitting a game", function () {
    beforeEach(async function () {
      const initialGrid = createInitialGrid();
      await memoryMatch.connect(player1).startGame(initialGrid, {
        value: GAME_FEE,
      });
    });

    it("Should submit game with score and moves", async function () {
      const finalScore = 2500;
      const moves = ethers.toUtf8Bytes("0,1;2,3;4,5;6,7");

      const tx = await memoryMatch.connect(player1).submitGame(1, finalScore, moves);

      await expect(tx)
        .to.emit(memoryMatch, "GameCompleted")
        .withArgs(player1.address, 1, finalScore, moves.length);

      const game = await memoryMatch.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
      expect(game.moves).to.equal(ethers.hexlify(moves));
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should revert if not the game owner", async function () {
      const moves = ethers.toUtf8Bytes("0,1;2,3");

      await expect(
        memoryMatch.connect(player2).submitGame(1, 1000, moves)
      ).to.be.revertedWith("Not your game");
    });

    it("Should revert if game is not active", async function () {
      const moves = ethers.toUtf8Bytes("0,1;2,3");

      await memoryMatch.connect(player1).submitGame(1, 1000, moves);

      await expect(
        memoryMatch.connect(player1).submitGame(1, 2000, moves)
      ).to.be.revertedWith("Game not active");
    });

    it("Should store moves correctly", async function () {
      const finalScore = 3000;
      const moves = ethers.toUtf8Bytes("0,1;2,3;4,5;6,7;8,9;10,11");

      await memoryMatch.connect(player1).submitGame(1, finalScore, moves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.moves).to.equal(ethers.hexlify(moves));
    });

    it("Should handle perfect score", async function () {
      const finalScore = 5000;
      const moves = ethers.toUtf8Bytes("0,1;2,3;4,5");

      await memoryMatch.connect(player1).submitGame(1, finalScore, moves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
    });

    it("Should handle zero score submission", async function () {
      const moves = ethers.toUtf8Bytes("attempts");

      await memoryMatch.connect(player1).submitGame(1, 0, moves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should record end time on submission", async function () {
      const moves = ethers.toUtf8Bytes("0,1;2,3");

      await memoryMatch.connect(player1).submitGame(1, 1500, moves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.endTime).to.be.gt(0);
      expect(game.endTime).to.be.gte(game.startTime);
    });
  });

  describe("Getting game session", function () {
    it("Should return complete game session data", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const finalScore = 2800;
      const moves = ethers.toUtf8Bytes("0,1;2,3;4,5");

      await memoryMatch.connect(player1).submitGame(1, finalScore, moves);

      const gameSession = await memoryMatch.getGameSession(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.finalScore).to.equal(finalScore);
      expect(gameSession.moves).to.equal(ethers.hexlify(moves));
      expect(gameSession.state).to.equal(1); // GameState.Completed
    });

    it("Should return game session with grid data", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const gameSession = await memoryMatch.getGameSessionWithGrid(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.initialGrid).to.equal(ethers.hexlify(initialGrid));
      expect(gameSession.state).to.equal(0); // GameState.Active
    });

    it("Should return empty moves for active game", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const game = await memoryMatch.getGameSession(1);
      expect(game.moves).to.equal("0x");
      expect(game.finalScore).to.equal(0);
    });
  });

  describe("Player history", function () {
    it("Should return player's game history", async function () {
      const initialGrid = createInitialGrid();

      for (let i = 0; i < 3; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("0,1;2,3");
        await memoryMatch.connect(player1).submitGame(i + 1, (i + 1) * 1000, moves);
      }

      const [gameIds, scores, timestamps, states] = await memoryMatch.getPlayerHistory(
        player1.address,
        10,
        0
      );

      expect(gameIds.length).to.equal(3);
      expect(scores[0]).to.equal(3000);
      expect(scores[1]).to.equal(2000);
      expect(scores[2]).to.equal(1000);

      expect(states.every(state => state === 1n)).to.be.true;
    });

    it("Should handle pagination correctly", async function () {
      const initialGrid = createInitialGrid();

      for (let i = 0; i < 5; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("0,1;2,3");
        await memoryMatch.connect(player1).submitGame(i + 1, (i + 1) * 500, moves);
      }

      const [gameIds1] = await memoryMatch.getPlayerHistory(player1.address, 2, 0);
      expect(gameIds1.length).to.equal(2);

      const [gameIds2] = await memoryMatch.getPlayerHistory(player1.address, 2, 2);
      expect(gameIds2.length).to.equal(2);

      const [gameIds3] = await memoryMatch.getPlayerHistory(player1.address, 2, 4);
      expect(gameIds3.length).to.equal(1);
    });

    it("Should return empty arrays for player with no games", async function () {
      const history = await memoryMatch.getPlayerHistory(player1.address, 10, 0);
      expect(history.gameIds.length).to.equal(0);
      expect(history.scores.length).to.equal(0);
      expect(history.timestamps.length).to.equal(0);
      expect(history.states.length).to.equal(0);
    });

    it("Should correctly order games in history", async function () {
      const initialGrid = createInitialGrid();

      const scores = [500, 1000, 1500, 2000, 2500];
      for (let i = 0; i < scores.length; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("0,1");
        await memoryMatch.connect(player1).submitGame(i + 1, scores[i], moves);
      }

      const [gameIds, returnedScores] = await memoryMatch.getPlayerHistory(player1.address, 10, 0);

      // Most recent should be first
      expect(returnedScores[0]).to.equal(2500);
      expect(returnedScores[4]).to.equal(500);
    });

    it("Should include abandoned games in history", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const [gameIds, scores, timestamps, states] = await memoryMatch.getPlayerHistory(
        player1.address,
        10,
        0
      );

      expect(gameIds.length).to.equal(2);
      expect(states[1]).to.equal(2n); // First game should be abandoned
      expect(states[0]).to.equal(0n); // Second game should be active
    });
  });

  describe("Fee management", function () {
    it("Should allow owner to update game fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      const tx = await memoryMatch.connect(owner).updateGameFee(newFee);

      await expect(tx)
        .to.emit(memoryMatch, "GameFeeUpdated")
        .withArgs(GAME_FEE, newFee);

      expect(await memoryMatch.gameFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      await expect(
        memoryMatch.connect(player1).updateGameFee(newFee)
      ).to.be.revertedWithCustomError(memoryMatch, "OwnableUnauthorizedAccount");
    });

    it("Should allow setting fee to zero", async function () {
      await memoryMatch.connect(owner).updateGameFee(0);
      expect(await memoryMatch.gameFee()).to.equal(0);
    });

    it("Should allow owner to withdraw fees", async function () {
      const initialGrid = createInitialGrid();

      for (let i = 0; i < 3; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, {
          value: GAME_FEE,
        });
      }

      const contractAddress = await memoryMatch.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await memoryMatch.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(memoryMatch, "FeesWithdrawn")
        .withArgs(owner.address, contractBalance);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
      const newContractBalance = await ethers.provider.getBalance(contractAddress);
      expect(newContractBalance).to.equal(0);
    });

    it("Should revert withdrawal if no fees collected", async function () {
      await expect(
        memoryMatch.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        memoryMatch.connect(player1).withdrawFees()
      ).to.be.revertedWithCustomError(memoryMatch, "OwnableUnauthorizedAccount");
    });

    it("Should accumulate fees from multiple games", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
      await memoryMatch.connect(player2).startGame(initialGrid, { value: GAME_FEE });
      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const contractAddress = await memoryMatch.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);
    });
  });

  describe("Multiple players", function () {
    it("Should handle games from different players independently", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, {
        value: GAME_FEE,
      });

      await memoryMatch.connect(player2).startGame(initialGrid, {
        value: GAME_FEE,
      });

      const [gameId1] = await memoryMatch.getActiveGame(player1.address);
      const [gameId2] = await memoryMatch.getActiveGame(player2.address);

      expect(gameId1).to.equal(1);
      expect(gameId2).to.equal(2);

      const player1Games = await memoryMatch.getPlayerGames(player1.address);
      const player2Games = await memoryMatch.getPlayerGames(player2.address);

      expect(player1Games.length).to.equal(1);
      expect(player2Games.length).to.equal(1);
      expect(player1Games[0]).to.equal(1);
      expect(player2Games[0]).to.equal(2);
    });

    it("Should maintain separate game histories for different players", async function () {
      const initialGrid = createInitialGrid();

      for (let i = 0; i < 2; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
        await memoryMatch.connect(player1).submitGame(
          i * 2 + 1,
          (i + 1) * 2000,
          ethers.toUtf8Bytes("0,1;2,3")
        );

        await memoryMatch.connect(player2).startGame(initialGrid, { value: GAME_FEE });
        await memoryMatch.connect(player2).submitGame(
          i * 2 + 2,
          (i + 1) * 1000,
          ethers.toUtf8Bytes("4,5;6,7")
        );
      }

      const [gameIds1, scores1] = await memoryMatch.getPlayerHistory(player1.address, 10, 0);
      const [gameIds2, scores2] = await memoryMatch.getPlayerHistory(player2.address, 10, 0);

      expect(gameIds1.length).to.equal(2);
      expect(gameIds2.length).to.equal(2);
      expect(scores1[0]).to.equal(4000);
      expect(scores2[0]).to.equal(2000);
    });
  });

  describe("Game state transitions", function () {
    it("Should correctly transition from Active to Completed", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      let game = await memoryMatch.getGameSession(1);
      expect(game.state).to.equal(0); // GameState.Active

      const moves = ethers.toUtf8Bytes("0,1;2,3");
      await memoryMatch.connect(player1).submitGame(1, 1500, moves);

      game = await memoryMatch.getGameSession(1);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should correctly transition from Active to Abandoned", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      let game = await memoryMatch.getGameSession(1);
      expect(game.state).to.equal(0); // GameState.Active

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      game = await memoryMatch.getGameSession(1);
      expect(game.state).to.equal(2); // GameState.Abandoned
    });

    it("Should not allow transition from Completed", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const moves = ethers.toUtf8Bytes("0,1");
      await memoryMatch.connect(player1).submitGame(1, 1000, moves);

      await expect(
        memoryMatch.connect(player1).submitGame(1, 2000, moves)
      ).to.be.revertedWith("Game not active");
    });
  });

  describe("Edge cases", function () {
    it("Should handle game with empty moves", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      const emptyMoves = ethers.toUtf8Bytes("");
      await memoryMatch.connect(player1).submitGame(1, 0, emptyMoves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should handle large move sets", async function () {
      const initialGrid = createInitialGrid();

      await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });

      // Simulate many card flips
      const largeMoves = ethers.toUtf8Bytes("0,1;2,3;4,5;6,7;8,9;10,11;12,13;14,15;16,17;18,19;20,21;22,23");
      await memoryMatch.connect(player1).submitGame(1, 3500, largeMoves);

      const game = await memoryMatch.getGameSession(1);
      expect(game.moves).to.equal(ethers.hexlify(largeMoves));
    });

    it("Should handle sequential games from same player", async function () {
      const initialGrid = createInitialGrid();

      for (let i = 0; i < 5; i++) {
        await memoryMatch.connect(player1).startGame(initialGrid, { value: GAME_FEE });
        const moves = ethers.toUtf8Bytes("0,1");
        await memoryMatch.connect(player1).submitGame(i + 1, i * 100, moves);
      }

      const playerGames = await memoryMatch.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(5);
    });
  });

  describe("Withdraw Lost Tokens", function () {
    let mockToken;

    beforeEach(async function () {
      // Deploy a mock ERC20 token
      const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
      mockToken = await MockERC20.deploy("Mock Token", "MTK");
      await mockToken.waitForDeployment();
    });

    it("Should allow owner to withdraw accidentally sent ERC20 tokens", async function () {
      const tokenAmount = ethers.parseEther("100");

      // Mint tokens to the game contract (simulating accidental transfer)
      await mockToken.mint(await memoryMatch.getAddress(), tokenAmount);

      const contractTokenBalance = await mockToken.balanceOf(await memoryMatch.getAddress());
      expect(contractTokenBalance).to.equal(tokenAmount);

      const ownerBalanceBefore = await mockToken.balanceOf(owner.address);

      // Withdraw lost tokens
      await memoryMatch.connect(owner).withdrawLostTokens(await mockToken.getAddress());

      const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + tokenAmount);

      const contractTokenBalanceAfter = await mockToken.balanceOf(await memoryMatch.getAddress());
      expect(contractTokenBalanceAfter).to.equal(0);
    });

    it("Should revert if non-owner tries to withdraw lost tokens", async function () {
      const tokenAmount = ethers.parseEther("50");
      await mockToken.mint(await memoryMatch.getAddress(), tokenAmount);

      await expect(
        memoryMatch.connect(player1).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWithCustomError(memoryMatch, "OwnableUnauthorizedAccount");
    });

    it("Should revert if zero address is provided", async function () {
      await expect(
        memoryMatch.connect(owner).withdrawLostTokens(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert if no tokens to withdraw", async function () {
      await expect(
        memoryMatch.connect(owner).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWith("No tokens to withdraw");
    });
  });
});
