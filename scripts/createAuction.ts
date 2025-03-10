// @ts-ignore
import { ethers } from "hardhat";
import fs from "fs-extra";
import { AuctionHouse, WETH } from "../typechain";
import { AuctionHouse__factory } from "../typechain";

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

  // We get the contract to deploy
  const AuctionHouse = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    [
      {
        inputs: [
          {
            internalType: "address",
            name: "_weth",
            type: "address",
          },
          {
            internalType: "address[]",
            name: "auctioneers",
            type: "address[]",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "bidTime",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "bool",
            name: "firstBid",
            type: "bool",
          },
          {
            indexed: false,
            internalType: "bool",
            name: "extended",
            type: "bool",
          },
        ],
        name: "AuctionBid",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "tokenOwner",
            type: "address",
          },
        ],
        name: "AuctionCanceled",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "duration",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "reservePrice",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "address",
            name: "tokenOwner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "auctionCurrency",
            type: "address",
          },
        ],
        name: "AuctionCreated",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "duration",
            type: "uint256",
          },
        ],
        name: "AuctionDurationExtended",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "tokenOwner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "winner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "endTime",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "address",
            name: "auctionCurrency",
            type: "address",
          },
        ],
        name: "AuctionEnded",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "reservePrice",
            type: "uint256",
          },
        ],
        name: "AuctionReservePriceUpdated",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "tokenOwner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "winner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "address",
            name: "beneficiaryAddress",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "royaltyAmount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "endTime",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "address",
            name: "auctionCurrency",
            type: "address",
          },
        ],
        name: "AuctionWithRoyaltiesEnded",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "previousOwner",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "newOwner",
            type: "address",
          },
        ],
        name: "OwnershipTransferred",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            indexed: true,
            internalType: "bytes32",
            name: "previousAdminRole",
            type: "bytes32",
          },
          {
            indexed: true,
            internalType: "bytes32",
            name: "newAdminRole",
            type: "bytes32",
          },
        ],
        name: "RoleAdminChanged",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            indexed: true,
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "sender",
            type: "address",
          },
        ],
        name: "RoleGranted",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            indexed: true,
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "sender",
            type: "address",
          },
        ],
        name: "RoleRevoked",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "newBeneficiary",
            type: "address",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "royaltyPercentage",
            type: "uint256",
          },
        ],
        name: "RoyaltySet",
        type: "event",
      },
      {
        stateMutability: "payable",
        type: "fallback",
      },
      {
        inputs: [],
        name: "AUCTIONEER",
        outputs: [
          {
            internalType: "bytes32",
            name: "",
            type: "bytes32",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "DEFAULT_ADMIN_ROLE",
        outputs: [
          {
            internalType: "bytes32",
            name: "",
            type: "bytes32",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "who",
            type: "address",
          },
        ],
        name: "addAuctioneer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        name: "auctions",
        outputs: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "duration",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "firstBidTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "reservePrice",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenOwner",
            type: "address",
          },
          {
            internalType: "address payable",
            name: "bidder",
            type: "address",
          },
          {
            internalType: "address",
            name: "auctionCurrency",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
        ],
        name: "cancelAuction",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "duration",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "reservePrice",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "auctionCurrency",
            type: "address",
          },
        ],
        name: "createAuction",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        name: "createBid",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
        ],
        name: "endAuction",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
        ],
        name: "getRoleAdmin",
        outputs: [
          {
            internalType: "bytes32",
            name: "",
            type: "bytes32",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
        ],
        name: "grantRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
        ],
        name: "hasRole",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "who",
            type: "address",
          },
        ],
        name: "isAuctioneer",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "sellerOrTekenContract",
            type: "address",
          },
        ],
        name: "isWhitelisted",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "minBidIncrementPercentage",
        outputs: [
          {
            internalType: "uint8",
            name: "",
            type: "uint8",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "publicAuctionsEnabled",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "who",
            type: "address",
          },
        ],
        name: "removeAuctioneer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "sellerOrTokenContract",
            type: "address",
          },
        ],
        name: "removeWhitelistedAccount",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
        ],
        name: "renounceRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "role",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
        ],
        name: "revokeRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "royaltyRegistry",
        outputs: [
          {
            internalType: "address payable",
            name: "beneficiary",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "royaltyPercentage",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "auctionId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "reservePrice",
            type: "uint256",
          },
        ],
        name: "setAuctionReservePrice",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bool",
            name: "status",
            type: "bool",
          },
        ],
        name: "setPublicAuctionsEnabled",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "tokenContract",
            type: "address",
          },
          {
            internalType: "address payable",
            name: "beneficiary",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "royaltyPercentage",
            type: "uint256",
          },
        ],
        name: "setRoyalty",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes4",
            name: "interfaceId",
            type: "bytes4",
          },
        ],
        name: "supportsInterface",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "timeBuffer",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "newOwner",
            type: "address",
          },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "wethAddress",
        outputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "sellerOrTokenContract",
            type: "address",
          },
        ],
        name: "whitelistAccount",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "whitelistedAccounts",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        stateMutability: "payable",
        type: "receive",
      },
    ],
    wallet
  );

  console.log(
    `Deploying Auction House from deployment address ${wallet.address}...`
  );
  await AuctionHouse.createAuction(
    4,
    "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    86400,
    0,
    "0x0000000000000000000000000000000000000000"
  );
  console.log(`Created auction`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
