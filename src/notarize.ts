// Step 5: NOTARIZE
// Push SHA-256 hash to IOTA Rebased as Dynamic Notarization.
//
// IOTA Rebased uses MoveVM, not the old Tangle.
// Dynamic Notarization = a Move object holding hash + metadata.
// Immutable once created. Anyone can read it to verify.
//
// TODO: Wire up @iota/iota-sdk when ready.
// Docs: https://docs.iota.org/developer/workshops/iota-notarization-truedoc

export async function notarize(
  hash: string,
  event: any
): Promise<string | null> {
  const rpcUrl = process.env.IOTA_RPC_URL;
  const privateKey = process.env.IOTA_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.log(`[notarize] STUB: would notarize hash ${hash.slice(0, 16)}...`);
    console.log(`[notarize] Set IOTA_RPC_URL and IOTA_PRIVATE_KEY to enable.`);
    return `stub:${hash.slice(0, 16)}`;
  }

  // -----------------------------------------------------------------
  // IOTA Rebased notarization via @iota/iota-sdk
  // Uncomment when SDK is installed (npm install @iota/iota-sdk):
  //
  // import { IotaClient } from "@iota/iota-sdk/client";
  // import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
  // import { Transaction } from "@iota/iota-sdk/transactions";
  //
  // const client = new IotaClient({ url: rpcUrl });
  // const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  //
  // const tx = new Transaction();
  // tx.moveCall({
  //   target: "0xPACKAGE::notarization::notarize",
  //   arguments: [
  //     tx.pure.vector("u8", Buffer.from(hash, "hex")),
  //     tx.pure.string(event.epcList?.[0] || "unknown"),
  //     tx.pure.string(event.bizStep || "event"),
  //   ],
  // });
  //
  // const result = await client.signAndExecuteTransaction({
  //   signer: keypair,
  //   transaction: tx,
  // });
  //
  // return result.digest;
  // -----------------------------------------------------------------

  console.log(`[notarize] STUB: hash=${hash.slice(0, 16)}... rpc=${rpcUrl}`);
  return `stub:${hash.slice(0, 16)}`;
}
