const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Tetris", function () {
  let tetris;
  let owner;
  let player1;
  let player2;

  const GAME_FEE = ethers.parseEther("0.0001");

  // Create initial game state (seed for piece generation)
  const createInitialState = () => {
    return ethers.toUtf8Bytes("PIECE_SEED_789");
  };

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const Tetris = await ethers.getContractFactory("Tetris");
    tetris = await Tetris.deploy();
    await tetris.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await tetris.owner()).to.equal(owner.address);
    });

    it("Should set the default game fee", async function () {
      expect(await tetris.gameFee()).to.equal(GAME_FEE);
    });

    it("Should initialize game counter at 0", async function () {
      expect(await tetris.gameIdCounter()).to.equal(0);
    });
  });

  describe("Starting a game", function () {
    it("Should start a new game with correct fee", async function () {
      const initialState = createInitialState();

      const tx = await tetris.connect(player1).startGame(initialState, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(tetris, "GameStarted")
        .withArgs(player1.address, 1, initialState);

      expect(await tetris.gameIdCounter()).to.equal(1);
    });

    it("Should revert if insufficient fee is sent", async function () {
      const initialState = createInitialState();

      await expect(
        tetris.connect(player1).startGame(initialState, {
          value: ethers.parseEther("0.00005"),
        })
      ).to.be.revertedWith("Insufficient game fee");
    });

    it("Should refund excess payment", async function () {
      const initialState = createInitialState();
      const excessFee = ethers.parseEther("0.001");

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await tetris.connect(player1).startGame(initialState, {
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
      const initialState1 = createInitialState();
      const initialState2 = ethers.toUtf8Bytes("PIECE_SEED_987");

      await tetris.connect(player1).startGame(initialState1, {
        value: GAME_FEE,
      });

      const tx = await tetris.connect(player1).startGame(initialState2, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(tetris, "GameAbandoned")
        .withArgs(player1.address, 1);

      await expect(tx)
        .to.emit(tetris, "GameStarted")
        .withArgs(player1.address, 2, initialState2);

      const game1 = await tetris.getGameSession(1);
      expect(game1.state).to.equal(2);
    });

    it("Should track player games correctly", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });
      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const playerGames = await tetris.getPlayerGames(player1.address);
      expect(playerGames.length).to.equal(2);
      expect(playerGames[0]).to.equal(1);
      expect(playerGames[1]).to.equal(2);
    });
  });

  describe("Getting active game", function () {
    it("Should return active game if exists", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, {
        value: GAME_FEE,
      });

      const [gameId, returnedState] = await tetris.getActiveGame(player1.address);

      expect(gameId).to.equal(1);
      expect(returnedState).to.equal(ethers.hexlify(initialState));
    });

    it("Should return 0 if no active game", async function () {
      const [gameId] = await tetris.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is completed", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, {
        value: GAME_FEE,
      });

      const moves = ethers.toUtf8Bytes("LRDLRDLR");
      await tetris.connect(player1).submitGame(1, 500, moves);

      const [gameId] = await tetris.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });
  });

  describe("Submitting a game", function () {
    beforeEach(async function () {
      const initialState = createInitialState();
      await tetris.connect(player1).startGame(initialState, {
        value: GAME_FEE,
      });
    });

    it("Should submit game with score and moves", async function () {
      const finalScore = 1500;
      const moves = ethers.toUtf8Bytes("LRLRLRDDD");

      const tx = await tetris.connect(player1).submitGame(1, finalScore, moves);

      await expect(tx)
        .to.emit(tetris, "GameCompleted")
        .withArgs(player1.address, 1, finalScore, moves.length);

      const game = await tetris.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
      expect(game.moves).to.equal(ethers.hexlify(moves));
      expect(game.state).to.equal(1);
    });

    it("Should revert if not the game owner", async function () {
      const moves = ethers.toUtf8Bytes("LRLR");

      await expect(
        tetris.connect(player2).submitGame(1, 1000, moves)
      ).to.be.revertedWith("Not your game");
    });

    it("Should revert if game is not active", async function () {
      const moves = ethers.toUtf8Bytes("LRLR");

      await tetris.connect(player1).submitGame(1, 1000, moves);

      await expect(
        tetris.connect(player1).submitGame(1, 2000, moves)
      ).to.be.revertedWith("Game not active");
    });

    it("Should store moves correctly", async function () {
      const finalScore = 2000;
      const moves = ethers.toUtf8Bytes("LLLLRRRRDDDDL");

      await tetris.connect(player1).submitGame(1, finalScore, moves);

      const game = await tetris.getGameSession(1);
      expect(game.moves).to.equal(ethers.hexlify(moves));
    });

    it("Should handle high scores", async function () {
      const finalScore = 999999;
      const moves = ethers.toUtf8Bytes("LRDLRDLRD");

      await tetris.connect(player1).submitGame(1, finalScore, moves);

      const game = await tetris.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
    });
  });

  describe("Getting game session", function () {
    it("Should return complete game session data", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const finalScore = 3500;
      const moves = ethers.toUtf8Bytes("LRDLRD");

      await tetris.connect(player1).submitGame(1, finalScore, moves);

      const gameSession = await tetris.getGameSession(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.finalScore).to.equal(finalScore);
      expect(gameSession.moves).to.equal(ethers.hexlify(moves));
      expect(gameSession.state).to.equal(1);
    });

    it("Should return game session with initial state", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const gameSession = await tetris.getGameSessionWithState(1);
      expect(gameSession.player).to.equal(player1.address);
      expect(gameSession.initialState).to.equal(ethers.hexlify(initialState));
      expect(gameSession.state).to.equal(0);
    });
  });

  describe("Player history", function () {
    it("Should return player's game history", async function () {
      const initialState = createInitialState();

      for (let i = 0; i < 3; i++) {
        await tetris.connect(player1).startGame(initialState, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("LRLR");
        await tetris.connect(player1).submitGame(i + 1, (i + 1) * 1000, moves);
      }

      const [gameIds, scores, timestamps, states] = await tetris.getPlayerHistory(
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
      const initialState = createInitialState();

      for (let i = 0; i < 5; i++) {
        await tetris.connect(player1).startGame(initialState, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("LRLR");
        await tetris.connect(player1).submitGame(i + 1, (i + 1) * 1000, moves);
      }

      const [gameIds1] = await tetris.getPlayerHistory(player1.address, 2, 0);
      expect(gameIds1.length).to.equal(2);

      const [gameIds2] = await tetris.getPlayerHistory(player1.address, 2, 2);
      expect(gameIds2.length).to.equal(2);

      const [gameIds3] = await tetris.getPlayerHistory(player1.address, 2, 4);
      expect(gameIds3.length).to.equal(1);
    });

    it("Should return empty arrays for player with no games", async function () {
      const history = await tetris.getPlayerHistory(player1.address, 10, 0);
      expect(history.gameIds.length).to.equal(0);
      expect(history.scores.length).to.equal(0);
      expect(history.timestamps.length).to.equal(0);
      expect(history.states.length).to.equal(0);
    });

    it("Should correctly order games in history", async function () {
      const initialState = createInitialState();

      const scores = [100, 200, 300, 400, 500];
      for (let i = 0; i < scores.length; i++) {
        await tetris.connect(player1).startGame(initialState, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("LR");
        await tetris.connect(player1).submitGame(i + 1, scores[i], moves);
      }

      const [gameIds, returnedScores] = await tetris.getPlayerHistory(player1.address, 10, 0);

      expect(returnedScores[0]).to.equal(500);
      expect(returnedScores[4]).to.equal(100);
    });
  });

  describe("Fee management", function () {
    it("Should allow owner to update game fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      const tx = await tetris.connect(owner).updateGameFee(newFee);

      await expect(tx)
        .to.emit(tetris, "GameFeeUpdated")
        .withArgs(GAME_FEE, newFee);

      expect(await tetris.gameFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      await expect(
        tetris.connect(player1).updateGameFee(newFee)
      ).to.be.revertedWithCustomError(tetris, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw fees", async function () {
      const initialState = createInitialState();

      for (let i = 0; i < 3; i++) {
        await tetris.connect(player1).startGame(initialState, {
          value: GAME_FEE,
        });
      }

      const contractAddress = await tetris.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await tetris.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(tetris, "FeesWithdrawn")
        .withArgs(owner.address, contractBalance);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
      const newContractBalance = await ethers.provider.getBalance(contractAddress);
      expect(newContractBalance).to.equal(0);
    });

    it("Should revert withdrawal if no fees collected", async function () {
      await expect(
        tetris.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        tetris.connect(player1).withdrawFees()
      ).to.be.revertedWithCustomError(tetris, "OwnableUnauthorizedAccount");
    });

    it("Should accumulate fees from multiple games", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });
      await tetris.connect(player2).startGame(initialState, { value: GAME_FEE });
      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const contractAddress = await tetris.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);
    });
  });

  describe("Multiple players", function () {
    it("Should handle games from different players independently", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, {
        value: GAME_FEE,
      });

      await tetris.connect(player2).startGame(initialState, {
        value: GAME_FEE,
      });

      const [gameId1] = await tetris.getActiveGame(player1.address);
      const [gameId2] = await tetris.getActiveGame(player2.address);

      expect(gameId1).to.equal(1);
      expect(gameId2).to.equal(2);

      const player1Games = await tetris.getPlayerGames(player1.address);
      const player2Games = await tetris.getPlayerGames(player2.address);

      expect(player1Games.length).to.equal(1);
      expect(player2Games.length).to.equal(1);
      expect(player1Games[0]).to.equal(1);
      expect(player2Games[0]).to.equal(2);
    });

    it("Should maintain separate game histories for different players", async function () {
      const initialState = createInitialState();

      for (let i = 0; i < 2; i++) {
        await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });
        await tetris.connect(player1).submitGame(
          i * 2 + 1,
          (i + 1) * 1000,
          ethers.toUtf8Bytes("LR")
        );

        await tetris.connect(player2).startGame(initialState, { value: GAME_FEE });
        await tetris.connect(player2).submitGame(
          i * 2 + 2,
          (i + 1) * 500,
          ethers.toUtf8Bytes("RL")
        );
      }

      const [gameIds1, scores1] = await tetris.getPlayerHistory(player1.address, 10, 0);
      const [gameIds2, scores2] = await tetris.getPlayerHistory(player2.address, 10, 0);

      expect(gameIds1.length).to.equal(2);
      expect(gameIds2.length).to.equal(2);
      expect(scores1[0]).to.equal(2000);
      expect(scores2[0]).to.equal(1000);
    });
  });

  describe("Game state transitions", function () {
    it("Should correctly transition from Active to Completed", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      let game = await tetris.getGameSession(1);
      expect(game.state).to.equal(0);

      const moves = ethers.toUtf8Bytes("LRLR");
      await tetris.connect(player1).submitGame(1, 1500, moves);

      game = await tetris.getGameSession(1);
      expect(game.state).to.equal(1);
    });

    it("Should correctly transition from Active to Abandoned", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      let game = await tetris.getGameSession(1);
      expect(game.state).to.equal(0);

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      game = await tetris.getGameSession(1);
      expect(game.state).to.equal(2);
    });
  });

  describe("Edge cases", function () {
    it("Should handle zero score submission", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const moves = ethers.toUtf8Bytes("L");
      await tetris.connect(player1).submitGame(1, 0, moves);

      const game = await tetris.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1);
    });

    it("Should handle game with empty moves", async function () {
      const initialState = createInitialState();

      await tetris.connect(player1).startGame(initialState, { value: GAME_FEE });

      const emptyMoves = ethers.toUtf8Bytes("");
      await tetris.connect(player1).submitGame(1, 0, emptyMoves);

      const game = await tetris.getGameSession(1);
      expect(game.finalScore).to.equal(0);
      expect(game.state).to.equal(1);
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
      await mockToken.mint(await tetris.getAddress(), tokenAmount);

      const contractTokenBalance = await mockToken.balanceOf(await tetris.getAddress());
      expect(contractTokenBalance).to.equal(tokenAmount);

      const ownerBalanceBefore = await mockToken.balanceOf(owner.address);

      // Withdraw lost tokens
      await tetris.connect(owner).withdrawLostTokens(await mockToken.getAddress());

      const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + tokenAmount);

      const contractTokenBalanceAfter = await mockToken.balanceOf(await tetris.getAddress());
      expect(contractTokenBalanceAfter).to.equal(0);
    });

    it("Should revert if non-owner tries to withdraw lost tokens", async function () {
      const tokenAmount = ethers.parseEther("50");
      await mockToken.mint(await tetris.getAddress(), tokenAmount);

      await expect(
        tetris.connect(player1).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWithCustomError(tetris, "OwnableUnauthorizedAccount");
    });

    it("Should revert if zero address is provided", async function () {
      await expect(
        tetris.connect(owner).withdrawLostTokens(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert if no tokens to withdraw", async function () {
      await expect(
        tetris.connect(owner).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWith("No tokens to withdraw");
    });
  });
});
