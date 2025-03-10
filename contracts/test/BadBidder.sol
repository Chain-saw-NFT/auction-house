// SPDX-License-Identifier: GPL-3.0

// FOR TEST PURPOSES ONLY. NOT PRODUCTION SAFE
pragma solidity ^0.8.7;
import {IAuctionHouse} from "../interfaces/IAuctionHouse.sol";

// This contract is meant to mimic a bidding contract that does not implement on IERC721 Received,
// and thus should cause a revert when an auction is finalized with this as the winning bidder.
contract BadBidder {
    address auction;
    
    constructor(address _auction) {
        auction = _auction;        
    }

    function placeBid(uint256 auctionId, uint256 amount) external payable {
        IAuctionHouse(auction).createBid{value: amount}(auctionId, amount);
    }

    receive() external payable {}
    fallback() external payable {}
}