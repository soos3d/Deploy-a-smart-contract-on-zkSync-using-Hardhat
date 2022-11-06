# Deploy a smart contract on zkSync 2.0 using Hardhat

zkSync is the new and hot EVM-compatible zero knowledge rollup; in this short tutorial, you will learn how to use Hardhat to deploy a simple, smart contract on the zkSync testnet.

> This tutorial is based on the [Hardhat tutorial from the zkSync docs](https://v2-docs.zksync.io/api/hardhat/getting-started.html#prerequisites). Note that it is slightly different.

## Table of contents

  - [Pre-requisites](#pre-requisites)
  - [Quickstart](#quickstart)
  - [Configure your project](#configure-your-project)
  - [The smart contract](#the-smart-contract)
  - [Compile the smart contract](#compile-the-smart-contract)
  - [Deploy the smart contract](#deploy-the-smart-contract)
  - [Conclusion](#conclusion)

## Pre-requisites

**Note that this process was tested on an Ubuntu 20.04 LTS version!**

1. Yarn package manager. [Install Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable).
1. You will need some Goerli ETH to bridge to zkSync. You can get some from [this faucet](https://goerli-faucet.pk910.de/).
1. You can use the [zkSync faucet](https://portal.zksync.io/faucet) to receive test ETH directly into your zkSync wallet.
1. (Optional) You might need a Goerli node endpoint in case the default provider doesn't work. Get a free Goerli endpoint on [Chainstack](https://chainstack.com).

## Quickstart

1. Clone this repo.
1. Run `yarn install`.
1. In `deploy/deploy.ts`, add your private key in the `wallet` const (starting with 0x):
    ```ts
    // Initialize the wallet.
    const wallet = new Wallet("0xPRIVATE_KEY");
    ```
1. (Optional) Add your Goerli endpoint in `hardhat.config.ts`
    ```ts
    ethNetwork: "goerli", // Can also be an RPC URL.
    ```
1. Run: `yarn hardhat compile`.
1. Run: `yarn hardhat deploy-zksync`.

This sequence of commands will:

1. Compile the smart contract called `Greeter.sol` in the `contracts` directory generating the `artifacts-zk` and `cache-zk` folders.
1. Run the `deploy.ts` script in the `deploy` directory, which will bridge 0.001 Goerli ETH to zkSync, then deploy the smart contract and call the contract functions.

> Note that the process will take a few minutes when bridging. Messages of the progress will appear on the console.

## Configure your project

Note that this example uses TypeScript.

First, create a new project folder where you can initialize a new Hardhat project.

Initialize a HardHat project by running.

```sh
yarn init -y
```

Then install the necessary dependencies; in this case, it will be mainly zkSync and TS dependencies. 

```sh
yarn add -D typescript ts-node ethers zksync-web3 hardhat @matterlabs/hardhat-zksync-solc @matterlabs/hardhat-zksync-deploy
```

Now, inside the project folder create a `hardhat.config.ts` file and paste the following configuration.

```ts
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");

module.exports = {
  zksolc: {
    version: "1.2.0",
    compilerSource: "binary",
    settings: {
      experimental: {
        dockerImage: "matterlabs/zksolc",
        tag: "v1.2.0",
      },
    },
  },
  zkSyncDeploy: {
    zkSyncNetwork: "https://zksync2-testnet.zksync.dev",
    ethNetwork: "goerli", // Can also be the RPC URL. 
  },
  networks: {
    hardhat: {
      zksync: true,
    },
  },
  solidity: {
    version: "0.8.16",
  },
};
```

Here is where you can configure the project; I recommend using your own Goerli endpoint to avoid possible issues with the default provider; it will work anyway if you don't change it. Still, you will get the following warning while deploying the contract.

```sh
========= NOTICE =========
Request-Rate Exceeded  (this message will not be repeated)

The default API keys for each service are provided as a highly-throttled,
community resource for low-traffic projects and early prototyping.

While your application will continue to function, we highly recommended
signing up for your own API keys to improve performance, increase your
request rate/limit and enable other perks, such as metrics and advanced APIs.

For more details: https://docs.ethers.io/api-keys/
==========================
```

This means that the default endpoint is throttled down and unsuitable for high workloads.

You can get a Goerli endpoint from Chainstack by following these steps:

1. [Sign up with Chainstack](https://console.chainstack.com/user/account/create).  
1. [Deploy a node](https://docs.chainstack.com/platform/join-a-public-network).  
1. [View node access and credentials](https://docs.chainstack.com/platform/view-node-access-and-credentials). 

## The smart contract

At this point, we can take care of the smart contract. But, first, create a `contracts` directory and a smart contract file named `Greeter.sol`.

Paste the following code into the `.sol` file and save.

```sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Greeter {
    
    string private greeting;

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
}
```

This is a simple example where we store a string in a variable that we can then call and display on the console. 

## Compile the smart contract

Now we can compile the smart contract by running:

```sh
yarn hardhat compile
```

This command will use the `hardhat-zksync-solc` plugin and compile the contract. The compiled files will be in the `artifacts-zk` folder.

## Deploy the smart contract

to deploy the smart contract on the zksync testnet, we need a 'deploy' script. This script will deploy and interact with our smart contract. 

Create a `deploy` directory and create a `deploy.ts` file inside.

Paste this code in the file:

```ts
import { utils, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for this contract on zkSync!`);

  // Initialize the wallet.
  const wallet = new Wallet("PRIVATE_KEY");

  // Create deployer object and load the artifact of the contract we want to deploy.
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("Greeter");

  // Deposit some funds to L2 in order to be able to perform L2 transactions.
  console.log(`Bridging funds from Goerli to zkSync...`)
  const depositAmount = ethers.utils.parseEther("0.001");
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: utils.ETH_ADDRESS,
    amount: depositAmount,
  });

  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();
  console.log(`Bridge complete, deploying contract...`)

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.
  const greeting = "I'm a simple smart contract!";
  const greeterContract = await deployer.deploy(artifact, [greeting]);

  // Show the contract info.
  const contractAddress = greeterContract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress} on zkSync!`);

  // Call the deployed contract.
  const greetingFromContract = await greeterContract.greet();

  if (greetingFromContract == greeting) {
    console.log(`The contract says: ${greeting}!`);
  } else {
    console.error(`Contract said something unexpected: ${greetingFromContract}`);
  }

  // Edit the greeting of the contract
  const newGreeting = "I was deployed on zkSync using HardHat!";
  console.log(`Setting a new variable...`)

  // Call setGreeting function.
  const setNewGreetingHandle = await greeterContract.setGreeting(newGreeting);
  await setNewGreetingHandle.wait();

  // Display new stored variable.
  const newGreetingFromContract = await greeterContract.greet();
  if (newGreetingFromContract == newGreeting) {
    console.log(`The contract says: ${newGreeting}!`);
  } else {
    console.error(`Contract said something unexpected: ${newGreetingFromContract}`);
  }
}
```

When run this file will do a few things:

1. Load the artifact and create a deployer object.
1. Bridge some funds from Goerli to zkSync. You can get some Goerli ETH from [this faucet](https://goerli-faucet.pk910.de/).
1. Deploy the smart contract.
1. Call the `greet` function to see what was stored.
1. Call the `setGreeting` function to store a new string.
1. Call the `greet` function again to display the new variable.

You will see a message on the console when these actions are happening.

> Note that it will take a few minutes to complete if you are bridging assets from Goerli.

If you already have some test ETH on zkSync, you can skip the bridge by commenting out or deleting this part.

```ts
// Deposit some funds to L2 in order to be able to perform L2 transactions.
  console.log(`Bridging funds from Goerli to zkSync...`)
  const depositAmount = ethers.utils.parseEther("0.001");
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: utils.ETH_ADDRESS,
    amount: depositAmount,
  });

  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();
  console.log(`Bridge complete, deploying contract...`)
```

Now to deploy the contract and call the functions simply run:

```sh
yarn hardhat deploy-zksync
```

You will recevie this response on the console:

```sh
Running deploy script for this contract on zkSync!
Bridging funds from Goerli to zkSync...
Bridge complete, deploying contract...
Greeter was deployed to 0x1de3d23d79e404F0e38B9FA7E6A698840Afe38b5 on zkSync!
The contract says: I'm a simple smart contract!!
Setting a new variable...
The contract says: I was deployed on zkSync using HardHat!!
Done in 274.77s.
```

## Conclusion

Congrats on deploying your first smart contract on zkSyn using Hardhat!