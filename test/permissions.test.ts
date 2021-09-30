// @ts-ignore

import { ethers } from "hardhat";
import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import {
  deployOtherNFTs,
  deployWETH,  
  ONE_ETH,
  TENTH_ETH,
  THOUSANDTH_ETH,
  TWO_ETH,
  revert
} from "./utils";
import { BigNumber, Signer } from "ethers";
import { AuctionHouse, TestERC721, WETH } from "../typechain";

chai.use(asPromised);

const ONE_DAY = 24 * 60 * 60;

// helper function so we can parse numbers and do approximate number calculations, to avoid annoying gas calculations
const smallify = (bn: BigNumber) => bn.div(THOUSANDTH_ETH).toNumber();

describe("permissions", () => {  
  let weth: WETH;
  let auction: AuctionHouse;
  let genericNFT: TestERC721;
  let chainsaw, owner, auctioneer, otherUser: Signer;
  let chainsawAddress,
    ownerAddress,  
    auctioneerAddress,          
    otherUserAddress: string;  

  async function deploy(): Promise<AuctionHouse> {
    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await AuctionHouse.deploy(weth.address, []);

    return auctionHouse as AuctionHouse;
  }

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", []);
    [
      chainsaw,      
      owner,
      auctioneer,            
      otherUser,
    ] = await ethers.getSigners();
    [
      chainsawAddress,      
      ownerAddress, 
      auctioneerAddress,           
      otherUserAddress,
    ] = await Promise.all(
      [chainsaw, owner, auctioneer, otherUser].map((s) =>
        s.getAddress()
      )
    );    

    const nfts = await deployOtherNFTs();    
    weth = await deployWETH();    
    auction = await deploy();
    // allow owner to sell on auction house
    
    genericNFT = nfts.test;

    await genericNFT.mint(owner.address, 0);    
    await genericNFT
      .connect(owner)
      .transferFrom(ownerAddress, ownerAddress, 0);    
    await genericNFT.connect(owner).setApprovalForAll(auction.address, true);
  });

  describe("permissions", async () => {
    async function startAuction() {    
      await auction.whitelistAccount(ownerAddress);
      await auction.setPublicAuctionsEnabled(true);        
      await auction
        .connect(owner)
        .createAuction(
          0,
          genericNFT.address,
          ONE_DAY,
          TENTH_ETH,              
          ethers.constants.AddressZero
        );            
    }
    describe("auctioneer management", async () => {
      it("should allow admin manage auctioneer permissions", async () => {
        expect(await auction.isAuctioneer(auctioneerAddress)).to.be.eq(false);      
        await auction.addAuctioneer(auctioneerAddress);
        expect(await auction.isAuctioneer(auctioneerAddress)).to.be.eq(true);      
        await auction.removeAuctioneer(auctioneerAddress);
        expect(await auction.isAuctioneer(auctioneerAddress)).to.be.eq(false);      
      });
  
      it("should revert on non-admin calls to change auctioneer set", async () => {      
        await expect(
          auction.connect(otherUser).addAuctioneer(
            auctioneerAddress
          )
        ).eventually.rejectedWith(
          revert`Call must be made by administrator`
        );
        
        // Auctioneers shouldn't be able to do this either
        await auction.connect(chainsaw).addAuctioneer(auctioneerAddress);
        await expect(
          auction.connect(auctioneer).addAuctioneer(
            otherUserAddress
          )
        ).eventually.rejectedWith(
          revert`Call must be made by administrator`
        );
      }); 
    });

    describe("whitelist management", async () => {
      it("should allow admin manage whitelist", async () => {        
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(false);
        await auction.whitelistAccount(otherUserAddress);
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(true);
        await auction.removeWhitelistedAccount(otherUserAddress);
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(false);      
      });

      it("should allow auctioneer manage whitelist", async () => {        
        await auction.addAuctioneer(auctioneerAddress);
        await auction.connect(auctioneer);
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(false);
        await auction.whitelistAccount(otherUserAddress);
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(true);
        await auction.removeWhitelistedAccount(otherUserAddress);
        expect(await auction.isWhitelisted(otherUserAddress)).to.be.eq(false);      
      });
  
      it("should revert on non-admin calls to change whitelist", async () => {      
        await expect(
          auction.connect(otherUser).whitelistAccount(
            auctioneerAddress
          )
        ).eventually.rejectedWith(
          revert`Call must be made by authorized auctioneer`
        );

        await expect(
          auction.connect(otherUser).removeWhitelistedAccount(
            auctioneerAddress
          )
        ).eventually.rejectedWith(
          revert`Call must be made by authorized auctioneer`
        );
      }); 
    });

    describe("public auction management", async () => {
      it("should allow admin open and close public auctions", async () => {
        expect(await auction.publicAuctionsEnabled()).to.be.eq(false);
        await auction.setPublicAuctionsEnabled(true);
        expect(await auction.publicAuctionsEnabled()).to.be.eq(true);
        await auction.setPublicAuctionsEnabled(false);
        expect(await auction.publicAuctionsEnabled()).to.be.eq(false);
      });
  
      it("should revert on non-admin calls to change auctioneer set", async () => {      
        await expect(
          auction.connect(otherUser).setPublicAuctionsEnabled(true)
        ).eventually.rejectedWith(
          revert`Call must be made by administrator`
        );
        
        // Auctioneers shouldn't be able to do this either
        await auction.connect(chainsaw).addAuctioneer(auctioneerAddress);
        await expect(
          auction.connect(auctioneer).setPublicAuctionsEnabled(true)
        ).eventually.rejectedWith(
          revert`Call must be made by administrator`
        );
      }); 
    });

    describe("cancel auction", async () => {
      it("should allow authorized users to cancel auctions", async () => {              
        // Admin
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        await auction.connect(chainsaw).cancelAuction(0);
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ethers.constants.AddressZero);
        
        // Owner
        await startAuction();        
        expect((await auction.auctions(1)).tokenOwner).to.be.eq(ownerAddress);
        await auction.connect(owner).cancelAuction(1);
        expect((await auction.auctions(1)).tokenOwner).to.be.eq(ethers.constants.AddressZero);

        // Auctioneer
        await startAuction();        
        expect((await auction.auctions(2)).tokenOwner).to.be.eq(ownerAddress);
        await auction.connect(chainsaw).addAuctioneer(auctioneerAddress); 
        await auction.connect(auctioneer).cancelAuction(2);
        expect((await auction.auctions(2)).tokenOwner).to.be.eq(ethers.constants.AddressZero);        
      }); 

      it("should revert on unauthorized calls to cancel auctions", async () => {              
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        
        await expect(
          auction.connect(otherUser).cancelAuction(0)
        ).eventually.rejectedWith(
          revert`Must be auctioneer or owner of NFT`
        );
      }); 
    });

    describe("set auction reserve", async () => {
      it("should allow authorized users to set reserve price", async () => {              
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        expect((await auction.auctions(0)).reservePrice).to.be.eq(TENTH_ETH);

        // Owner
        await auction.connect(owner).setAuctionReservePrice(0, ONE_ETH)
        expect((await auction.auctions(0)).reservePrice).to.be.eq(ONE_ETH);

        // Admin
        await auction.connect(chainsaw).setAuctionReservePrice(0, TWO_ETH)
        expect((await auction.auctions(0)).reservePrice).to.be.eq(TWO_ETH);

        // Auctioneer
        await auction.connect(chainsaw).addAuctioneer(auctioneerAddress); 
        await auction.connect(auctioneer).setAuctionReservePrice(0, ONE_ETH)
        expect((await auction.auctions(0)).reservePrice).to.be.eq(ONE_ETH);             
      }); 

      it("should revert on unauthorized calls to cancel auctions", async () => {              
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        
        await expect(
          auction.connect(otherUser).cancelAuction(0)
        ).eventually.rejectedWith(
          revert`Must be auctioneer or owner of NFT`
        );
      }); 
    });

    describe("set royalties", async () => {
      it("should allow authorized users to set royalties", async () => {              
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        
        // Admin
        expect(
          (await auction.royaltyRegistry(genericNFT.address)).beneficiary
        ).to.be.eq(ethers.constants.AddressZero);        
        await auction.connect(chainsaw).setRoyalty(genericNFT.address, otherUserAddress, 5);
        expect(
          (await auction.royaltyRegistry(genericNFT.address)).beneficiary
        ).to.be.eq(otherUserAddress);        
        expect(
          (await auction.royaltyRegistry(genericNFT.address)).royaltyPercentage
        ).to.be.eq(5);        

        // Auctioneer
        await auction.connect(chainsaw).addAuctioneer(auctioneerAddress);               
        await auction.connect(auctioneer).setRoyalty(genericNFT.address, chainsawAddress, 10);
        expect(
          (await auction.royaltyRegistry(genericNFT.address)).beneficiary
        ).to.be.eq(chainsawAddress);        
        expect(
          (await auction.royaltyRegistry(genericNFT.address)).royaltyPercentage
        ).to.be.eq(10);                         
      }); 

      it("should if unauthorized user sets royalties", async () => {              
        await startAuction();        
        expect((await auction.auctions(0)).tokenOwner).to.be.eq(ownerAddress);
        
        await expect(
          auction.connect(otherUser).setRoyalty(genericNFT.address, otherUserAddress, 5)
        ).eventually.rejectedWith(
          revert`Call must be made by authorized auctioneer`
        );
      }); 
    });

    
       
  });
});
