// @ts-ignore

import { ethers } from "hardhat";
import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import {
  deployOtherNFTs,
  deployWETH,
  HUNDRETH_ETH,
  ONE_ETH,
  TENTH_ETH,
  THOUSANDTH_ETH,
  TWO_ETH,
} from "./utils";
import { BigNumber, Signer } from "ethers";
import { AuctionHouse, TestERC721, WETH } from "../typechain";

chai.use(asPromised);

const ONE_DAY = 24 * 60 * 60;

// helper function so we can parse numbers and do approximate number calculations, to avoid annoying gas calculations
const smallify = (bn: BigNumber) => bn.div(THOUSANDTH_ETH).toNumber();

describe("integration", () => {  
  let weth: WETH;
  let auction: AuctionHouse;
  let genericNFT: TestERC721;
  let deployer, owner, beneficiary, bidderA, bidderB, otherUser: Signer;
  let deployerAddress,
    ownerAddress,  
    beneficiaryAddress,      
    bidderAAddress,
    bidderBAddress,
    otherUserAddress: string;  

  async function deploy(): Promise<AuctionHouse> {
    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await AuctionHouse.deploy(weth.address, []);

    return auctionHouse as AuctionHouse;
  }

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", []);
    [
      deployer,      
      owner,
      beneficiary,      
      bidderA,
      bidderB,
      otherUser,
    ] = await ethers.getSigners();
    [
      deployerAddress,      
      ownerAddress, 
      beneficiaryAddress,     
      bidderAAddress,
      bidderBAddress,
      otherUserAddress,
    ] = await Promise.all(
      [deployer, owner, beneficiary, bidderA, bidderB, otherUser].map((s) =>
        s.getAddress()
      )
    );    

    const nfts = await deployOtherNFTs();    
    weth = await deployWETH();    
    auction = await deploy();
    // allow owner to sell on auction house
    await auction.whitelistAccount(ownerAddress);
    await auction.setPublicAuctionsEnabled(true);
    genericNFT = nfts.test;

    await genericNFT.mint(owner.address, 0);    
    await genericNFT
      .connect(owner)
      .transferFrom(ownerAddress, ownerAddress, 0);    
    await genericNFT.connect(owner).setApprovalForAll(auction.address, true);
  });

  describe("ETH Auction", async () => {
    async function run() {            
      await auction
        .connect(owner)
        .createAuction(
          0,
          genericNFT.address,
          ONE_DAY,
          TENTH_ETH,              
          ethers.constants.AddressZero
        );
      await auction.connect(bidderA).createBid(0, ONE_ETH, { value: ONE_ETH });
      await auction.connect(bidderB).createBid(0, TWO_ETH, { value: TWO_ETH });
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        Date.now() + ONE_DAY,
      ]);      
      await auction.connect(otherUser).endAuction(0);
    }

    it("should transfer the NFT to the winning bidder", async () => {
      await run();
      expect(await genericNFT.ownerOf(0)).to.eq(bidderBAddress);
    });

    it("should withdraw the winning bid amount from the winning bidder", async () => {
      const beforeBalance = await ethers.provider.getBalance(bidderBAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(bidderBAddress);

      expect(smallify(beforeBalance.sub(afterBalance))).to.be.approximately(
        smallify(TWO_ETH),
        smallify(TENTH_ETH)
      );
    });

    it("should refund the losing bidder", async () => {
      const beforeBalance = await ethers.provider.getBalance(bidderAAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(bidderAAddress);

      expect(smallify(beforeBalance)).to.be.approximately(
        smallify(afterBalance),
        smallify(TENTH_ETH)
      );
    });

    it("should pay the auction creator", async () => {
      const beforeBalance = await ethers.provider.getBalance(ownerAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(ownerAddress);

      expect(smallify(afterBalance)).to.be.approximately(        
        smallify(beforeBalance.add(TWO_ETH)),
        smallify(TENTH_ETH)
      );
    });
  });

  describe("ETH Auction with royalties", async () => {
    async function run() {            
      await auction
        .connect(owner)
        .createAuction(
          0,
          genericNFT.address,
          ONE_DAY,
          TENTH_ETH,              
          ethers.constants.AddressZero
        );

      await auction.setRoyalty(genericNFT.address, beneficiaryAddress, 15);
      await auction.connect(bidderA).createBid(0, ONE_ETH, { value: ONE_ETH });
      await auction.connect(bidderB).createBid(0, TWO_ETH, { value: TWO_ETH });
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        Date.now() + ONE_DAY,
      ]);      
      await auction.connect(otherUser).endAuction(0);
    }

    it("should transfer the NFT to the winning bidder", async () => {
      await run();
      expect(await genericNFT.ownerOf(0)).to.eq(bidderBAddress);
    });

    it("should withdraw the winning bid amount from the winning bidder", async () => {
      const beforeBalance = await ethers.provider.getBalance(bidderBAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(bidderBAddress);

      expect(smallify(beforeBalance.sub(afterBalance))).to.be.approximately(
        smallify(TWO_ETH),
        smallify(TENTH_ETH)
      );
    });

    it("should refund the losing bidder", async () => {
      const beforeBalance = await ethers.provider.getBalance(bidderAAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(bidderAAddress);

      expect(smallify(beforeBalance)).to.be.approximately(
        smallify(afterBalance),
        smallify(TENTH_ETH)
      );
    });

    it("should pay the seller in ETH", async () => {
      const beforeBalance = await ethers.provider.getBalance(ownerAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(ownerAddress);      
      // 15% royalty -> 2ETH * 95% = 1.7 ETH
      expect(smallify(afterBalance)).to.be.approximately(
        smallify(beforeBalance.add(TENTH_ETH.mul(17))),
        smallify(TENTH_ETH)
      );      
    });

    it("should pay the beneficiary in ETH", async () => {
      const beforeBalance = await ethers.provider.getBalance(beneficiaryAddress);
      await run();
      const afterBalance = await ethers.provider.getBalance(beneficiaryAddress);

      // 15% royalty -> 2 ETH * 15% = 0.3 WETH
      expect(afterBalance).to.eq(beforeBalance.add(THOUSANDTH_ETH.mul(300)));
    });
  });

  describe("WETH Auction", async () => {
    async function run() {            
      await auction
        .connect(owner)
        .createAuction(
          0,
          genericNFT.address,
          ONE_DAY,
          TENTH_ETH,              
          weth.address
        );
        await weth.connect(bidderA).deposit({ value: ONE_ETH });
        await weth.connect(bidderA).approve(auction.address, ONE_ETH);
        await weth.connect(bidderB).deposit({ value: TWO_ETH });
        await weth.connect(bidderB).approve(auction.address, TWO_ETH);
        await auction.connect(bidderA).createBid(0, ONE_ETH, { value: ONE_ETH });
        await auction.connect(bidderB).createBid(0, TWO_ETH, { value: TWO_ETH });
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          Date.now() + ONE_DAY,
        ]);
      await auction.connect(otherUser).endAuction(0);
    }

    it("should transfer the NFT to the winning bidder", async () => {
      await run();
      expect(await genericNFT.ownerOf(0)).to.eq(bidderBAddress);
    });

    it("should withdraw the winning bid amount from the winning bidder", async () => {
      await run();
      const afterBalance = await weth.balanceOf(bidderBAddress);

      expect(afterBalance).to.eq(ONE_ETH.mul(0));
    });

    it("should refund the losing bidder", async () => {
      await run();
      const afterBalance = await weth.balanceOf(bidderAAddress);

      expect(afterBalance).to.eq(ONE_ETH);
    });
    

    it("should pay the seller", async () => {
      const beforeBalance = await weth.balanceOf(ownerAddress);
      await run();
      const afterBalance = await weth.balanceOf(ownerAddress);

      expect(smallify(afterBalance)).to.be.approximately(        
        smallify(beforeBalance.add(TWO_ETH)),
        smallify(TENTH_ETH)
      );
    });
  });

  describe("WETH Auction with royalties", async () => {
    async function run() {            
      await auction
        .connect(owner)
        .createAuction(
          0,
          genericNFT.address,
          ONE_DAY,
          TENTH_ETH,              
          weth.address
        );
        await auction.setRoyalty(genericNFT.address, beneficiaryAddress, 15);
        await weth.connect(bidderA).deposit({ value: ONE_ETH });
        await weth.connect(bidderA).approve(auction.address, ONE_ETH);
        await weth.connect(bidderB).deposit({ value: TWO_ETH });
        await weth.connect(bidderB).approve(auction.address, TWO_ETH);
        await auction.connect(bidderA).createBid(0, ONE_ETH, { value: ONE_ETH });
        await auction.connect(bidderB).createBid(0, TWO_ETH, { value: TWO_ETH });
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          Date.now() + ONE_DAY,
        ]);
      await auction.connect(otherUser).endAuction(0);
    }

    it("should transfer the NFT to the winning bidder", async () => {
      await run();
      expect(await genericNFT.ownerOf(0)).to.eq(bidderBAddress);
    });

    it("should withdraw the winning bid amount from the winning bidder", async () => {
      await run();
      const afterBalance = await weth.balanceOf(bidderBAddress);

      expect(afterBalance).to.eq(ONE_ETH.mul(0));
    });

    it("should refund the losing bidder", async () => {
      await run();
      const afterBalance = await weth.balanceOf(bidderAAddress);

      expect(afterBalance).to.eq(ONE_ETH);
    });
    

    it("should pay the seller in WETH", async () => {
      const beforeBalance = await weth.balanceOf(ownerAddress);
      await run();
      const afterBalance = await weth.balanceOf(ownerAddress);      
      // 15% royalty fee -> 2ETH * 95% = 1.7 ETH
      expect(smallify(afterBalance)).to.be.approximately(
        smallify(beforeBalance.add(TENTH_ETH.mul(17))),
        smallify(TENTH_ETH)
      );      
    });

    it("should pay the beneficiary in WETH", async () => {
      const beforeBalance = await weth.balanceOf(beneficiaryAddress);
      await run();
      const afterBalance = await weth.balanceOf(beneficiaryAddress);

      // 15% royalty fee -> 2 ETH * 15% = 0.3 WETH
      expect(afterBalance).to.eq(beforeBalance.add(THOUSANDTH_ETH.mul(300)));
    });

  });
});
