// @ts-ignore
import { ethers } from "hardhat";
import {
  BadBidder,
  AuctionHouse,
  WETH,
  BadERC721,
  TestERC721,
} from "../typechain";
import { sha256 } from "ethers/lib/utils";
import Decimal from "../utils/Decimal";
import { BigNumber } from "ethers";

export const THOUSANDTH_ETH = ethers.utils.parseUnits(
  "0.001",
  "ether"
) as BigNumber;
export const HUNDRETH_ETH = ethers.utils.parseUnits("0.01", "ether") as BigNumber;
export const TENTH_ETH = ethers.utils.parseUnits("0.1", "ether") as BigNumber;
export const ONE_ETH = ethers.utils.parseUnits("1", "ether") as BigNumber;
export const TWO_ETH = ethers.utils.parseUnits("2", "ether") as BigNumber;

export const deployWETH = async () => {
  const [deployer] = await ethers.getSigners();
  return (await (await ethers.getContractFactory("WETH")).deploy()) as WETH;
};

export const deployOtherNFTs = async () => {
  const bad = (await (
    await ethers.getContractFactory("BadERC721")
  ).deploy()) as BadERC721;
  const test = (await (
    await ethers.getContractFactory("TestERC721")
  ).deploy()) as TestERC721;

  return { bad, test };
};

export const deployBidder = async (auction: string, nftContract: string) => {
  return (await (
    await (await ethers.getContractFactory("BadBidder")).deploy(auction)
  ).deployed()) as BadBidder;
};

export const revert = (messages: TemplateStringsArray) =>
  `VM Exception while processing transaction: reverted with reason string '${messages[0]}'`;

  /*
export const mint = async (media: Media) => {
  const metadataHex = ethers.utils.formatBytes32String("{}");
  const metadataHash = await sha256(metadataHex);
  const hash = ethers.utils.arrayify(metadataHash);
  await media.mint(
    {
      tokenURI: "zora.co",
      metadataURI: "zora.co",
      contentHash: hash,
      metadataHash: hash,
    },
    {
      prevOwner: Decimal.new(0),
      owner: Decimal.new(85),
      creator: Decimal.new(15),
    }
  );
};
*/