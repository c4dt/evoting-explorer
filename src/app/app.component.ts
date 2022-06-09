import {Component, OnInit} from '@angular/core';
import {SkipBlock, SkipchainRPC} from '@dedis/cothority/skipchain';
import {Roster} from "@dedis/cothority/network";
import {Election, Transaction} from "@dedis/cothority/evoting/proto";

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

    public election: Election | undefined;
    public elections: Election[] = [];
    public ballots: BallotBlock[] = [];
    public partials: FinalizeBlock[] = [];
    public mixes: FinalizeBlock[] = [];

    constructor() {
    }

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

    async showElection(e: Election) {
        this.election = e;
        this.ballots = [];
        this.partials = [];
        this.mixes = [];
        const blocks = await this.sc.getUpdateChain(e.id, false, false, 1);
        for (const block of blocks.reverse()) {
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
                }
            }
        }
    }

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

    async showOverview() {
        this.election = undefined;
    }
}
