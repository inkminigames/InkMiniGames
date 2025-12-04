const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Game2048", function () {
  let game2048;
  let owner;
  let player1;
  let player2;

  const GAME_FEE = ethers.parseEther("0.0001");

  // Sample initial board (4x4 grid with two tiles)
  const createInitialBoard = () => {
    const board = new Array(16).fill(0);
    board[0] = 2;  // Top-left
    board[5] = 2;  // Middle
    return board;
  };

  // Encode board as bytes for the new interface
  const encodeBoard = (board) => {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256[16]"],
      [board]
    );
  };

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const Game2048 = await ethers.getContractFactory("Game2048");
    game2048 = await Game2048.deploy();
    await game2048.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await game2048.owner()).to.equal(owner.address);
    });

    it("Should set the default game fee", async function () {
      expect(await game2048.gameFee()).to.equal(GAME_FEE);
    });

    it("Should initialize game counter at 0", async function () {
      expect(await game2048.gameIdCounter()).to.equal(0);
    });
  });

  describe("Starting a game", function () {
    it("Should start a new game with correct fee", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      const tx = await game2048.connect(player1).startGame(encodedBoard, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(game2048, "GameStarted")
        .withArgs(player1.address, 1, encodedBoard);

      expect(await game2048.gameIdCounter()).to.equal(1);
    });

    it("Should revert if insufficient fee is sent", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      await expect(
        game2048.connect(player1).startGame(encodedBoard, {
          value: ethers.parseEther("0.00005"),
        })
      ).to.be.revertedWith("Insufficient game fee");
    });

    it("Should refund excess payment", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);
      const excessFee = ethers.parseEther("0.001");

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await game2048.connect(player1).startGame(encodedBoard, {
        value: excessFee,
      });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(player1.address);

      // Balance should decrease by (gameFee + gas), not (excessFee + gas)
      const expectedDecrease = GAME_FEE + gasUsed;
      const actualDecrease = balanceBefore - balanceAfter;

      expect(actualDecrease).to.be.closeTo(expectedDecrease, ethers.parseEther("0.00001"));
    });

    it("Should abandon previous active game when starting a new one", async function () {
      const initialBoard1 = createInitialBoard();
      const initialBoard2 = createInitialBoard();
      const encodedBoard1 = encodeBoard(initialBoard1);
      const encodedBoard2 = encodeBoard(initialBoard2);

      // Start first game
      await game2048.connect(player1).startGame(encodedBoard1, {
        value: GAME_FEE,
      });

      // Start second game without completing first
      const tx = await game2048.connect(player1).startGame(encodedBoard2, {
        value: GAME_FEE,
      });

      await expect(tx)
        .to.emit(game2048, "GameAbandoned")
        .withArgs(player1.address, 1);

      await expect(tx)
        .to.emit(game2048, "GameStarted")
        .withArgs(player1.address, 2, encodedBoard2);

      // Check first game is abandoned
      const game1 = await game2048.getGameSession(1);
      expect(game1.state).to.equal(2); // GameState.Abandoned
    });
  });

  describe("Getting active game", function () {
    it("Should return active game if exists", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      await game2048.connect(player1).startGame(encodedBoard, {
        value: GAME_FEE,
      });

      const [gameId, returnedData] = await game2048.getActiveGame(player1.address);

      expect(gameId).to.equal(1);
      expect(returnedData).to.equal(encodedBoard);
    });

    it("Should return 0 if no active game", async function () {
      const [gameId] = await game2048.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });

    it("Should return 0 if last game is completed", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      await game2048.connect(player1).startGame(encodedBoard, {
        value: GAME_FEE,
      });

      // Submit game
      const moves = ethers.toUtf8Bytes("UDLR"); // Up, Down, Left, Right
      await game2048.connect(player1).submitGame(1, 256, moves);

      const [gameId] = await game2048.getActiveGame(player1.address);
      expect(gameId).to.equal(0);
    });
  });

  describe("Submitting a game", function () {
    beforeEach(async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);
      await game2048.connect(player1).startGame(encodedBoard, {
        value: GAME_FEE,
      });
    });

    it("Should submit game with score and moves", async function () {
      const finalScore = 1024;
      const moves = ethers.toUtf8Bytes("UDLRUDLR");

      const tx = await game2048.connect(player1).submitGame(1, finalScore, moves);

      await expect(tx)
        .to.emit(game2048, "GameCompleted")
        .withArgs(player1.address, 1, finalScore, moves.length);

      const game = await game2048.getGameSession(1);
      expect(game.finalScore).to.equal(finalScore);
      expect(game.moves).to.equal(ethers.hexlify(moves));
      expect(game.state).to.equal(1); // GameState.Completed
    });

    it("Should revert if not the game owner", async function () {
      const moves = ethers.toUtf8Bytes("UDLR");

      await expect(
        game2048.connect(player2).submitGame(1, 256, moves)
      ).to.be.revertedWith("Not your game");
    });

    it("Should revert if game is not active", async function () {
      const moves = ethers.toUtf8Bytes("UDLR");

      // Submit once
      await game2048.connect(player1).submitGame(1, 256, moves);

      // Try to submit again
      await expect(
        game2048.connect(player1).submitGame(1, 512, moves)
      ).to.be.revertedWith("Game not active");
    });
  });

  describe("Player history", function () {
    it("Should return player's game history", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      // Play 3 games
      for (let i = 0; i < 3; i++) {
        await game2048.connect(player1).startGame(encodedBoard, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("UDLR");
        await game2048.connect(player1).submitGame(i + 1, (i + 1) * 100, moves);
      }

      const [gameIds, scores, timestamps, states] = await game2048.getPlayerHistory(
        player1.address,
        10,
        0
      );

      expect(gameIds.length).to.equal(3);
      // Should be in reverse order (most recent first)
      expect(scores[0]).to.equal(300);
      expect(scores[1]).to.equal(200);
      expect(scores[2]).to.equal(100);

      // All should be completed
      expect(states.every(state => state === 1n)).to.be.true;
    });

    it("Should handle pagination correctly", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      // Play 5 games
      for (let i = 0; i < 5; i++) {
        await game2048.connect(player1).startGame(encodedBoard, {
          value: GAME_FEE,
        });

        const moves = ethers.toUtf8Bytes("UDLR");
        await game2048.connect(player1).submitGame(i + 1, (i + 1) * 100, moves);
      }

      // Get first 2 games
      const [gameIds1] = await game2048.getPlayerHistory(player1.address, 2, 0);
      expect(gameIds1.length).to.equal(2);

      // Get next 2 games
      const [gameIds2] = await game2048.getPlayerHistory(player1.address, 2, 2);
      expect(gameIds2.length).to.equal(2);

      // Get last game
      const [gameIds3] = await game2048.getPlayerHistory(player1.address, 2, 4);
      expect(gameIds3.length).to.equal(1);
    });
  });

  describe("Fee management", function () {
    it("Should allow owner to update game fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      const tx = await game2048.connect(owner).updateGameFee(newFee);

      await expect(tx)
        .to.emit(game2048, "GameFeeUpdated")
        .withArgs(GAME_FEE, newFee);

      expect(await game2048.gameFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      const newFee = ethers.parseEther("0.0002");

      await expect(
        game2048.connect(player1).updateGameFee(newFee)
      ).to.be.revertedWithCustomError(game2048, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw fees", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      // Play 3 games to collect fees
      for (let i = 0; i < 3; i++) {
        await game2048.connect(player1).startGame(encodedBoard, {
          value: GAME_FEE,
        });
      }

      const contractAddress = await game2048.getAddress();
      const contractBalance = await ethers.provider.getBalance(contractAddress);
      expect(contractBalance).to.equal(GAME_FEE * 3n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await game2048.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(game2048, "FeesWithdrawn")
        .withArgs(owner.address, contractBalance);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
      const newContractBalance = await ethers.provider.getBalance(contractAddress);
      expect(newContractBalance).to.equal(0);
    });

    it("Should revert withdrawal if no fees collected", async function () {
      await expect(
        game2048.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        game2048.connect(player1).withdrawFees()
      ).to.be.revertedWithCustomError(game2048, "OwnableUnauthorizedAccount");
    });
  });

  describe("Multiple players", function () {
    it("Should handle games from different players independently", async function () {
      const initialBoard = createInitialBoard();
      const encodedBoard = encodeBoard(initialBoard);

      // Player 1 starts a game
      await game2048.connect(player1).startGame(encodedBoard, {
        value: GAME_FEE,
      });

      // Player 2 starts a game
      await game2048.connect(player2).startGame(encodedBoard, {
        value: GAME_FEE,
      });

      // Each should have their own active game
      const [gameId1] = await game2048.getActiveGame(player1.address);
      const [gameId2] = await game2048.getActiveGame(player2.address);

      expect(gameId1).to.equal(1);
      expect(gameId2).to.equal(2);

      // Each should only see their own games
      const player1Games = await game2048.getPlayerGames(player1.address);
      const player2Games = await game2048.getPlayerGames(player2.address);

      expect(player1Games.length).to.equal(1);
      expect(player2Games.length).to.equal(1);
      expect(player1Games[0]).to.equal(1);
      expect(player2Games[0]).to.equal(2);
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
      await mockToken.mint(await game2048.getAddress(), tokenAmount);

      const contractTokenBalance = await mockToken.balanceOf(await game2048.getAddress());
      expect(contractTokenBalance).to.equal(tokenAmount);

      const ownerBalanceBefore = await mockToken.balanceOf(owner.address);

      // Withdraw lost tokens
      await game2048.connect(owner).withdrawLostTokens(await mockToken.getAddress());

      const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + tokenAmount);

      const contractTokenBalanceAfter = await mockToken.balanceOf(await game2048.getAddress());
      expect(contractTokenBalanceAfter).to.equal(0);
    });

    it("Should revert if non-owner tries to withdraw lost tokens", async function () {
      const tokenAmount = ethers.parseEther("50");
      await mockToken.mint(await game2048.getAddress(), tokenAmount);

      await expect(
        game2048.connect(player1).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWithCustomError(game2048, "OwnableUnauthorizedAccount");
    });

    it("Should revert if zero address is provided", async function () {
      await expect(
        game2048.connect(owner).withdrawLostTokens(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert if no tokens to withdraw", async function () {
      await expect(
        game2048.connect(owner).withdrawLostTokens(await mockToken.getAddress())
      ).to.be.revertedWith("No tokens to withdraw");
    });
  });
});
