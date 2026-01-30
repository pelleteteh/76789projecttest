// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "./src/ChallengeFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy BantahPoints
        BantahPoints points = new BantahPoints();
        console.log("BantahPoints deployed at:", address(points));
        
        // Deploy ChallengeFactory with BantahPoints and admin address
        address admin = vm.addr(deployerPrivateKey);
        ChallengeFactory factory = new ChallengeFactory(address(points), admin);
        console.log("ChallengeFactory deployed at:", address(factory));
        
        // Deploy PointsEscrow with BantahPoints and ChallengeFactory
        PointsEscrow escrow = new PointsEscrow(address(points), address(factory));
        console.log("PointsEscrow deployed at:", address(escrow));
        
        // Update points manager to ChallengeFactory
        points.setPointsManager(address(factory));
        console.log("Points manager updated to ChallengeFactory");
        
        vm.stopBroadcast();
        
        console.log("---");
        console.log("Deployment complete!");
        console.log("BantahPoints:", address(points));
        console.log("ChallengeFactory:", address(factory));
        console.log("PointsEscrow:", address(escrow));
    }
}
