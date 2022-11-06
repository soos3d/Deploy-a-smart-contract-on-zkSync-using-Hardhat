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
