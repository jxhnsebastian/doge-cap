"use client";
import { Inter } from "next/font/google";
import styles from "./page.module.css";
import {
  Box,
  Center,
  Button,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  SimpleGrid,
  Image,
  Text,
  Divider,
  Input,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import axios from "axios";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [senderAddress, setSenderAddress] = useState("");
  const [nfts, setNfts] = useState([]);
  const isPhantomInstalled = window.phantom?.solana?.isPhantom;

  const provider = window.phantom?.solana;
  const receiverAddress = "8MdXvWgNou9jRVturbfnt3egf1aP9p1AjL8wiJavti7F";
  const rpcEndpoint =
    "https://proportionate-fabled-wave.solana-mainnet.discover.quiknode.pro/33ad92e07875b2ac6743b17277fc9005a1ceea2c/";

  const connectWallet = async () => {
    try {
      const resp = await provider.connect();
      console.log(resp.publicKey.toString());
      setConnected(provider.isConnected);
      let pubkey = new PublicKey(resp.publicKey.toString());
      setSenderAddress(pubkey.toBase58());
      getNFTS(pubkey.toBase58());
    } catch (err) {
      console.log(err);
    }
  };

  async function getNFTS(pubkey) {
    const data = {
      jsonrpc: "2.0",
      id: 1,
      method: "qn_fetchNFTs",
      params: {
        wallet: pubkey,
        omitFields: ["provenance", "traits"],
        page: 1,
        perPage: 10,
      },
    };
    axios
      .post(rpcEndpoint, data)
      .then(function (response) {
        console.log(response.data);
        let data = [];
        response.data.result.assets.map((asset) => {
          data.push({
            name: asset.name,
            url: asset.imageUrl,
            address: asset.tokenAddress,
          });
        });
        setNfts(nfts.concat(data));
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function handleConnect() {
    if (isPhantomInstalled === false || isPhantomInstalled === undefined) {
      alert("Phantom wallet is not installed.");
    } else {
      connectWallet();
    }
  }

  async function handleSend(tokenAddress) {
    const mintPubkey = new PublicKey(tokenAddress);
    const senderPubkey = new PublicKey(senderAddress);
    const receiverPubkey = new PublicKey(receiverAddress);

    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      senderPubkey
    );
    const receiverTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      receiverPubkey
    );

    const connection = new Connection(rpcEndpoint);

    let tx = new Transaction().add(
      createTransferCheckedInstruction(
        senderTokenAccount,
        mintPubkey,
        receiverTokenAccount,
        senderPubkey,
        1,
        0
      )
    );

    let blockhash = (await connection.getLatestBlockhash("finalized"))
      .blockhash;
    tx.recentBlockhash = blockhash;

    tx.feePayer = senderPubkey;

    const { signature } = await provider.signAndSendTransaction(tx);
    await connection.getSignatureStatus(signature);
    console.log(signature);
  }

  return (
    <main>
      <VStack justifyContent={"center"} w={"100vw"} minH={"100vh"} bg="black">
        <Text color={"#858585"} fontSize={{base: '60px', md: '100px'}} fontWeight={'bold'}>coolname</Text>
        <Button
          variant={"unstyled"}
          border={"1px solid #858585"}
          color={"#858585"}
          _hover={{ borderColor: "white", color: "white" }}
          size={"lg"}
          p={"10px"}
          onClick={() => handleConnect()}
        >
          Connect Wallet
        </Button>
        <Alert
          borderRadius={"20px"}
          p={"5px"}
          w={"10rem"}
          status={connected ? "success" : "error"}
          color={"black"}
        >
          <AlertIcon />
          {connected ? "Connected" : "Disconnected"}
        </Alert>

        <VStack display={connected ? "block" : "none"} color={"#858585"}>
          <Text w={"100%"} fontSize={"25px"}>
            Your NFTs
          </Text>
          <Divider />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={"5"}>
            {nfts != null &&
              nfts.map((nft, index) => (
                <VStack
                  align={"start"}
                  spacing={"1"}
                  key={index}
                  className={"group"}
                >
                  <VStack
                    w={"150px"}
                    border={"1px solid #858585"}
                    color={"#858585"}
                    _groupHover={{ borderColor: "white", color: "white" }}
                    p={"5px"}
                    borderRadius={"10px"}
                  >
                    <Image src={nft.url} boxSize={"100px"} />
                    <Text>{nft.name}</Text>
                  </VStack>
                  <Button
                    visibility={"hidden"}
                    colorScheme={"whiteAlpha"}
                    _groupHover={{ visibility: "visible" }}
                    left={"0"}
                    p={"5px"}
                    onClick={() => handleSend(nft.address)}
                  >
                    Send
                  </Button>
                </VStack>
              ))}
          </SimpleGrid>
        </VStack>
      </VStack>
    </main>
  );
}
