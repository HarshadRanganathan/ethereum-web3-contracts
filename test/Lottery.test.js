const path = require('path');
const fs = require('fs');
const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const contractName = 'Lottery';
const binPath = path.resolve(__dirname, '..', 'bin', 'contracts');

let accounts;
let lottery;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    // Create the contract instance
    const { interface, bytecode } = JSON.parse(fs.readFileSync(path.resolve(binPath, `${contractName}.json`), 'utf-8'));
    
    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({ data: bytecode })
        .send({ from: accounts[0], gas: 1000000 });
});

describe('Lottery Contract', () => {
    it('deploys a contract', () => {
        assert.ok(lottery.options.address);
    });

    it('allows one account to enter the lottery', async () => {
        await lottery.methods.enter().send({ from: accounts[0], value: web3.utils.toWei('0.011', 'ether') });
        const players = await lottery.methods.getPlayers().call({ from: accounts[0] });
        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('allows multiple accounts to enter the lottery', async () => {
        await lottery.methods.enter().send({ from: accounts[0], value: web3.utils.toWei('0.011', 'ether') });
        await lottery.methods.enter().send({ from: accounts[1], value: web3.utils.toWei('0.011', 'ether') });
        await lottery.methods.enter().send({ from: accounts[2], value: web3.utils.toWei('0.011', 'ether') });

        const players = await lottery.methods.getPlayers().call({ from: accounts[0] });
        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('requires minimum amount of ether to enter', async () => {
        try {
            await lottery.methods.enter().send({ from: accounts[0], value: web3.utils.toWei('0.001', 'ether') });
            assert(false);
        } catch(err) {
            assert(err);
        }
    });

    it('only manager can call pickWinner method', async () => {
        try {
            await lottery.methods.pickWinner().send({ from: accounts[1] });
            assert(false);
        } catch(err) {
            assert(err);
        }
    });

    it('sends money to the winner and resets the players array', async () => {
        await lottery.methods.enter().send({ from: accounts[0], value: web3.utils.toWei('0.011', 'ether') });
        const initialBalance = await web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({ from: accounts[0] });
        const finalBalance = await web3.eth.getBalance(accounts[0]);
        assert(finalBalance - initialBalance > web3.utils.toWei('0.01', 'ether'));
        const players = await lottery.methods.getPlayers().call({ from: accounts[0] });
        assert.equal(0, players.length);
    });
});