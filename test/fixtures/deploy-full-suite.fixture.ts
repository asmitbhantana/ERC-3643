import { BigNumber, Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AGENT_ROLE, TOKEN_ROLE } from "../utils";
import dotenv from "dotenv";
dotenv.config();

const TAX_TOKEN = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

export async function deployIdentityProxy(
  implementationAuthority: Contract["address"],
  managementKey: string,
  signer: Signer
) {
  const identity = await new ethers.ContractFactory(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    signer
  ).deploy(implementationAuthority, managementKey, {
    gasLimit: BigNumber.from("10000000"),
  });

  console.log("identity.address", identity.address);

  return ethers.getContractAt("Identity", identity.address, signer);
}

export async function deployFullSuiteFixture() {
  //configure and deploy the tokens
  const wallets = await ethers.getSigners();

  const [
    deployer,
    tokenIssuer,
    tokenAgent,
    tokenAdmin,
    claimIssuer,
    aliceWallet,
    bobWallet,
    charlieWallet,
    davidWallet,
    anotherWallet,
  ] = wallets;

  console.log("wallets", wallets[0]);

  const claimIssuerSigningKey = ethers.Wallet.fromMnemonic(
    process.env.MNEMONIC,
    "m/44'/60'/0'/0/12"
  );

  console.log("claimIssuerSigningKey.address", claimIssuerSigningKey.address);

  const aliceActionKey = ethers.Wallet.fromMnemonic(
    process.env.MNEMONIC,
    "m/44'/60'/0'/0/13"
  );

  console.log("aliceActionKey.address", aliceActionKey.address);

  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  ).deploy(deployer.address, true);

  // await run("verify:verify", {
  //   address: identityImplementation.address,
  //   constructorArguments: [deployer.address, true],
  // });

  console.log("identityImplementation.address", identityImplementation.address);

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  ).deploy(identityImplementation.address);

  console.log(
    "identityImplementationAuthority.address",
    identityImplementationAuthority.address
  );

  // await run("verify:verify", {
  //   address: identityImplementationAuthority.address,
  //   constructorArguments: [identityImplementation.address],
  // });

  const ClaimTopicsRegistry = await ethers.getContractFactory(
    "ClaimTopicsRegistry"
  );
  const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();

  console.log("claimTopicsRegistry.address", claimTopicsRegistry.address);

  const ClaimIssuersRegistry = await ethers.getContractFactory(
    "ClaimIssuersRegistry"
  );
  const claimIssuersRegistry = await ClaimIssuersRegistry.deploy();

  console.log("claimIssuersRegistry.address", claimIssuersRegistry.address);

  const IdentityRegistryStorage = await ethers.getContractFactory(
    "IdentityRegistryStorage"
  );
  const identityRegistryStorage = await IdentityRegistryStorage.deploy();

  console.log(
    "identityRegistryStorage.address",
    identityRegistryStorage.address
  );

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(
    claimIssuersRegistry.address,
    claimTopicsRegistry.address,
    identityRegistryStorage.address
  );

  console.log("identityRegistry.address", identityRegistry.address);

  const basicCompliance = await ethers.deployContract(
    "BasicCompliance",
    [TAX_TOKEN],
    deployer
  );

  console.log("basicCompliance.address", basicCompliance.address);

  const tokenOID = await deployIdentityProxy(
    identityImplementationAuthority.address,
    tokenIssuer.address,
    deployer
  );

  console.log("tokenOID.address", tokenOID.address);

  const tokenName = "ERC-3643";

  const tokenSymbol = "TREX";

  const tokenDecimals = BigNumber.from("6");

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(
    identityRegistry.address,
    basicCompliance.address,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenOID.address,
    {
      gasLimit: BigNumber.from("3000000"),
    }
  );

  console.log("token.address", token.address);

  await basicCompliance.grantRole(TOKEN_ROLE, token.address, {
    gasLimit: BigNumber.from("3000000"),
  });

  console.log("basic compliance granted token role");

  await token.grantRole(AGENT_ROLE, tokenAgent.address, {
    gasLimit: BigNumber.from("3000000"),
  });

  console.log("token granted agent role");

  await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address, {
    gasLimit: BigNumber.from("10000000"),
  });

  //configure the claim topics registry
  const claimTopics = [ethers.utils.id("CLAIM_TOPIC")];

  console.log("claimTopics");

  await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0], {
    gasLimit: BigNumber.from("10000000"),
  });

  console.log("claimTopicsRegistry");

  const claimIssuerContract = await ethers.deployContract(
    "ClaimIssuer",
    [claimIssuer.address],
    claimIssuer
  );

  console.log("claimIssuerContract.address", claimIssuerContract.address);

  await claimIssuerContract
    .connect(claimIssuer)
    .addKey(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [claimIssuerSigningKey.address]
        )
      ),
      3,
      1,
      { gasLimit: BigNumber.from("3000000") }
    );

  console.log("addKey");

  await claimIssuersRegistry
    .connect(deployer)
    .addClaimIssuer(claimIssuerContract.address, claimTopics, {
      gasLimit: BigNumber.from("3000000"),
    });

  console.log("claimIssuersRegistry");

  //configure key for action topic on identity
  const aliceIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address,
    aliceWallet.address,
    deployer
  );

  console.log("aliceIdentity");

  await aliceIdentity
    .connect(aliceWallet)
    .addKey(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [aliceActionKey.address]
        )
      ),
      2,
      1,
      { gasLimit: BigNumber.from("3000000") }
    );

  const bobIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address,
    bobWallet.address,
    deployer
  );

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address,
    charlieWallet.address,
    deployer
  );

  //to register the user on identity registry
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent.address, {
    gasLimit: BigNumber.from("3000000"),
  });
  await identityRegistry.grantRole(AGENT_ROLE, token.address, {
    gasLimit: BigNumber.from("3000000"),
  });

  await identityRegistry
    .connect(tokenAgent)
    .batchRegisterIdentity(
      [aliceWallet.address, bobWallet.address],
      [aliceIdentity.address, bobIdentity.address],
      [42, 666],
      { gasLimit: BigNumber.from("3000000") }
    );

  //claiming for alice
  const claimForAlice = {
    data: ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes("Some claim public data.")
    ),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: aliceIdentity.address,
    signature: "",
  };

  claimForAlice.signature = await claimIssuerSigningKey.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "bytes"],
          [claimForAlice.identity, claimForAlice.topic, claimForAlice.data]
        )
      )
    )
  );

  await aliceIdentity
    .connect(aliceWallet)
    .addClaim(
      claimForAlice.topic,
      claimForAlice.scheme,
      claimForAlice.issuer,
      claimForAlice.signature,
      claimForAlice.data,
      "",
      { gasLimit: BigNumber.from("3000000") }
    );

  const claimForBob = {
    data: ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes("Some claim public data.")
    ),
    issuer: claimIssuerContract.address,
    topic: claimTopics[0],
    scheme: 1,
    identity: bobIdentity.address,
    signature: "",
  };

  claimForBob.signature = await claimIssuerSigningKey.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "bytes"],
          [claimForBob.identity, claimForBob.topic, claimForBob.data]
        )
      )
    )
  );

  await bobIdentity
    .connect(bobWallet)
    .addClaim(
      claimForBob.topic,
      claimForBob.scheme,
      claimForBob.issuer,
      claimForBob.signature,
      claimForBob.data,
      "",
      { gasLimit: BigNumber.from("3000000") }
    );

  //token agent can mint the tokens

  await token.grantRole(AGENT_ROLE, tokenAgent.address, {
    gasLimit: BigNumber.from("300000"),
  });

  await token
    .connect(tokenAgent)
    .mint(aliceWallet.address, 1000, { gasLimit: BigNumber.from("3000000") });
  await token
    .connect(tokenAgent)
    .mint(bobWallet.address, 500, { gasLimit: BigNumber.from("3000000") });

  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent.address, {
    gasLimit: BigNumber.from("300000"),
  });

  return {
    accounts: {
      deployer,
      tokenIssuer,
      tokenAgent,
      tokenAdmin,
      claimIssuer,
      claimIssuerSigningKey,
      aliceActionKey,
      aliceWallet,
      bobWallet,
      charlieWallet,
      davidWallet,
      anotherWallet,
    },
    identities: {
      aliceIdentity,
      bobIdentity,
      charlieIdentity,
    },
    suite: {
      claimIssuerContract,
      claimTopicsRegistry,
      claimIssuersRegistry,
      identityRegistryStorage,
      basicCompliance,
      identityRegistry,
      tokenOID,
      token,
    },
    implementations: {
      identityImplementation,
    },
  };
}
