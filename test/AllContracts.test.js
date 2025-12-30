const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎮 Joybit Contracts Test Suite", function () {
  let treasury, match3Game, cardGame, dailyClaim, joybitToken, achievementERC1155;
  let owner, player1, player2, admin;

  beforeEach(async function () {
    [owner, player1, player2, admin] = await ethers.getSigners();

    // Deploy mock JOYB token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    joybitToken = await MockERC20.deploy();
    await joybitToken.waitForDeployment();

    // Deploy Treasury (with mock token address)
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await joybitToken.getAddress());
    await treasury.waitForDeployment();

    // Fund treasury with tokens for testing
    await joybitToken.transfer(await treasury.getAddress(), ethers.parseEther("10000"));

    // Set lower minimum balance for testing
    const tokenAddress = await treasury.joybitToken();
    await treasury.setMinimumTokenBalance(tokenAddress, ethers.parseEther("1000"));

    // Deploy Match3Game
    const Match3Game = await ethers.getContractFactory("Match3Game");
    match3Game = await Match3Game.deploy(await treasury.getAddress());
    await match3Game.waitForDeployment();

    // Deploy CardGame
    const CardGame = await ethers.getContractFactory("CardGame");
    cardGame = await CardGame.deploy(await treasury.getAddress());
    await cardGame.waitForDeployment();

    // Deploy DailyClaim
    const DailyClaim = await ethers.getContractFactory("DailyClaim");
    dailyClaim = await DailyClaim.deploy(await treasury.getAddress());
    await dailyClaim.waitForDeployment();

    // Deploy AchievementERC1155
    const AchievementERC1155 = await ethers.getContractFactory("AchievementERC1155");
    achievementERC1155 = await AchievementERC1155.deploy(await treasury.getAddress(), "ipfs://test/");
    await achievementERC1155.waitForDeployment();

    // Setup: Add contracts as admins
    await treasury.addAdmin(await match3Game.getAddress());
    await treasury.addAdmin(await cardGame.getAddress());
    await treasury.addAdmin(await dailyClaim.getAddress());

    // Add a test achievement
    await achievementERC1155.addAchievement(1, 0, ethers.parseEther("0.01")); // Common, 0.01 ETH
  });

  describe("📊 Treasury Contract", function () {
    it("✅ Should accept ETH and track total collected", async function () {
      const amount = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: amount,
      });

      const balance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(balance).to.equal(amount);
    });

    it("✅ Should add and remove admins", async function () {
      await treasury.addAdmin(admin.address);
      expect(await treasury.isAdmin(admin.address)).to.be.true;

      await treasury.removeAdmin(admin.address);
      expect(await treasury.isAdmin(admin.address)).to.be.false;
    });

    it("✅ Should credit rewards (admin only)", async function () {
      const reward = ethers.parseEther("100");
      await treasury.connect(owner).addAdmin(owner.address);
      const tokenAddress = await treasury.joybitToken();
      await treasury.creditReward(player1.address, tokenAddress, reward);

      expect(await treasury.pendingRewards(player1.address, tokenAddress)).to.equal(reward);
    });

    it("✅ Should allow players to claim token rewards", async function () {
      const reward = ethers.parseEther("100");
      await treasury.connect(owner).addAdmin(owner.address);
      const tokenAddress = await treasury.joybitToken();
      await treasury.creditReward(player1.address, tokenAddress, reward);

      await treasury.connect(player1).claimToken(tokenAddress);

      const balance = await joybitToken.balanceOf(player1.address);
      expect(balance).to.equal(reward);
      expect(await treasury.pendingRewards(player1.address, tokenAddress)).to.equal(0);
    });

    it("✅ Should batch distribute rewards", async function () {
      const players = [player1.address, player2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const tokenAddress = await treasury.joybitToken();

      await treasury.batchDistributeRewards(tokenAddress, players, amounts);

      expect(await joybitToken.balanceOf(player1.address)).to.equal(amounts[0]);
      expect(await joybitToken.balanceOf(player2.address)).to.equal(amounts[1]);
    });

    it("✅ Should withdraw ETH (owner only)", async function () {
      const amount = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: amount,
      });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await treasury.withdrawETH(amount);
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });

  describe("🎯 Match3Game Contract", function () {
    it("✅ Should allow free play (first time)", async function () {
      expect(await match3Game.canPlayFree(player1.address)).to.be.true;

      const tx = await match3Game.connect(player1).startGame(1);
      const receipt = await tx.wait();

      expect(await match3Game.canPlayFree(player1.address)).to.be.false;
    });

    it("✅ Should require payment after free play", async function () {
      await match3Game.connect(player1).startGame(1); // Free play

      const playFee = await match3Game.playFee();
      const tx = await match3Game.connect(player1).startGame(1, { value: playFee });
      await tx.wait();

      const treasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(treasuryBalance).to.equal(playFee);
    });

    it("✅ Should track game sessions", async function () {
      const tx = await match3Game.connect(player1).startGame(1);
      const receipt = await tx.wait();

      const sessionId = 1n;
      const session = await match3Game.sessions(sessionId);
      
      expect(session.player).to.equal(player1.address);
      expect(session.active).to.be.true;
      expect(session.level).to.equal(1);
    });

    it("✅ Should buy single booster", async function () {
      const hammerPrice = await match3Game.hammerPrice();
      await match3Game.connect(player1).buyHammer({ value: hammerPrice });

      const playerData = await match3Game.players(player1.address);
      expect(playerData.hammers).to.equal(1);
    });

    it("✅ Should buy booster pack (x5)", async function () {
      const packPrice = await match3Game.hammerPackPrice();
      await match3Game.connect(player1).buyHammerPack({ value: packPrice });

      const playerData = await match3Game.players(player1.address);
      expect(playerData.hammers).to.equal(5);
    });

    it("✅ Should use booster and deduct from inventory", async function () {
      const hammerPrice = await match3Game.hammerPrice();
      await match3Game.connect(player1).buyHammer({ value: hammerPrice });

      await match3Game.connect(player1).startGame(1);
      await match3Game.connect(player1).useBooster("hammer");

      const playerData = await match3Game.players(player1.address);
      expect(playerData.hammers).to.equal(0);
    });

    it("✅ Should update play fee (owner only)", async function () {
      const newFee = ethers.parseEther("0.005");
      await match3Game.setPlayFee(newFee);

      expect(await match3Game.playFee()).to.equal(newFee);
    });

    it("✅ Should update level rewards (owner only)", async function () {
      const newReward = ethers.parseEther("500");
      await match3Game.setLevelReward(1, newReward);

      expect(await match3Game.levelRewards(1)).to.equal(newReward);
    });
  });

  describe("🃏 CardGame Contract", function () {
    it("✅ Should allow free play (first time)", async function () {
      expect(await cardGame.canPlayFree(player1.address)).to.be.true;

      await cardGame.connect(player1).playGame(0); // Select card 0

      expect(await cardGame.canPlayFree(player1.address)).to.be.false;
    });

    it("✅ Should require payment after free play", async function () {
      await cardGame.connect(player1).playGame(0); // Free play

      const playFee = await cardGame.playFee();
      await cardGame.connect(player1).playGame(1, { value: playFee });

      const treasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(treasuryBalance).to.equal(playFee);
    });

    it("✅ Should track game sessions", async function () {
      await cardGame.connect(player1).playGame(0);

      const session = await cardGame.sessions(1);
      expect(session.player).to.equal(player1.address);
      expect(session.selectedCard).to.equal(0);
      expect(session.completed).to.be.true;
    });

    it("✅ Should update play fee (owner only)", async function () {
      const newFee = ethers.parseEther("0.003");
      await cardGame.setPlayFee(newFee);

      expect(await cardGame.playFee()).to.equal(newFee);
    });

    it("✅ Should update win reward (owner only)", async function () {
      const newReward = ethers.parseEther("200");
      await cardGame.setWinReward(newReward);

      expect(await cardGame.winReward()).to.equal(newReward);
    });
  });

  describe("📅 DailyClaim Contract", function () {
    it("✅ Should allow first daily claim", async function () {
      expect(await dailyClaim.canClaim(player1.address)).to.be.true;

      await dailyClaim.connect(player1).claimDaily();

      const tokenAddress = await treasury.joybitToken();
      const reward = await treasury.pendingRewards(player1.address, tokenAddress);
      expect(reward).to.equal(ethers.parseEther("100")); // Base reward
    });

    it("✅ Should prevent claiming twice in 24h", async function () {
      await dailyClaim.connect(player1).claimDaily();

      expect(await dailyClaim.canClaim(player1.address)).to.be.false;
      await expect(dailyClaim.connect(player1).claimDaily()).to.be.revertedWith(
        "Already claimed today"
      );
    });

    it("✅ Should increase streak on consecutive claims", async function () {
      await dailyClaim.connect(player1).claimDaily();

      // Fast forward 25 hours
      await ethers.provider.send("evm_increaseTime", [25 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await dailyClaim.connect(player1).claimDaily();

      const playerData = await dailyClaim.players(player1.address);
      expect(playerData.currentStreak).to.equal(2);

      // Second claim should have bonus
      const tokenAddress = await treasury.joybitToken();
      const reward = await treasury.pendingRewards(player1.address, tokenAddress);
      const expectedReward = ethers.parseEther("100") + ethers.parseEther("100") + ethers.parseEther("10"); // base + base + bonus
      expect(reward).to.equal(expectedReward);
    });

    it("✅ Should reset streak if missed 48h window", async function () {
      await dailyClaim.connect(player1).claimDaily();

      // Fast forward 49 hours
      await ethers.provider.send("evm_increaseTime", [49 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await dailyClaim.connect(player1).claimDaily();

      const playerData = await dailyClaim.players(player1.address);
      expect(playerData.currentStreak).to.equal(1); // Reset to 1
    });

    it("✅ Should update base reward (owner only)", async function () {
      const newReward = ethers.parseEther("200");
      await dailyClaim.setBaseReward(newReward);

      expect(await dailyClaim.baseReward()).to.equal(newReward);
    });

    it("✅ Should update streak bonus (owner only)", async function () {
      const newBonus = ethers.parseEther("20");
      await dailyClaim.setStreakBonus(newBonus);

      expect(await dailyClaim.streakBonus()).to.equal(newBonus);
    });
  });

  describe("⛽ Gas Optimization Tests", function () {
    it("📊 Match3 startGame gas usage", async function () {
      const tx = await match3Game.connect(player1).startGame(1);
      const receipt = await tx.wait();
      console.log(`      startGame gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(150000n);
    });

    it("📊 CardGame playGame gas usage", async function () {
      const tx = await cardGame.connect(player1).playGame(0);
      const receipt = await tx.wait();
      console.log(`      playGame gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(150000n);
    });

    it("📊 DailyClaim claimDaily gas usage", async function () {
      const tx = await dailyClaim.connect(player1).claimDaily();
      const receipt = await tx.wait();
      console.log(`      claimDaily gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(150000n);
    });

    it("📊 Treasury claimToken gas usage", async function () {
      await treasury.connect(owner).addAdmin(owner.address);
      const tokenAddress = await treasury.joybitToken();
      await treasury.creditReward(player1.address, tokenAddress, ethers.parseEther("100"));
      
      const tx = await treasury.connect(player1).claimToken(tokenAddress);
      const receipt = await tx.wait();
      console.log(`      claimToken gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(100000n);
    });

    it("📊 AchievementERC1155 mintAchievement gas usage", async function () {
      // Check achievement is added
      const achievement = await achievementERC1155.getAchievement(1);
      expect(achievement.active).to.be.true;
      expect(achievement.price).to.equal(ethers.parseEther("0.01"));

      const tx = await achievementERC1155.connect(player1).mintAchievement(1, { value: ethers.parseEther("0.01") });
      const receipt = await tx.wait();
      console.log(`      mintAchievement gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(120000n);
    });

    it("📊 AchievementERC1155 backendMint gas usage", async function () {
      await achievementERC1155.setMinter(owner.address, true);
      const tx = await achievementERC1155.backendMint(player1.address, 1);
      const receipt = await tx.wait();
      console.log(`      backendMint gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(80000n);
    });
  });
});
