import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
// @ts-ignore
import { ethers } from "hardhat";
import { AuctionHouse, BadBidder, TestERC721, BadERC721, WETH } from "../typechain";
import { formatUnits } from "ethers/lib/utils";
import { BigNumber, Contract, Signer } from "ethers";
import {
  deployBidder,
  deployOtherNFTs,
  deployWETH,  
  ONE_ETH,
  revert,
  TWO_ETH,
} from "./utils";
import { test } from "mocha";

chai.use(asPromised);
const AUCTIONEER_ROLE = "0x1d693f62a755e2b3c6494da41af454605b9006057cb3c79b6adda1378f2a50a7";
const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const wethAddr = "0x0000000000000000000000000000000000000000";

describe("AuctionHouse", () => {  
  let weth: Contract;
  let badERC721: BadERC721;
  let testERC721: TestERC721;  

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", []);    
    const nfts = await deployOtherNFTs();    
    weth = await deployWETH();
    badERC721 = nfts.bad;
    testERC721 = nfts.test;
  });

  ////////////////////////////////////////

  async function deploy(): Promise<AuctionHouse> {
    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await AuctionHouse.deploy(weth.address, []);

    return auctionHouse as AuctionHouse;
  }

  async function createAuction(auctionHouse: AuctionHouse, currency = wethAddr) {
    const tokenId = 0;
    const duration = 60 * 60 * 24;
    const reservePrice = BigNumber.from(10).pow(18).div(2);

    await auctionHouse.createAuction(
      tokenId,
      testERC721.address,
      duration,
      reservePrice,
      currency
    );
  }

  async function mintFor(owner: Signer, tokenId = 0) {
    await testERC721.mint(await owner.getAddress(), tokenId);
  }

  //////////////////////////////////////////////////
  describe("#constructor", () => {
    it("should be able to deploy", async () => {
      const [chainsaw] = await ethers.getSigners();            
      const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
      const auctionHouse = await AuctionHouse.deploy(weth.address, []);      
      expect(formatUnits(await auctionHouse.timeBuffer(), 0)).to.eq(
        "900.0",
        "time buffer should equal 900"
      );
      expect(await auctionHouse.minBidIncrementPercentage()).to.eq(
        5,
        "minBidIncrementPercentage should equal 5%"
      );
      expect(await auctionHouse.hasRole(ADMIN_ROLE, await chainsaw.getAddress())).to.eq(
        true,
        "admin role should be assigned to chainsaw"
      );
    });    
  });

  describe("#constructor", () => {
    it("should be able to deploy with auctioneers", async () => {
      const [chainsaw, auctioneer1, auctioneer2] = await ethers.getSigners();            
      const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
      const auctionHouse = await AuctionHouse.deploy(
        weth.address, 
        [await auctioneer1.getAddress(), await auctioneer2.getAddress()]
      );
      
      expect(formatUnits(await auctionHouse.timeBuffer(), 0)).to.eq(
        "900.0",
        "time buffer should equal 900"
      );
      expect(await auctionHouse.minBidIncrementPercentage()).to.eq(
        5,
        "minBidIncrementPercentage should equal 5%"
      );
      expect(await auctionHouse.hasRole(ADMIN_ROLE, await chainsaw.getAddress())).to.eq(
        true,
        "admin role should be assigned to chainsaw"
      );
      expect(await auctionHouse.hasRole(AUCTIONEER_ROLE, await auctioneer1.getAddress())).to.eq(
        true,
        "auctioneer role should be assigned to auctioneer1"
      );
      expect(await auctionHouse.hasRole(AUCTIONEER_ROLE, await auctioneer2.getAddress())).to.eq(
        true,
        "auctioneer role should be assigned to auctioneer2"
      );
      
    });    
  });

  describe("#createAuction", () => {
    let auctionHouse: AuctionHouse;
    beforeEach(async () => {      
      auctionHouse = await deploy();         
    });

    it("should revert if the token ID does not exist", async () => {
      const tokenId = 999;
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);            

      await expect(
        auctionHouse.createAuction(
          tokenId,
          testERC721.address,
          duration,
          reservePrice,            
          wethAddr
        )
      ).eventually.rejectedWith(
        revert`ERC721: owner query for nonexistent token`
      );
    });

    it("should revert if the caller is not token owner", async () => {      
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);               
      const [chainsaw, tokenOwner] = await ethers.getSigners();   
      await mintFor(tokenOwner);

      await expect(
        auctionHouse
          .connect(chainsaw)
          .createAuction(
            0,
            testERC721.address,
            duration,
            reservePrice,                        
            wethAddr
          )
      ).eventually.rejectedWith(
        revert`Must be owner of token to create an auction for it`
      );
    });

    it("should revert if token contract / owner is not whitelisted", async () => {      
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);               
      const [_, tokenOwner] = await ethers.getSigners();   
      await mintFor(tokenOwner);

      await expect(
        auctionHouse
          .connect(tokenOwner)
          .createAuction(
            0,
            testERC721.address,
            duration,
            reservePrice,                        
            wethAddr
          )
      ).eventually.rejectedWith(
        revert`Call must be made by authorized seller, token contract or auctioneer`
      );
    });

    it("should revert if the token contract does not support the ERC721 interface", async () => {
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);                
      
      await expect(
        auctionHouse          
          .createAuction(
            0,
            badERC721.address,
            duration,
            reservePrice,          
            wethAddr
          )
        ).eventually.rejectedWith(
          revert`tokenContract does not support ERC721 interface`
        );
      });

    it("should allow admin role to create auction for owned token", async () => {
      const [chainsaw] = await ethers.getSigners();
      await mintFor(chainsaw);
      await testERC721.setApprovalForAll(auctionHouse.address, true);
      await createAuction(auctionHouse.connect(chainsaw));
    
      const createdAuction = await auctionHouse.auctions(0);

      expect(createdAuction.duration).to.eq(24 * 60 * 60);
      expect(createdAuction.reservePrice).to.eq(
        BigNumber.from(10).pow(18).div(2)
      );      
      expect(createdAuction.tokenOwner).to.eq(await chainsaw.getAddress());            
    });

    it("should allow auctioneer role to create auction for owned token", async () => {
      const [chainsaw, auctioneer] = await ethers.getSigners();
      await mintFor(auctioneer);
      await auctionHouse.addAuctioneer(await auctioneer.getAddress());
      await testERC721
        .connect(auctioneer)
        .setApprovalForAll(auctionHouse.address, true);      
      await createAuction(auctionHouse.connect(auctioneer));
    
      const createdAuction = await auctionHouse.auctions(0);

      expect(createdAuction.duration).to.eq(24 * 60 * 60);
      expect(createdAuction.reservePrice).to.eq(
        BigNumber.from(10).pow(18).div(2)
      );      
      expect(createdAuction.tokenOwner).to.eq(await auctioneer.getAddress());            
    });

    it("should revert for non-whitelisted owned token", async () => {
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);     
      const [chainsaw, tokenOwner] = await ethers.getSigners();
      await auctionHouse.setPublicAuctionsEnabled(true);
      await mintFor(tokenOwner);
      
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true); 
      
      await expect(
        auctionHouse          
          .connect(tokenOwner)
          .createAuction(
            0,
            testERC721.address,
            duration,
            reservePrice,          
            wethAddr
          )
        ).eventually.rejectedWith(
          revert`Call must be made by authorized seller, token contract or auctioneer`
        );
    });

    it("should revert for whitelisted seller when public auctions disabled", async () => {
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);     
      const [_, tokenOwner] = await ethers.getSigners();
      await auctionHouse.whitelistAccount(await tokenOwner.getAddress());      
      await mintFor(tokenOwner);
      
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true); 
      
      await expect(
        auctionHouse          
          .connect(tokenOwner)
          .createAuction(
            0,
            testERC721.address,
            duration,
            reservePrice,          
            wethAddr
          )
        ).eventually.rejectedWith(
          revert`Call must be made by authorized seller, token contract or auctioneer`
        );
    });

    it("should revert for whitelisted token when public auctions disabled", async () => {
      const duration = 60 * 60 * 24;
      const reservePrice = BigNumber.from(10).pow(18).div(2);     
      const [_, tokenOwner] = await ethers.getSigners();
      await auctionHouse.whitelistAccount(testERC721.address);      
      await mintFor(tokenOwner);
      
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true); 
      
      await expect(
        auctionHouse          
          .connect(tokenOwner)
          .createAuction(
            0,
            testERC721.address,
            duration,
            reservePrice,          
            wethAddr
          )
        ).eventually.rejectedWith(
          revert`Call must be made by authorized seller, token contract or auctioneer`
        );
    });

    it("should allow whitelisted seller to auction token", async () => {
      const [_, tokenOwner] = await ethers.getSigners();
      await mintFor(tokenOwner);
      await auctionHouse.whitelistAccount(await tokenOwner.getAddress());
      await auctionHouse.setPublicAuctionsEnabled(true);
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true);      
      await createAuction(auctionHouse.connect(tokenOwner));
    
      const createdAuction = await auctionHouse.auctions(0);

      expect(createdAuction.duration).to.eq(24 * 60 * 60);
      expect(createdAuction.reservePrice).to.eq(
        BigNumber.from(10).pow(18).div(2)
      );      
      expect(createdAuction.tokenOwner).to.eq(await tokenOwner.getAddress());            
    });

    it("should allow seller to auction whitelisted token", async () => {
      const [_, tokenOwner] = await ethers.getSigners();
      await mintFor(tokenOwner);
      await auctionHouse.whitelistAccount(testERC721.address);
      await auctionHouse.setPublicAuctionsEnabled(true);
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true);      
      await createAuction(auctionHouse.connect(tokenOwner));
    
      const createdAuction = await auctionHouse.auctions(0);

      expect(createdAuction.duration).to.eq(24 * 60 * 60);
      expect(createdAuction.reservePrice).to.eq(
        BigNumber.from(10).pow(18).div(2)
      );      
      expect(createdAuction.tokenOwner).to.eq(await tokenOwner.getAddress());            
    });

    it("should emit an AuctionCreated event", async () => {
      const [admin] = await ethers.getSigners();

      await testERC721.mint(await admin.getAddress(), 0);
      await testERC721.setApprovalForAll(auctionHouse.address, true);
      const owner = await testERC721.ownerOf(0);

      const block = await ethers.provider.getBlockNumber();
      await createAuction(auctionHouse.connect(admin));
      const currAuction = await auctionHouse.auctions(0);
      const events = await auctionHouse.queryFilter(
        auctionHouse.filters.AuctionCreated(
          null,
          null,
          null,
          null,
          null,
          null,
          null,          
        ),
        block
      );
      expect(events.length).eq(1);
      const logDescription = auctionHouse.interface.parseLog(events[0]);
      expect(logDescription.name).to.eq("AuctionCreated");
      expect(logDescription.args.duration).to.eq(currAuction.duration);
      expect(logDescription.args.reservePrice).to.eq(currAuction.reservePrice);
      expect(logDescription.args.tokenOwner).to.eq(currAuction.tokenOwner);      
      expect(logDescription.args.auctionCurrency).to.eq(
        ethers.constants.AddressZero
      );
    });
  });

  // TODO - tests for setRoyalty

  describe("#setAuctionReservePrice", () => {
    let auctionHouse: AuctionHouse;
    let chainsaw: Signer; 
    let auctioneer: Signer;   

    beforeEach(async () => {
      [chainsaw, auctioneer] = await ethers.getSigners();
      auctionHouse = (await deploy()) as AuctionHouse;            
      await mintFor(chainsaw);
      await testERC721
        .connect(chainsaw)
        .setApprovalForAll(auctionHouse.address, true);
      await createAuction(auctionHouse);            
    });

    it("should revert if the auctionHouse does not exist", async () => {
      await expect(
        auctionHouse.setAuctionReservePrice(1, TWO_ETH)
      ).eventually.rejectedWith(revert`Auction doesn't exist`);
    });
    
    it("should revert if the auction has already started", async () => {
      await auctionHouse.setAuctionReservePrice(0, TWO_ETH);      
      await auctionHouse        
        .createBid(0, TWO_ETH, { value: TWO_ETH });
      await expect(
        auctionHouse.setAuctionReservePrice(0, ONE_ETH)
      ).eventually.rejectedWith(revert`Auction has already started`);
    });

    it("should set the auction reserve price when called by admin", async () => {      
      await auctionHouse.setAuctionReservePrice(0, TWO_ETH);

      expect((await auctionHouse.auctions(0)).reservePrice).to.eq(TWO_ETH);
    });

    it("should set the auction reserve price when called by auctioneer", async () => {
      await auctionHouse.addAuctioneer(await auctioneer.getAddress());
      await auctionHouse.connect(auctioneer).setAuctionReservePrice(0, TWO_ETH);

      expect((await auctionHouse.auctions(0)).reservePrice).to.eq(TWO_ETH);
    });

    it("should emit an AuctionReservePriceUpdated event", async () => {
      const block = await ethers.provider.getBlockNumber();
      await auctionHouse.setAuctionReservePrice(0, TWO_ETH);
      const events = await auctionHouse.queryFilter(
        auctionHouse.filters.AuctionReservePriceUpdated(null, null, null, null),
        block
      );
      expect(events.length).eq(1);
      const logDescription = auctionHouse.interface.parseLog(events[0]);

      expect(logDescription.args.reservePrice).to.eq(TWO_ETH);
    });
  });
  
  describe("#createBid", () => {
    let auctionHouse: AuctionHouse;
    let chainsaw: Signer;    
    let bidderA: Signer;
    let bidderB: Signer;

    beforeEach(async () => {
      [chainsaw, bidderA, bidderB] = await ethers.getSigners();
      auctionHouse = (await (await deploy())) as AuctionHouse;
      await mintFor(chainsaw)
      await testERC721.setApprovalForAll(auctionHouse.address, true);
      await createAuction(auctionHouse);      
    });

    it("should revert if the specified auction does not exist", async () => {
      await expect(
        auctionHouse.connect(bidderA).createBid(11111, ONE_ETH)
      ).eventually.rejectedWith(revert`Auction doesn't exist`);
    });

    it("should revert if the bid is less than the reserve price", async () => {
      await expect(
        auctionHouse.connect(bidderA).createBid(0, 0, { value: 0 })
      ).eventually.rejectedWith(revert`Must send at least reservePrice`);
    });
    
    it("should revert if msg.value does not equal specified amount", async () => {
      await expect(
        auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH.mul(2),
        })
      ).eventually.rejectedWith(
        revert`Sent ETH Value does not match specified bid amount`
      );
    });

    
    describe("first bid", () => {
      it("should set the first bid time", async () => {
        // TODO: Fix this test on Sun Oct 04 2274
        await ethers.provider.send("evm_setNextBlockTimestamp", [9617249934]);
        await auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH,
        });
        expect((await auctionHouse.auctions(0)).firstBidTime).to.eq(9617249934);
      });

      it("should store the transferred ETH as WETH", async () => {
        await auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH,
        });
        expect(await weth.balanceOf(auctionHouse.address)).to.eq(ONE_ETH);
      });

      it("should not update the auction's duration", async () => {
        const beforeDuration = (await auctionHouse.auctions(0)).duration;
        await auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH,
        });
        const afterDuration = (await auctionHouse.auctions(0)).duration;

        expect(beforeDuration).to.eq(afterDuration);
      });

      it("should store the bidder's information", async () => {
        await auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH,
        });
        const currAuction = await auctionHouse.auctions(0);

        expect(currAuction.bidder).to.eq(await bidderA.getAddress());
        expect(currAuction.amount).to.eq(ONE_ETH);
      });

      it("should emit an AuctionBid event", async () => {
        const block = await ethers.provider.getBlockNumber();
        await auctionHouse.connect(bidderA).createBid(0, ONE_ETH, {
          value: ONE_ETH,
        });
        const events = await auctionHouse.queryFilter(
          auctionHouse.filters.AuctionBid(
            null,
            null,
            null,
            null,
            null,
            null,
            null
          ),
          block
        );
        expect(events.length).eq(1);
        const logDescription = auctionHouse.interface.parseLog(events[0]);

        expect(logDescription.name).to.eq("AuctionBid");
        expect(logDescription.args.auctionId).to.eq(0);
        expect(logDescription.args.sender).to.eq(await bidderA.getAddress());
        expect(logDescription.args.value).to.eq(ONE_ETH);
        expect(logDescription.args.firstBid).to.eq(true);
        expect(logDescription.args.extended).to.eq(false);
      });
    });
  
    
    describe("second bid", () => {
      beforeEach(async () => {
        auctionHouse = auctionHouse.connect(bidderB) as AuctionHouse;
        await auctionHouse
          .connect(bidderA)
          .createBid(0, ONE_ETH, { value: ONE_ETH });
      });

      it("should revert if the bid is smaller than the last bid + minBid", async () => {
        await expect(
          auctionHouse.connect(bidderB).createBid(0, ONE_ETH.add(1), {
            value: ONE_ETH.add(1),
          })
        ).eventually.rejectedWith(
          revert`Must send more than last bid by minBidIncrementPercentage amount`
        );
      });

      it("should refund the previous bid", async () => {
        const beforeBalance = await ethers.provider.getBalance(
          await bidderA.getAddress()
        );
        const beforeBidAmount = (await auctionHouse.auctions(0)).amount;
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });
        const afterBalance = await ethers.provider.getBalance(
          await bidderA.getAddress()
        );

        expect(afterBalance).to.eq(beforeBalance.add(beforeBidAmount));
      });

      it("should not update the firstBidTime", async () => {
        const firstBidTime = (await auctionHouse.auctions(0)).firstBidTime;
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });
        expect((await auctionHouse.auctions(0)).firstBidTime).to.eq(
          firstBidTime
        );
      });

      it("should transfer the bid to the contract and store it as WETH", async () => {
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });

        expect(await weth.balanceOf(auctionHouse.address)).to.eq(TWO_ETH);
      });

      it("should update the stored bid information", async () => {
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });

        const currAuction = await auctionHouse.auctions(0);

        expect(currAuction.amount).to.eq(TWO_ETH);
        expect(currAuction.bidder).to.eq(await bidderB.getAddress());
      });

      it("should not extend the duration of the bid if outside of the time buffer", async () => {
        const beforeDuration = (await auctionHouse.auctions(0)).duration;
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });
        const afterDuration = (await auctionHouse.auctions(0)).duration;
        expect(beforeDuration).to.eq(afterDuration);
      });

      it("should emit an AuctionBid event", async () => {
        const block = await ethers.provider.getBlockNumber();
        await auctionHouse.connect(bidderB).createBid(0, TWO_ETH, {
          value: TWO_ETH,
        });
        const events = await auctionHouse.queryFilter(
          auctionHouse.filters.AuctionBid(
            null,
            null,
            null,
            null,
            null,
            null,
            null
          ),
          block
        );
        expect(events.length).eq(2);
        const logDescription = auctionHouse.interface.parseLog(events[1]);

        expect(logDescription.name).to.eq("AuctionBid");
        expect(logDescription.args.sender).to.eq(await bidderB.getAddress());
        expect(logDescription.args.value).to.eq(TWO_ETH);
        expect(logDescription.args.firstBid).to.eq(false);
        expect(logDescription.args.extended).to.eq(false);
      });

      describe("last minute bid", () => {
        beforeEach(async () => {
          const currAuction = await auctionHouse.auctions(0);
          await ethers.provider.send("evm_setNextBlockTimestamp", [
            currAuction.firstBidTime
              .add(currAuction.duration)
              .sub(1)
              .toNumber(),
          ]);
        });
        it("should extend the duration of the bid if inside of the time buffer", async () => {
          const beforeDuration = (await auctionHouse.auctions(0)).duration;
          await auctionHouse.createBid(0, TWO_ETH, {
            value: TWO_ETH,
          });

          const currAuction = await auctionHouse.auctions(0);
          expect(currAuction.duration).to.eq(
            beforeDuration.add(await auctionHouse.timeBuffer()).sub(1)
          );
        });
        it("should emit an AuctionBid event", async () => {
          const block = await ethers.provider.getBlockNumber();
          await auctionHouse.createBid(0, TWO_ETH, {
            value: TWO_ETH,
          });
          const events = await auctionHouse.queryFilter(
            auctionHouse.filters.AuctionBid(
              null,
              null,
              null,
              null,
              null,
              null,
              null
            ),
            block
          );
          expect(events.length).eq(2);
          const logDescription = auctionHouse.interface.parseLog(events[1]);

          expect(logDescription.name).to.eq("AuctionBid");
          expect(logDescription.args.sender).to.eq(await bidderB.getAddress());
          expect(logDescription.args.value).to.eq(TWO_ETH);
          expect(logDescription.args.firstBid).to.eq(false);
          expect(logDescription.args.extended).to.eq(true);
        });
      });
      describe("late bid", () => {
        beforeEach(async () => {
          const currAuction = await auctionHouse.auctions(0);
          await ethers.provider.send("evm_setNextBlockTimestamp", [
            currAuction.firstBidTime
              .add(currAuction.duration)
              .add(1)
              .toNumber(),
          ]);
        });

        it("should revert if the bid is placed after expiry", async () => {
          await expect(
            auctionHouse.createBid(0, TWO_ETH, {
              value: TWO_ETH,
            })
          ).eventually.rejectedWith(revert`Auction expired`);
        });
      });
    });
  });

  describe("#cancelAuction", () => {
    let auctionHouse: AuctionHouse;
    let chainsaw: Signer;
    let auctioneer: Signer;    
    let bidder: Signer;

    beforeEach(async () => {
      [chainsaw, auctioneer, bidder] = await ethers.getSigners();
      auctionHouse = (await (await deploy())) as AuctionHouse;
      await mintFor(chainsaw);
      await testERC721.setApprovalForAll(auctionHouse.address, true);
      await auctionHouse.grantRole(
        await auctionHouse.AUCTIONEER(), 
        await auctioneer.getAddress()
      );
      await createAuction(auctionHouse);
    });

    it("should revert if the auction does not exist", async () => {
      await expect(auctionHouse.cancelAuction(12213)).eventually.rejectedWith(
        revert`Auction doesn't exist`
      );
    });

    it("should revert if not called by admin or auctioneer", async () => {
      await expect(
        auctionHouse.connect(bidder).cancelAuction(0)
      ).eventually.rejectedWith(
        revert`Call must be made by authorized auctioneer`
      );
    });

    it("should revert if the auction has already begun", async () => {
      await auctionHouse        
        .createBid(0, ONE_ETH, { value: ONE_ETH });
      await expect(auctionHouse.cancelAuction(0)).eventually.rejectedWith(
        revert`Can't cancel an auction once it's begun`
      );
    });

    it("should be callable by the admin", async () => {
      await auctionHouse.cancelAuction(0);

      const auctionResult = await auctionHouse.auctions(0);

      expect(auctionResult.amount.toNumber()).to.eq(0);
      expect(auctionResult.duration.toNumber()).to.eq(0);
      expect(auctionResult.firstBidTime.toNumber()).to.eq(0);
      expect(auctionResult.reservePrice.toNumber()).to.eq(0);      
      expect(auctionResult.tokenOwner).to.eq(ethers.constants.AddressZero);
      expect(auctionResult.bidder).to.eq(ethers.constants.AddressZero);      
      expect(auctionResult.auctionCurrency).to.eq(ethers.constants.AddressZero);

      expect(await testERC721.ownerOf(0)).to.eq(await chainsaw.getAddress());
    });

    it("should be callable by the auctioneer", async () => {
      await auctionHouse.connect(auctioneer).cancelAuction(0);

      const auctionResult = await auctionHouse.auctions(0);

      expect(auctionResult.amount.toNumber()).to.eq(0);
      expect(auctionResult.duration.toNumber()).to.eq(0);
      expect(auctionResult.firstBidTime.toNumber()).to.eq(0);
      expect(auctionResult.reservePrice.toNumber()).to.eq(0);
      expect(auctionResult.tokenOwner).to.eq(ethers.constants.AddressZero);
      expect(auctionResult.bidder).to.eq(ethers.constants.AddressZero);      
      expect(auctionResult.auctionCurrency).to.eq(ethers.constants.AddressZero);
      expect(await testERC721.ownerOf(0)).to.eq(await chainsaw.getAddress());
    });

    it("should emit an AuctionCanceled event", async () => {
      const block = await ethers.provider.getBlockNumber();
      await auctionHouse.cancelAuction(0);
      const events = await auctionHouse.queryFilter(
        auctionHouse.filters.AuctionCanceled(null, null, null, null),
        block
      );
      expect(events.length).eq(1);
      const logDescription = auctionHouse.interface.parseLog(events[0]);

      expect(logDescription.args.tokenId.toNumber()).to.eq(0);
      expect(logDescription.args.tokenOwner).to.eq(await chainsaw.getAddress());
      expect(logDescription.args.tokenContract).to.eq(testERC721.address);
    });
  });
  

  describe("#endAuction", () => {
    let auctionHouse: AuctionHouse;
    let chainsaw: Signer;
    let tokenOwner: Signer;    
    let bidder: Signer;    
    let badBidder: BadBidder;

    beforeEach(async () => {
      [chainsaw, tokenOwner, bidder] = await ethers.getSigners();

      auctionHouse = (await (await deploy())) as AuctionHouse;
      await mintFor(tokenOwner);
      await testERC721
        .connect(tokenOwner)
        .setApprovalForAll(auctionHouse.address, true);
      await auctionHouse.whitelistAccount(await tokenOwner.getAddress());
      await auctionHouse.setPublicAuctionsEnabled(true);
      await createAuction(auctionHouse.connect(tokenOwner));
      badBidder = await deployBidder(auctionHouse.address, testERC721.address);
    });

    it("should revert if the auction does not exist", async () => {
      await expect(auctionHouse.endAuction(1110)).eventually.rejectedWith(
        revert`Auction doesn't exist`
      );
    });

    it("should revert if the auction has not begun", async () => {
      await expect(auctionHouse.endAuction(0)).eventually.rejectedWith(
        revert`Auction hasn't begun`
      );
    });

    it("should revert if the auction has not completed", async () => {
      await auctionHouse.connect(bidder).createBid(0, ONE_ETH, {
        value: ONE_ETH,
      });

      await expect(auctionHouse.endAuction(0)).eventually.rejectedWith(
        revert`Auction hasn't completed`
      );
    });

    it("should cancel the auction if the winning bidder is unable to receive NFTs", async () => {
      await badBidder.placeBid(0, TWO_ETH, { value: TWO_ETH });
      const endTime =
        (await auctionHouse.auctions(0)).duration.toNumber() +
        (await auctionHouse.auctions(0)).firstBidTime.toNumber();
      await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);

      await auctionHouse.endAuction(0);

      expect(await testERC721.ownerOf(0)).to.eq(await tokenOwner.getAddress());
      expect(await ethers.provider.getBalance(badBidder.address)).to.eq(
        TWO_ETH
      );
    });

    describe("ETH auction", () => {
      beforeEach(async () => {
        await auctionHouse
          .connect(bidder)
          .createBid(0, ONE_ETH, { value: ONE_ETH });
        const endTime =
          (await auctionHouse.auctions(0)).duration.toNumber() +
          (await auctionHouse.auctions(0)).firstBidTime.toNumber();
        await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
      });

      it("should transfer the NFT to the winning bidder", async () => {
        await auctionHouse.endAuction(0);

        expect(await testERC721.ownerOf(0)).to.eq(await bidder.getAddress());
      });

      it("should pay the token owner the remainder of the winning bid", async () => {
        const beforeBalance = await ethers.provider.getBalance(
          await tokenOwner.getAddress()
        );        
        await auctionHouse.endAuction(0);
        const expectedProfit = "1000000000000000000";
        const tokenOwnerBalance = await ethers.provider.getBalance(
          await tokenOwner.getAddress()
        );        
        const wethBalance = await weth.balanceOf(await tokenOwner.getAddress());
        
        
        await expect(
          tokenOwnerBalance.sub(beforeBalance).add(wethBalance).toString()
        ).to.eq(expectedProfit);
      });

      
      it("should emit an AuctionEnded event", async () => {
        const block = await ethers.provider.getBlockNumber();
        const auctionData = await auctionHouse.auctions(0);
        await auctionHouse.endAuction(0);
        const events = await auctionHouse.queryFilter(
          auctionHouse.filters.AuctionEnded(
            null,
            null,
            null,
            null,
            null,
            null,
            null,                        
          ),
          block
        );
        expect(events.length).eq(1);
        const logDescription = auctionHouse.interface.parseLog(events[0]);

        expect(logDescription.args.tokenId).to.eq(0);
        expect(logDescription.args.tokenOwner).to.eq(auctionData.tokenOwner);        
        expect(logDescription.args.winner).to.eq(auctionData.bidder);
        expect(logDescription.args.amount.toString()).to.eq(
          "1000000000000000000"
        );        
        expect(logDescription.args.auctionCurrency).to.eq(weth.address);
      });

      it("should delete the auction", async () => {
        await auctionHouse.endAuction(0);

        const auctionResult = await auctionHouse.auctions(0);

        expect(auctionResult.amount.toNumber()).to.eq(0);
        expect(auctionResult.duration.toNumber()).to.eq(0);
        expect(auctionResult.firstBidTime.toNumber()).to.eq(0);
        expect(auctionResult.reservePrice.toNumber()).to.eq(0);        
        expect(auctionResult.tokenOwner).to.eq(ethers.constants.AddressZero);
        expect(auctionResult.bidder).to.eq(ethers.constants.AddressZero);        
        expect(auctionResult.auctionCurrency).to.eq(
          ethers.constants.AddressZero
        );
      });
    
    });
  });
});