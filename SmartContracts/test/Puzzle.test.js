const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Puzzle", function () {
  let puzzle;
  let owner;
  let player1;
  let player2;

  const GAME_FEE = ethers.parseEther("0.0001");

  // Create initial puzzle configuration (5x5 sliding puzzle)
  const createInitialPuzzle = () => {
    // Simulate puzzle seed/configuration
    return ethers.toUtf8Bytes("PUZZLE_SEED_789");
  };

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const Puzzle = await ethers.getContractFactory("Puzzle");
    puzzle = await Puzzle.deploy();
    await puzzle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await puzzle.owner()).to.equal(owner.address);
    });

    it("Should set the default game fee", async function () {
      expect(await puzzle.gameFee()).to.equal(GAME_FEE);
    });

    it("Should initialize game counter at 0", async function () {
      expect(await puzzle.gameIdCounter()).to.equal(0);
    });
  });

  describe("Starting a game", function () {
    it("Should start a new game with correct fee", async function () {
      const initialPuzzle = createInitialPuzzle();

      const tx = await puzzle.connect(player1).startGame(initialPuzzle, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(puzzle, "GameStarted")
        .withArgs(player1.address, 1, initialPuzzle);

      expect(await puzzle.gameIdCounter()).to.equal(1);
    });

    it("Should revert if insufficient fee is sent", async function () {
      const initialPuzzle = createInitialPuzzle();

      await expect(
        puzzle.connect(player1).startGame(initialPuzzle, {
          value: ethers.parseEther("0.00005"),
        })
      ).to.be.revertedWith("Insufficient game fee");
    });

    it("Should refund excess payment", async function () {
      const initialPuzzle = createInitialPuzzle();
      const excessFee = ethers.parseEther("0.001");

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await puzzle.connect(player1).startGame(initialPuzzle, {
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
      const initialPuzzle1 = createInitialPuzzle();
      const initialPuzzle2 = ethers.toUtf8Bytes("PUZZLE_SEED_456");

      await puzzle.connect(player1).startGame(initialPuzzle1, {
        value: GAME_FEE,
      });

      const tx = await puzzle.connect(player1).startGame(initialPuzzle2, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(puzzle, "GameAbandoned")
        .withArgs(player1.address, 1);

      await expect(tx)
        .to.emit(puzzle, "GameStarted")
        .withArgs(player1.address, 2, initialPuzzle2);

      const game1 = await puzzle.getGameSession(1);
      expect(game1.state).to.equal(2); // GameState.Abandoned
    });

    it("Should track player games correctly", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const playerGames = await puzzle.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(2);
      expect(playerGames[0]).to.equal(1);
      expect(playerGames[1]).to.equal(2);
    });

    it("Should accept exact game fee", async function () {
      const initialPuzzle = createInitialPuzzle();

      await expect(
        puzzle.connect(player1).startGame(initialPuzzle, {
          value: GAME_FEE,
        })
      ).to.not.be.reverted;
    });
  });

  describe("Getting active game", function () {
    it("Should return active game if exists", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, {
        value: GAME_FEE,
      });

      const [gameId, returnedPuzzle] = await puzzle.getActiveGame(player1.address);

      expect(gameId).to.equal(1);
      expect(returnedPuzzle).to.equal(ethers.hexlify(initialPuzzle));
    });

    it("Should return 0 if no active game", async function () {
      const [gameId] = await puzzle.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is completed", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, {
        value: GAME_FEE,
      });

      const moves = ethers.toUtf8Bytes("U,D,L,R,U,D");
      await puzzle.connect(player1).submitGame(1, 1500, moves);

      const [gameId] = await puzzle.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is abandoned", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const [gameId] = await puzzle.getActiveGame(player1.address);
      expect(gameId).to.equal(2);
    });
  });

  describe("Submitting a game", function () {
    beforeEach(async function () {
      const initialPuzzle = createInitialPuzzle();
      await puzzle.connect(player1).startGame(initialPuzzle, {
        value: GAME_FEE,
      });
    });

    it("Should submit game with score and moves", async function () {
      const finalScore = 3000;
      const moves = ethers.toUtf8Bytes("U,D,L,R,U,D,L,R");

      const tx = await puzzle.connect(player1).submitGame(1, finalScore, moves);

      await expect(tx)
        .to.emit(puzzle, "GameCompleted")
        .withArgs(player1.address, 1, finalScore, moves.length);

      const game = await puzzle.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
      expect(game.moves).to.equal(ethers.hexlify(moves));
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should revert if not the game owner", async function () {
      const moves = ethers.toUtf8Bytes("U,D,L,R");

      await expect(
        puzzle.connect(player2).submitGame(1, 1500, moves)
      ).to.be.revertedWith("Not your game");
    });

    it("Should revert if game is not active", async function () {
      const moves = ethers.toUtf8Bytes("U,D,L,R");

      await puzzle.connect(player1).submitGame(1, 1500, moves);

      await expect(
        puzzle.connect(player1).submitGame(1, 2000, moves)
      ).to.be.revertedWith("Game not active");
    });

    it("Should store moves correctly", async function () {
      const finalScore = 2500;
      const moves = ethers.toUtf8Bytes("U,D,L,R,U,D,L,R,U,D,L,R");

      await puzzle.connect(player1).submitGame(1, finalScore, moves);

      const game = await puzzle.getGameSession(1);
      expect(game.moves).to.equal(ethers.hexlify(moves));
    });

    it("Should handle perfect score (minimum moves)", async function () {
      const finalScore = 5000;
      const moves = ethers.toUtf8Bytes("U,D,L,R");

      await puzzle.connect(player1).submitGame(1, finalScore, moves);

      const game = await puzzle.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
    });

    it("Should handle zero score submission", async function () {
      const moves = ethers.toUtf8Bytes("many_moves");

      await puzzle.connect(player1).submitGame(1, 0, moves);

      const game = await puzzle.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should record end time on submission", async function () {
      const moves = ethers.toUtf8Bytes("U,D,L,R");

      await puzzle.connect(player1).submitGame(1, 2000, moves);

      const game = await puzzle.getGameSession(1);
      expect(game.endTime).to.be.gt(0);
      expect(game.endTime).to.be.gte(game.startTime);
    });

    it("Should handle game with hints used", async function () {
      const finalScore = 1200;
      const moves = ethers.toUtf8Bytes("U,D,H,L,R,H,U");

      await puzzle.connect(player1).submitGame(1, finalScore, moves);

      const game = await puzzle.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
    });
  });

  describe("Getting game session", function () {
    it("Should return complete game session data", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const finalScore = 3500;
      const moves = ethers.toUtf8Bytes("U,D,L,R,U,D");

      await puzzle.connect(player1).submitGame(1, finalScore, moves);

      const gameSession = await puzzle.getGameSession(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.finalScore).to.equal(finalScore);
      expect(gameSession.moves).to.equal(ethers.hexlify(moves));
      expect(gameSession.state).to.equal(1); // GameState.Completed
    });

    it("Should return game session with puzzle data", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const gameSession = await puzzle.getGameSessionWithPuzzle(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.initialPuzzle).to.equal(ethers.hexlify(initialPuzzle));
      expect(gameSession.state).to.equal(0); // GameState.Active
    });

    it("Should return empty moves for active game", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const game = await puzzle.getGameSession(1);
      expect(game.moves).to.equal("0x");
      expect(game.finalScore).to.equal(0);
    });
  });

  describe("Player history", function () {
    it("Should return player's game history", async function () {
      const initialPuzzle = createInitialPuzzle();

      for (let i = 0; i < 3; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("U,D,L,R");
        await puzzle.connect(player1).submitGame(i + 1, (i + 1) * 1200, moves);
      }

      const [gameIds, scores, timestamps, states] = await puzzle.getPlayerHistory(
        player1.address,
        10,
        0
      );

      expect(gameIds.length).to.equal(3);
      expect(scores[0]).to.equal(3600);
      expect(scores[1]).to.equal(2400);
      expect(scores[2]).to.equal(1200);

      expect(states.every(state => state === 1n)).to.be.true;
    });

    it("Should handle pagination correctly", async function () {
      const initialPuzzle = createInitialPuzzle();

      for (let i = 0; i < 5; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("U,D,L,R");
        await puzzle.connect(player1).submitGame(i + 1, (i + 1) * 600, moves);
      }

      const [gameIds1] = await puzzle.getPlayerHistory(player1.address, 2, 0);
      expect(gameIds1.length).to.equal(2);

      const [gameIds2] = await puzzle.getPlayerHistory(player1.address, 2, 2);
      expect(gameIds2.length).to.equal(2);

      const [gameIds3] = await puzzle.getPlayerHistory(player1.address, 2, 4);
      expect(gameIds3.length).to.equal(1);
    });

    it("Should return empty arrays for player with no games", async function () {
      const history = await puzzle.getPlayerHistory(player1.address, 10, 0);
      expect(history.gameIds.length).to.equal(0);
      expect(history.scores.length).to.equal(0);
      expect(history.timestamps.length).to.equal(0);
      expect(history.states.length).to.equal(0);
    });

    it("Should correctly order games in history", async function () {
      const initialPuzzle = createInitialPuzzle();

      const scores = [800, 1200, 1800, 2400, 3000];
      for (let i = 0; i < scores.length; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("U,D");
        await puzzle.connect(player1).submitGame(i + 1, scores[i], moves);
      }

      const [gameIds, returnedScores] = await puzzle.getPlayerHistory(player1.address, 10, 0);

      // Most recent should be first
      expect(returnedScores[0]).to.equal(3000);
      expect(returnedScores[4]).to.equal(800);
    });

    it("Should include abandoned games in history", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const [gameIds, scores, timestamps, states] = await puzzle.getPlayerHistory(
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

      const tx = await puzzle.connect(owner).updateGameFee(newFee);

      await expect(tx)
        .to.emit(puzzle, "GameFeeUpdated")
        .withArgs(GAME_FEE, newFee);

      expect(await puzzle.gameFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      await expect(
        puzzle.connect(player1).updateGameFee(newFee)
      ).to.be.revertedWithCustomError(puzzle, "OwnableUnauthorizedAccount");
    });

    it("Should allow setting fee to zero", async function () {
      await puzzle.connect(owner).updateGameFee(0);
      expect(await puzzle.gameFee()).to.equal(0);
    });

    it("Should allow owner to withdraw fees", async function () {
      const initialPuzzle = createInitialPuzzle();

      for (let i = 0; i < 3; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, {
          value: GAME_FEE,
        });
      }

      const contractAddress = await puzzle.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await puzzle.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(puzzle, "FeesWithdrawn")
        .withArgs(owner.address, contractBalance);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
      const newContractBalance = await ethers.provider.getBalance(contractAddress);
      expect(newContractBalance).to.equal(0);
    });

    it("Should revert withdrawal if no fees collected", async function () {
      await expect(
        puzzle.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        puzzle.connect(player1).withdrawFees()
      ).to.be.revertedWithCustomError(puzzle, "OwnableUnauthorizedAccount");
    });

    it("Should accumulate fees from multiple games", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
      await puzzle.connect(player2).startGame(initialPuzzle, { value: GAME_FEE });
      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const contractAddress = await puzzle.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);
    });
  });

  describe("Multiple players", function () {
    it("Should handle games from different players independently", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, {
        value: GAME_FEE,
      });

      await puzzle.connect(player2).startGame(initialPuzzle, {
        value: GAME_FEE,
      });

      const [gameId1] = await puzzle.getActiveGame(player1.address);
      const [gameId2] = await puzzle.getActiveGame(player2.address);

      expect(gameId1).to.equal(1);
      expect(gameId2).to.equal(2);

      const player1Games = await puzzle.getPlayerGames(player1.address);
      const player2Games = await puzzle.getPlayerGames(player2.address);

      expect(player1Games.length).to.equal(1);
      expect(player2Games.length).to.equal(1);
      expect(player1Games[0]).to.equal(1);
      expect(player2Games[0]).to.equal(2);
    });

    it("Should maintain separate game histories for different players", async function () {
      const initialPuzzle = createInitialPuzzle();

      for (let i = 0; i < 2; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
        await puzzle.connect(player1).submitGame(
          i * 2 + 1,
          (i + 1) * 2500,
          ethers.toUtf8Bytes("U,D,L,R")
        );

        await puzzle.connect(player2).startGame(initialPuzzle, { value: GAME_FEE });
        await puzzle.connect(player2).submitGame(
          i * 2 + 2,
          (i + 1) * 1500,
          ethers.toUtf8Bytes("L,R,U,D")
        );
      }

      const [gameIds1, scores1] = await puzzle.getPlayerHistory(player1.address, 10, 0);
      const [gameIds2, scores2] = await puzzle.getPlayerHistory(player2.address, 10, 0);

      expect(gameIds1.length).to.equal(2);
      expect(gameIds2.length).to.equal(2);
      expect(scores1[0]).to.equal(5000);
      expect(scores2[0]).to.equal(3000);
    });
  });

  describe("Game state transitions", function () {
    it("Should correctly transition from Active to Completed", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      let game = await puzzle.getGameSession(1);
      expect(game.state).to.equal(0); // GameState.Active

      const moves = ethers.toUtf8Bytes("U,D,L,R");
      await puzzle.connect(player1).submitGame(1, 2000, moves);

      game = await puzzle.getGameSession(1);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should correctly transition from Active to Abandoned", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      let game = await puzzle.getGameSession(1);
      expect(game.state).to.equal(0); // GameState.Active

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      game = await puzzle.getGameSession(1);
      expect(game.state).to.equal(2); // GameState.Abandoned
    });

    it("Should not allow transition from Completed", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const moves = ethers.toUtf8Bytes("U,D");
      await puzzle.connect(player1).submitGame(1, 1800, moves);

      await expect(
        puzzle.connect(player1).submitGame(1, 2500, moves)
      ).to.be.revertedWith("Game not active");
    });
  });

  describe("Edge cases", function () {
    it("Should handle game with empty moves", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      const emptyMoves = ethers.toUtf8Bytes("");
      await puzzle.connect(player1).submitGame(1, 0, emptyMoves);

      const game = await puzzle.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should handle game with many moves", async function () {
      const initialPuzzle = createInitialPuzzle();

      await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });

      // Many moves (poor performance)
      const manyMoves = ethers.toUtf8Bytes("U,D,L,R,U,D,L,R,U,D,L,R,U,D,L,R,U,D,L,R,U,D,L,R,U,D,L,R,U,D");
      await puzzle.connect(player1).submitGame(1, 500, manyMoves);

      const game = await puzzle.getGameSession(1);
      expect(game.moves).to.equal(ethers.hexlify(manyMoves));
      expect(game.finalScore).to.equal(500);
    });

    it("Should handle sequential games from same player", async function () {
      const initialPuzzle = createInitialPuzzle();

      for (let i = 0; i < 5; i++) {
        await puzzle.connect(player1).startGame(initialPuzzle, { value: GAME_FEE });
        const moves = ethers.toUtf8Bytes("U,D,L,R");
        await puzzle.connect(player1).submitGame(i + 1, i * 500, moves);
      }

      const playerGames = await puzzle.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(5);
    });

    it("Should handle different puzzle configurations", async function () {
      const puzzle1 = ethers.toUtf8Bytes("EASY_PUZZLE");
      const puzzle2 = ethers.toUtf8Bytes("HARD_PUZZLE");

      await puzzle.connect(player1).startGame(puzzle1, { value: GAME_FEE });
      const game1 = await puzzle.getGameSessionWithPuzzle(1);

      await puzzle.connect(player2).startGame(puzzle2, { value: GAME_FEE });
      const game2 = await puzzle.getGameSessionWithPuzzle(2);

      expect(game1.initialPuzzle).to.not.equal(game2.initialPuzzle);
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
      await mockToken.mint(await puzzle.getAddress(), tokenAmount);

      const contractTokenBalance = await mockToken.balanceOf(await puzzle.getAddress());
      expect(contractTokenBalance).to.equal(tokenAmount);

      const ownerBalanceBefore = await mockToken.balanceOf(owner.address);

      // Withdraw lost tokens
      await puzzle.connect(owner).withdrawLostTokens(await mockToken.getAddress());

      const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + tokenAmount);

      const contractTokenBalanceAfter = await mockToken.balanceOf(await puzzle.getAddress());
      expect(contractTokenBalanceAfter).to.equal(0);
    });

    it("Should revert if non-owner tries to withdraw lost tokens", async function () {
      const tokenAmount = ethers.parseEther("50");
      await mockToken.mint(await puzzle.getAddress(), tokenAmount);

      await expect(
        puzzle.connect(player1).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWithCustomError(puzzle, "OwnableUnauthorizedAccount");
    });

    it("Should revert if zero address is provided", async function () {
      await expect(
        puzzle.connect(owner).withdrawLostTokens(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert if no tokens to withdraw", async function () {
      await expect(
        puzzle.connect(owner).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWith("No tokens to withdraw");
    });
  });
});
