// @ts-ignore
import { ethers } from "hardhat";
import fs from "fs-extra";
import { AuctionHouse, WETH } from "../typechain";

async function main() {
  const args = require("minimist")(process.argv.slice(2));
  
  if (!args.chainId) {
    throw new Error("--chainId chain ID is required");
  }
  const path = `${process.cwd()}/.env${
    args.chainId === 1 ? ".prod" : args.chainId === 4 ? ".dev" : ".local"
  }`;
  await require("dotenv").config({ path });
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_ENDPOINT
  );
  const wallet = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
  const addressPath = `${process.cwd()}/addresses/${args.chainId}.json`;
  
  // @ts-ignore
  const addressBook = JSON.parse(await fs.readFileSync(addressPath));
  let deployWeth = false;
  if (!addressBook.weth) {
    if (args.chainId > 4) {
      deployWeth = true;
    } else {
      throw new Error("Missing WETH address in address book.");
    }    
  }
  
  if (addressBook.auctionHouse) {
    throw new Error(
      "auctionHouse already in address book, it must be moved before deploying."
    );
  }

  // Deploy WETH if local
  if (deployWeth) {    
    console.log(
      `Deploying WETH from deployment address ${wallet.address} for local development...`
    );
    const wethFactory = await ethers.getContractFactory(
      "WETH", wallet
    ) as WETH;
    
    const weth = await wethFactory.deploy();

    console.log(
      `Auction House deploying to ${weth.address}. Awaiting confirmation...`
    );
    await weth.deployed();
    addressBook.weth = weth.address;
    await fs.writeFile(addressPath, JSON.stringify(addressBook, null, 2));
  
    console.log("WETH contract deployed 💪🐸✌️");
  }

  // We get the contract to deploy
  const AuctionHouse = (await ethers.getContractFactory(
    "AuctionHouse",
    wallet
  )) as AuctionHouse;
  
  console.log(
    `Deploying Auction House from deployment address ${wallet.address}...`
  );
  const auctionHouse = await AuctionHouse.deploy(addressBook.weth, []);
  console.log(
    `Auction House deploying to ${auctionHouse.address}. Awaiting confirmation...`
  );
  await auctionHouse.deployed();
  addressBook.auctionHouse = auctionHouse.address;
  await fs.writeFile(addressPath, JSON.stringify(addressBook, null, 2));

  console.log("Auction House contract deployed 💪🐸✌️");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
