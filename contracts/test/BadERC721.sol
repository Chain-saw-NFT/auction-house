// SPDX-License-Identifier: GPL-3.0

// FOR TEST PURPOSES ONLY. NOT PRODUCTION SAFE
pragma solidity ^0.8.7;

contract BadERC721 {
    function supportsInterface(bytes4) public pure returns (bool){
        return false;
    }
}
