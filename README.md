# Chain/Saw — Auction House

The Chain/Saw Auction House enables permissioned reserve time auctions for NFTs. Accounts granted either the *administrative* or *auctioneer* roles are able to initiate an auction for any NFT that they own. These roles are intended to facilitate primary sales run by Chain/Saw on behalf of collaborating artist. To enable secondary sales, the auction house allows whitelisted accounts to initiate auctions for any NFTs and any user to initiate an auction for a whitelisted token contract.

*Mainnet address:* `TBD`

*Rinkeby address:* `TBD`

## Table of Contents
- [Chain/Saw — Auction House](#chainsaw--auction-house)
  - [Table of Contents](#table-of-contents)
  - [Architecture](#architecture)
  - [Whitelist](#whitelist)
  - [Public Auction Toggle](#public-auction-toggle)
  - [Roles](#roles)
    - [Create Auction](#create-auction)
    - [Cancel Auction](#cancel-auction)
    - [Create Bid](#create-bid)
    - [End Auction](#end-auction)
  - [Local Development](#local-development)
    - [Install Dependencies](#install-dependencies)
    - [Compile Contracts](#compile-contracts)
    - [Run Tests](#run-tests)
    - [Deploy](#deploy)

## Architecture
This protocol allows *administrators* and *auctioneers* holding any NFT to create and perform
a reserve auction. It also seeks to enable secondary sales by allowing any user to create an auction so long as either (a) the user account is whitelisted or (b) the account representing the underlying token contract of the NFT is whitelisted.


## Whitelist
A whitelist has been added with the intention of allowing us to use this contract for any secondary markets we want to make available on the Chain/Saw (or any other) websites. Previously, only accounts granted the role of `admin` or `auctioneer` were able to create auctions. Now, any user can create an auction for an NFT that they own if either (a) their account has been whitelisted or (b) the account of the underlying token contract has been whitelisted.

The idea here is that we don't want any old NFT to appear on the secondary marketplace, so the whitelist gives us the ability to lock it down to certain contracts. Additionally, an individual, owned account can also be whitelisted. 

## Public Auction Toggle
Added in a bool to track whether the above-mentioned whitelisting functionality is in effect. This will allow us to open up / close secondary markets when we see fit. Can't really remember the exact use case I had in mind when this was added so may not be necessary.

## Roles
There are two roles that are given permission access to various features:
* `admin` 
  * set in constructor to `msg.sender`
  * has permissions to add / remove `auctioneers` and add / remove accounts from whitelist
  * has permissions to start auction for any NFT that they own
* `auctioneer`
  * same permissions as admin, except for ability to add / remove other `auctioneers`
  * this role will be granted to trusted staff to distribute administrative load

Users that do not fall into one of these roles still have the ability to create auctions for NFTs that they own so long one of the following conditions is met:
* their account is whitelisted
* the account # representing the contract of the token they want to auction is whitelisted
* public auctions are enabled

---

### Create Auction
At any time, the holder of a token who meets conditions outlined above can create an auction. When an auction is created,
the token is moved out of their wallet and held in escrow by the auction. The owner can 
retrieve the token at any time, so long as the auction has not begun. 

| **Name**               | **Type**       | **Description**                                                                                |
|------------------------|----------------|------------------------------------------------------------------------------------------------|
| `tokenId`              | `uint256`      | The tokenID to use in the auction                                                              |
| `tokenContract`        | `address`      | The address of the nft contract the token is from                                              |
| `duration`             | `uint256`      | The length of time, in seconds, that the auction should run for once the reserve price is hit. |
| `reservePrice`         | `uint256`      | The minimum price for the first bid, starting the auction.                                     
| `auctionCurrency`      | `address`      | The currency to perform this auction in, or 0x0 for ETH                                        |

### Cancel Auction
If an auction has not started yet, creator of the auction may cancel the auction, and remove it from the registry. 
This action returns the token to the previous holder.

| **Name**               | **Type**       | **Description**                                                                                |
|------------------------|----------------|------------------------------------------------------------------------------------------------|
| `auctionId`            | `uint256`      | The ID of the auction                                                                          |

### Create Bid
Anyone is able to bid. The first bid _must_ be greater than the reserve price. 
Once the first bid is successfully placed, other bidders may continue to place bids up until the auction's duration has passed.

If a bid is placed in the final 15 minutes of the auction, the auction is extended for another 15 minutes. 

| **Name**               | **Type**       | **Description**                                                                                |
|------------------------|----------------|------------------------------------------------------------------------------------------------|
| `auctionId`            | `uint256`      | The ID of the auction                                                                          |
| `amount`               | `uint256`      | The amount of currency to bid. If the bid is in ETH, this must match the sent ETH value        |

### End Auction
Once the auction is no longer receiving bids, Anyone may finalize the auction.
This action transfers the NFT to the winner, places the winning bid on the piece, and pays out the auction creator and curator.

| **Name**               | **Type**       | **Description**                                                                                |
|------------------------|----------------|------------------------------------------------------------------------------------------------|
| `auctionId`            | `uint256`      | The ID of the auction                                                                          |

## Local Development
The following assumes `node >= 12`

### Install Dependencies

```shell script
yarn
```

### Compile Contracts

```shell script
npx hardhat compile
```

### Run Tests

```shell script
npx hardhat test
```
### Deploy

Navigate to project root and start up local node:
```shell script
npx hardhat node
```

Create `env.local` file in the root directory and add values for keys:
```
PRIVATE_KEY=<some private key from account on local node>
RPC_ENDPOINT=<can leave blank or provide endpoint like INFURA>
```
Open up `addresses/137.json` and ensure values for `weth` and `auctionHouse` are empty, i.e. `""`. Then run the deploy script targeting your local hardhat node:
```
npx ts-node scripts/deploy.ts --chainId=137
```
NOTE: I think chain ID 137 actually correspond to Polygon (Matic) Network, but the way the deploy script is written, any chainId over other than 1 or 4 will be treated as local and pull addresses from the corresponding `/addresses/<chainId>.json` file.



