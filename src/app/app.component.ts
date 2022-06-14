import {Component, OnInit} from '@angular/core';
import {SkipBlock, SkipchainRPC} from '@dedis/cothority/skipchain';
import {Roster} from "@dedis/cothority/network";
import {Election, Transaction} from "@dedis/cothority/evoting/proto";
import {curve, Point, Scalar} from "@dedis/kyber";

// The curve to be used for all cryptographic operations. When the
// golang-code uses suite.Point() or cothority.Suite.Point(), then
// this corresponds to curve25519.point().
const curve25519 = curve.newCurve("edwards25519");

interface BallotBlock {
    user: number,
    block: number,
}

interface FinalizeBlock {
    block: number,
    node: string,
    votes: number,
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'evoting-explorer';
    // Definition of the EPFL blockchain for the e-voting, and a pointer to the only node that is available
    // outside of EPFL.
    mainID = Buffer.from("d913b168318fc7dce938e8227016ce1dbe8732fc8d2b1159891e0046e491e858", "hex");
    r = Roster.fromTOML(`
    [[servers]]
             Address = "tcp://127.0.0.1:7001"
             Public = "4e3008c1a2b6e022fb60b76b834f174911653e9c9b4156cc8845bfb334075655"
             Description = "conode1"
             Suite = "Ed25519"
             URL = "https://conode.gnugen.ch:7771"
    `);
    sc = new SkipchainRPC(this.r);

    // Elements to be displayed in the web-page. If an element is undefined or empty, the
    // corresponding card view is not displayed.
    public election: Election | undefined;
    public elections: Election[] = [];
    public ballots: BallotBlock[] = [];
    public partials: FinalizeBlock[] = [];
    public mixes: FinalizeBlock[] = [];

    constructor() {
    }

    /**
     * Start by reading the main chain to discover all elections so far.
     */
    async ngOnInit() {
        const links = await this.getLinks();
        let elections = [];
        for (const link of links) {
            const block = await this.sc.getSkipBlockByIndex(link, 1);
            const tx = Transaction.decode(block.skipblock.data);
            if (tx.election !== null) {
                console.log("Election: ", tx.election.name["en"], tx.election.subtitle["en"]);
                console.dir(tx.election);
                elections.unshift(tx.election);
            }
        }
        this.elections = elections;
    }

    /**
     * Returns all links going off from the main chain. Each link points to an independent election.
     */
    async getLinks(): Promise<Buffer[]> {
        const ret: Buffer[] = [];
        const blocks = await this.sc.getUpdateChain(this.mainID, false, false, 1);
        for (const block of blocks) {
            if (block.data.length > 0) {
                const tx = Transaction.decode(block.data);
                if (tx.link !== null) {
                    ret.push(tx.link.id);
                }
            } else {
                console.log("0 data for", block.index);
            }
        }
        return ret;
    }

    /**
     * Shows the chosen election in the main view. This method fills in the class-variables used
     * in the frontend to display the different steps of the election. It goes through all blocks
     * and for every block fills in the corresponding field.
     * @param e - the election to show
     */
    async showElection(e: Election) {
        this.election = e;
        this.ballots = [];
        this.partials = [];
        this.mixes = [];
        let shares: Point[][] = [];
        const blocks = await this.sc.getUpdateChain(e.id, false, false, 1);
        blocks.reverse();
        for (const block of blocks) {
            if (block.data.length > 0) {
                const tx = Transaction.decode(block.data);
                if (tx.ballot !== null) {
                    console.log("Ballot of block", block.index);
                    console.dir(tx.ballot);
                    this.ballots.push({user: tx.ballot.user, block: block.index});
                } else if (tx.mix !== null) {
                    console.log("Mix in block", block.index);
                    console.dir(tx.mix);
                    this.mixes.push(this.createFinalizedBlock(block, tx.mix.nodeid, tx.mix.ballots.length));
                } else if (tx.partial !== null) {
                    console.log("Partial decryption in block", block.index);
                    console.dir(tx.partial);
                    this.partials.push(this.createFinalizedBlock(block, tx.partial.nodeid, tx.partial.points.length));
                    // Prepare the shares in the correct order for the decryption
                    const nodeID = tx.partial.nodeid;
                    const nodeIndex = block.roster.list.findIndex((si) => si.id.equals(nodeID));
                    shares[nodeIndex] = tx.partial.points_curve();
                }
            }
        }
    }

    /**
     * Helper method to nicely display the mix and partial decryption blocks.
     *
     * @param block to be displayed
     * @param nodeID initiator of this block
     * @param votes number of votes in this block
     */
    createFinalizedBlock(block: SkipBlock, nodeID: Buffer, votes: number): FinalizeBlock {
        const nodeSI = block.roster.list.find((si) => si.id.equals(nodeID));
        let node = "Not found";
        if (nodeSI !== undefined) {
            node = nodeSI.description;
        }
        return {
            block: block.index,
            node,
            votes,
        }
    }

    /**
     * Clear the election field, which will display the overview of all elections.
     */
    async showOverview() {
        this.election = undefined;
    }
}


/**
 * Returns the scalar set to the parameter.
 *
 * @param i the value of the scalar, only 56 bits.
 * @return the scalar
 */
function setInt64(i: number): Scalar {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(BigInt(i));
    return curve25519.scalar().setBytes(buf)
}
