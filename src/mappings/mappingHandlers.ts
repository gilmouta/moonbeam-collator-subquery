import {SubstrateBlock} from "@subql/types";
import {Block} from "../types";
import {Balance} from "@polkadot/types/interfaces";


export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new Block with ID using block hash
    let record = new Block(block.block.header.hash.toString());
    // Record block number
    record.number = block.block.header.number.toNumber();
    // Get block author
    const authorInfo = (await api.query.authorInherent.author()).toString();
    record.author = authorInfo;
    // Get weight
    const txWithEvents = mapExtrinsics(block.block.extrinsics, block.events);
    const blockWeight = txWithEvents.reduce((totalWeight, tx) => {
        return totalWeight + (tx.dispatchInfo && tx.dispatchInfo.weight.toBigInt());
    }, BigInt(0));
    //logger.info("weight: " + blockWeight);
    record.weight = blockWeight;
    //record.weight = BigInt(0);
    // Count extrinsics
    record.transactions = block.block.extrinsics.length;
    await record.save();
}


function mapExtrinsics(extrinsics, records) {
    return extrinsics.map((extrinsic, index) => {
        let dispatchError;
        let dispatchInfo;

        const events = records
        .filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index))
        .map(({ event }) => {
            if (event.section === "system") {
            if (event.method === "ExtrinsicSuccess") {
                dispatchInfo = event.data[0];
            } else if (event.method === "ExtrinsicFailed") {
                dispatchError = event.data[0];
                dispatchInfo = event.data[1];
            }
            }

            return event;
        });

        return { dispatchError, dispatchInfo, events, extrinsic };
    });
}